import { DMMF, GeneratorError, type GeneratorOptions } from '@prisma/generator-helper';
import { s } from '../escape';
import { extractManyToManyModels } from '../extract-many-to-many-models';
import { UnReadonlyDeep } from '../un-readonly-deep';

const mssqlImports = new Set<string>();
const drizzleImports = new Set<string>([]);

mssqlImports.add('mssqlTable');

const prismaToDrizzleType = (type: string, columnDbName: string) => {
  switch (type.toLowerCase()) {
    case 'bigint':
      mssqlImports.add('bigint');
      return `bigint('${columnDbName}', { mode: 'bigint' })`;
    case 'boolean':
      mssqlImports.add('bit');
      return `bit('${columnDbName}')`;
    case 'bytes':
      mssqlImports.add('varbinary');
      return `varbinary('${columnDbName}')`;
    case 'datetime':
      mssqlImports.add('datetime');
      return `datetime('${columnDbName}', { mode: 'date' })`;
    case 'decimal':
      mssqlImports.add('decimal');
      return `decimal('${columnDbName}', { precision: 65, scale: 30 })`;
    case 'float':
      mssqlImports.add('float');
      return `float('${columnDbName}')`;
    case 'json':
      throw new GeneratorError("Drizzle ORM doesn't support JSON data type for MSSQL");
    case 'string':
      mssqlImports.add('varchar');
      return `varchar('${columnDbName}')`;
    case 'int':
      mssqlImports.add('int');
      return `int('${columnDbName}')`;
    default:
      return undefined;
  }
};

const addColumnModifiers = (field: DMMF.Field, column: string) => {
  if (field.isRequired) column = column + `.notNull()`;
  if (field.isId) column = column + `.primaryKey()`;
  if (field.isUnique) column = column + `.unique()`;

  if (field.hasDefaultValue && field.default !== undefined) {
    const defVal = field.default;

    switch (typeof defVal) {
      case 'number':
      case 'string':
      case 'symbol':
      case 'boolean':
        column = column + `.default(${JSON.stringify(defVal)})`;
        break;
      case 'object':
        if (Array.isArray(defVal)) {
          throw new GeneratorError("MSSQL doesn't support array defaults");
        }

        const value = defVal as {
          name: string;
          args: unknown[];
        };

        if (value.name === 'now') {
          column = column + `.defaultGetDate()`;
          break;
        }

        if (value.name === 'autoincrement') {
          column = column + `.identity({ seed: 1, increment: 1 })`;
          break;
        }

        if (value.name === 'dbgenerated') {
          const dbGeneratedValue = value.args[0];

          if (dbGeneratedValue) {
            column = column + `.default(sql\`${s(dbGeneratedValue as unknown as string, '`')}\`)`;
          } else {
            column = column + `.default(sql\`NEWID()\`)`;
          }

          drizzleImports.add('sql');
          break;
        }

        if (/^uuid\([0-9]*\)$/.test(value.name)) {
          column = column + `.default(sql\`NEWSEQUENTIALID()\`)`;

          drizzleImports.add('sql');
          break;
        }

        const stringified = `${value.name}${
          value.args.length
            ? '(' + value.args.map((e) => String(e)).join(', ') + ')'
            : value.name.endsWith(')')
            ? ''
            : '()'
        }`;
        const sequel = `sql\`${s(stringified, '`')}\``;

        drizzleImports.add('sql');
        column = column + `.default(${sequel})`;
        break;
    }
  }

  return column;
};

const prismaToDrizzleColumn = (field: DMMF.Field): string | undefined => {
  const colDbName = s(field.dbName ?? field.name);
  let column = `\t${field.name}: `;

  const drizzleType = prismaToDrizzleType(field.type, colDbName);
  if (!drizzleType) return undefined;

  column = column + drizzleType;

  column = addColumnModifiers(field, column);

  return column;
};

export const generateMsSqlSchema = (options: GeneratorOptions): string => {
  const { models, indexes: allIndexes } = options.dmmf.datamodel;

  const clonedModels = JSON.parse(JSON.stringify(models)) as UnReadonlyDeep<DMMF.Model[]>;

  const manyToManyModels = extractManyToManyModels(clonedModels);

  const modelsWithImplicit = [...clonedModels, manyToManyModels] as DMMF.Model[];

  const tables: string[] = [];
  const rqb: Record<string, string[]> = {};
  const tablesWithRelations = new Set<string>();

  for (const schemaTable of modelsWithImplicit) {
    if (!schemaTable.name || !schemaTable.fields?.length) continue;

    const tableDbName = s(schemaTable.dbName ?? schemaTable.name);

    const columnFields = Object.fromEntries(
      schemaTable.fields
        .map((e) => [e.name, prismaToDrizzleColumn(e)])
        .filter((e) => e[1] !== undefined)
    );

    const indexesArr: string[] = [];

    const relFields = schemaTable.fields.filter(
      (field) => field.relationToFields && field.relationFromFields
    );

    // Foreign Key Indexes
    const relations = relFields
      .map<string | undefined>((field) => {
        if (!field?.relationFromFields?.length) return undefined;

        const fkeyName = s(
          `${schemaTable.dbName ?? schemaTable.name}_${field.dbName ?? field.name}_fkey`
        );

        let deleteAction: string;

        switch (field.relationOnDelete) {
          case undefined:
          case 'Cascade':
            deleteAction = 'cascade';
            break;
          case 'SetNull':
            deleteAction = 'set null';
            break;
          case 'SetDefault':
            deleteAction = 'set default';
            break;
          case 'Restrict':
            deleteAction = 'restrict';
            break;
          case 'NoAction':
            deleteAction = 'no action';
            break;
          default:
            throw new GeneratorError(
              `Unknown delete action on relation ${fkeyName}: ${field.relationOnDelete}`
            );
        }

        mssqlImports.add('foreignKey');

        return `foreignKey({\n\t\tname: '${fkeyName}',\n\t\tcolumns: [${(
          field.relationFromFields ?? []
        )
          .map((rel) => `${schemaTable.name}.${rel}`)
          .join(', ')}],\n\t\tforeignColumns: [${(field.relationToFields ?? [])
          .map((rel) => `${field.type}.${rel}`)
          .join(', ')}]\n\t})${
          deleteAction && deleteAction !== 'no action' ? `.onDelete('${deleteAction}')` : ''
        }.onUpdate('cascade')`;
      })
      .filter((e) => e !== undefined) as string[];

    indexesArr.push(...relations);

    // Regular Indexes
    const modelIndexes = allIndexes.filter((idx) => idx.model === schemaTable.name);
    if (modelIndexes.length) {
      console.log('Index Structure: ', JSON.stringify(modelIndexes, null, 2));
      mssqlImports.add('index');

      const regularIndexes = modelIndexes.map((idx) => {
        // idx.fields is likely an array of objects with a 'name' property
        const fieldNames = idx.fields.map((f) => (typeof f === 'string' ? f : f.name));
        const idxName = s(idx.name ?? `${schemaTable.name}_${fieldNames.join('_')}_idx`);

        return `index('${idxName}')\n\t\t.on(${fieldNames
          .map((f) => `${schemaTable.name}.${f}`)
          .join(', ')})`;
      });
      indexesArr.push(...regularIndexes);
    }

    // Unique Indexes
    if (schemaTable.uniqueIndexes.length) {
      mssqlImports.add('uniqueIndex');

      const uniques = schemaTable.uniqueIndexes.map((idx) => {
        const idxName = s(idx.name ?? `${schemaTable.name}_${idx.fields.join('_')}_key`);
        // _key comes from Prisma, if their AI is to be trusted

        return `uniqueIndex('${idxName}')\n\t\t.on(${idx.fields
          .map((f) => `${schemaTable.name}.${f}`)
          .join(', ')})`;
      });

      indexesArr.push(...uniques);
    }

    // Primary Key Index
    if (schemaTable.primaryKey) {
      mssqlImports.add('primaryKey');

      const pk = schemaTable.primaryKey!;
      const pkName = s(pk.name ?? `${schemaTable.name}_cpk`);

      const pkField = `primaryKey({\n\t\tname: '${pkName}',\n\t\tcolumns: [${pk.fields
        .map((f) => `${schemaTable.name}.${f}`)
        .join(', ')}]\n\t})`;

      indexesArr.push(pkField);
    }

    const table = `export const ${
      schemaTable.name
    } = mssqlTable('${tableDbName}', {\n${Object.values(columnFields).join(',\n')}\n}${
      indexesArr.length ? `, (${schemaTable.name}) => [\n\t${indexesArr.join(',\n\t')}\n]` : ''
    });`;
    tables.push(table);

    if (!relFields?.length) continue;

    drizzleImports.add('defineRelations');

    tablesWithRelations.add(schemaTable.name);

    const rqbRelation = relFields.map((field) => {
      if (field.relationFromFields?.length) {
        return `\t\t${field.name}: r.one.${field.type}({\n\t\t\tfrom: r.${schemaTable.name}.${
          field.relationFromFields[0]
        },\n\t\t\tto: r.${field.type}.${field.relationToFields![0]}\n\t\t})`;
      } else {
        const relatedModel = modelsWithImplicit.find((m) => m.name === field.type);
        if (!relatedModel) {
          return `\t\t${field.name}: r.many.${field.type}()`;
        }

        const reverseField = relatedModel.fields.find(
          (f) =>
            f.type === schemaTable.name &&
            f.relationFromFields?.length &&
            f.relationName === field.relationName
        );

        if (
          !reverseField ||
          !reverseField.relationFromFields?.length ||
          !reverseField.relationToFields?.length
        ) {
          return `\t\t${field.name}: r.many.${field.type}()`;
        }

        return `\t\t${field.name}: r.many.${field.type}({\n\t\t\tfrom: r.${field.type}.${reverseField.relationFromFields[0]},\n\t\t\tto: r.${schemaTable.name}.${reverseField.relationToFields[0]}\n\t\t})`;
      }
    });

    rqb[schemaTable.name] = rqbRelation;
  }

  // Generate the defineRelations call
  let relationsOutput = '';
  if (Object.keys(rqb).length > 0) {
    const schemaObjectEntries = Array.from(tablesWithRelations).join(', ');
    const relationsBody = Object.entries(rqb)
      .map(([tableName, relations]) => {
        return `\t${tableName}: {\n${relations.join(',\n')}\n\t}`;
      })
      .join(',\n');

    relationsOutput = `export const relations = defineRelations({ ${schemaObjectEntries} }, (r) => ({\n${relationsBody}\n}));`;
  }
  const drizzleImportsArr = Array.from(drizzleImports.values()).sort((a, b) => a.localeCompare(b));
  const drizzleImportStr = drizzleImportsArr.length
    ? `import { ${drizzleImportsArr.join(', ')} } from 'drizzle-orm'`
    : undefined;

  const mssqlImportsArr = Array.from(mssqlImports.values()).sort((a, b) => a.localeCompare(b));
  const mssqlImportStr = mssqlImportsArr.length
    ? `import { ${mssqlImportsArr.join(', ')} } from 'drizzle-orm/mssql-core'`
    : undefined;

  let importsStr: string | undefined = [drizzleImportStr, mssqlImportStr]
    .filter((e) => e !== undefined)
    .join('\n');
  if (!importsStr?.length) importsStr = undefined;

  const output = [importsStr, ...tables, relationsOutput]
    .filter((e) => e !== undefined && e.length > 0)
    .join('\n\n');

  return output;
};

import { s } from '@/util/escape';
import { extractManyToManyModels } from '@/util/extract-many-to-many-models';
import { UnReadonlyDeep } from '@/util/un-readonly-deep';
import { type DMMF, GeneratorError, type GeneratorOptions } from '@prisma/generator-helper';

const pgImports = new Set<string>();
const drizzleImports = new Set<string>();
pgImports.add('pgTable');

const prismaToDrizzleType = (type: string, colDbName: string, defVal?: string) => {
  switch (type.toLowerCase()) {
    case 'bigint':
      pgImports.add('bigint');
      return `bigint('${colDbName}', { mode: 'bigint' })`;
    case 'boolean':
      pgImports.add('boolean');
      return `boolean('${colDbName}')`;
    case 'bytes':
      // Drizzle doesn't support it yet...
      throw new GeneratorError("Drizzle ORM doesn't support binary data type for PostgreSQL");
    case 'datetime':
      pgImports.add('timestamp');
      return `timestamp('${colDbName}', { precision: 3 })`;
    case 'decimal':
      pgImports.add('decimal');
      return `decimal('${colDbName}', { precision: 65, scale: 30 })`;
    case 'float':
      pgImports.add('doublePrecision');
      return `doublePrecision('${colDbName}')`;
    case 'json':
      pgImports.add('jsonb');
      return `jsonb('${colDbName}')`;
    case 'int':
      if (defVal === 'autoincrement') {
        pgImports.add('serial');
        return `serial('${colDbName}')`;
      }

      pgImports.add('integer');
      return `integer('${colDbName}')`;
    case 'string':
      pgImports.add('text');
      return `text('${colDbName}')`;
    default:
      return undefined;
  }
};

const addColumnModifiers = (field: DMMF.Field, column: string) => {
  if (field.isList) column = column + `.array()`;
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
          column = column + `.default([${defVal.map((e) => JSON.stringify(e)).join(', ')}])`;
          break;
        }

        const value = defVal as {
          name: string;
          args: any[];
        };

        if (value.name === 'now') {
          column = column + `.defaultNow()`;
          break;
        }

        if (value.name === 'autoincrement') {
          break;
        }

        if (value.name === 'dbgenerated') {
          column = column + `.default(sql\`${s(value.args[0], '`')}\`)`;

          drizzleImports.add('sql');
          break;
        }

        if (/^uuid\([0-9]*\)$/.test(value.name)) {
          column = column + `.default(sql\`uuid()\`)`;

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

  if (field.kind === 'enum') {
    column = column + `${field.type}('${colDbName}')`;
  } else {
    const defVal =
      typeof field.default === 'object' && !Array.isArray(field.default)
        ? (field.default as { name: string }).name
        : undefined;

    const drizzleType = prismaToDrizzleType(field.type, colDbName, defVal);
    if (!drizzleType) return undefined;

    column = column + drizzleType;
  }

  column = addColumnModifiers(field, column);

  return column;
};

export const generatePgSchema = (options: GeneratorOptions) => {
  const { models, enums } = options.dmmf.datamodel;
  const clonedModels = JSON.parse(JSON.stringify(models)) as UnReadonlyDeep<DMMF.Model[]>;

  const manyToManyModels = extractManyToManyModels(clonedModels);

  const modelsWithImplicit = [...clonedModels, ...manyToManyModels] as DMMF.Model[];

  const pgEnums: string[] = [];

  for (const schemaEnum of enums) {
    if (!schemaEnum.values.length) continue;
    const enumDbName = s(schemaEnum.dbName ?? schemaEnum.name);

    pgImports.add('pgEnum');

    pgEnums.push(
      `export const ${schemaEnum.name} = pgEnum('${enumDbName}', [${schemaEnum.values
        .map((e) => `'${e.dbName ?? e.name}'`)
        .join(', ')}])`
    );
  }

  const tables: string[] = [];
  const rqb: Record<string, string[]> = {};
  const tablesWithRelations = new Set<string>();

  for (const schemaTable of modelsWithImplicit) {
    const tableDbName = s(schemaTable.dbName ?? schemaTable.name);

    const columnFields = Object.fromEntries(
      schemaTable.fields
        .map((e) => [e.name, prismaToDrizzleColumn(e)])
        .filter((e) => e[1] !== undefined)
    );

    const indexes: string[] = [];

    const relFields = schemaTable.fields.filter(
      (field) => field.relationToFields && field.relationFromFields
    );
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

        pgImports.add('foreignKey');

        return `\t'${fkeyName}': foreignKey({\n\t\tname: '${fkeyName}',\n\t\tcolumns: [${field.relationFromFields
          .map((rel) => `${schemaTable.name}.${rel}`)
          .join(', ')}],\n\t\tforeignColumns: [${field
          .relationToFields!.map((rel) => `${field.type}.${rel}`)
          .join(', ')}]\n\t})${
          deleteAction && deleteAction !== 'no action' ? `\n\t\t.onDelete('${deleteAction}')` : ''
        }\n\t\t.onUpdate('cascade')`;
      })
      .filter((e) => e !== undefined) as string[];

    indexes.push(...relations);

    if (schemaTable.uniqueIndexes.length) {
      pgImports.add('uniqueIndex');

      const uniques = schemaTable.uniqueIndexes.map((idx) => {
        const idxName = s(idx.name ?? `${schemaTable.name}_${idx.fields.join('_')}_key`);
        // _key comes from Prisma, if their AI is to be trusted

        return `\t'${
          idx.name ? idxName : `${idxName.slice(0, idxName.length - 4)}_unique_idx`
        }': uniqueIndex('${idxName}')\n\t\t.on(${idx.fields
          .map((f) => `${schemaTable.name}.${f}`)
          .join(', ')})`;
      });

      indexes.push(...uniques);
    }

    if (schemaTable.primaryKey) {
      pgImports.add('primaryKey');

      const pk = schemaTable.primaryKey!;
      const pkName = s(pk.name ?? `${schemaTable.name}_cpk`);

      const pkField = `\t'${pkName}': primaryKey({\n\t\tname: '${pkName}',\n\t\tcolumns: [${pk.fields
        .map((f) => `${schemaTable.name}.${f}`)
        .join(', ')}]\n\t})`;

      indexes.push(pkField);
    }

    const table = `export const ${schemaTable.name} = pgTable('${tableDbName}', {\n${Object.values(
      columnFields
    ).join(',\n')}\n}${
      indexes.length ? `, (${schemaTable.name}) => ({\n${indexes.join(',\n')}\n})` : ''
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

  const pgImportsArr = Array.from(pgImports.values()).sort((a, b) => a.localeCompare(b));
  const pgImportStr = pgImportsArr.length
    ? `import { ${pgImportsArr.join(', ')} } from 'drizzle-orm/pg-core'`
    : undefined;

  let importsStr: string | undefined = [drizzleImportStr, pgImportStr]
    .filter((e) => e !== undefined)
    .join('\n');
  if (!importsStr?.length) importsStr = undefined;

  const output = [importsStr, ...pgEnums, ...tables, relationsOutput]
    .filter((e) => e !== undefined && e.length > 0)
    .join('\n\n');

  return output;
};

import { s } from '@/util/escape';
import { extractManyToManyModels } from '@/util/extract-many-to-many-models';
import { UnReadonlyDeep } from '@/util/un-readonly-deep';
import { type DMMF, GeneratorError, type GeneratorOptions } from '@prisma/generator-helper';

const mySqlImports = new Set<string>(['mysqlTable']);
const drizzleImports = new Set<string>([]);

const prismaToDrizzleType = (
	type: string,
	colDbName: string,
	prismaEnum?: UnReadonlyDeep<DMMF.DatamodelEnum>,
	nativeType?: MySQLNativeTypeMappings,
	nativeTypeAttributes?: readonly string[],
) => {
	if (prismaEnum) {
		mySqlImports.add('mysqlEnum');
		return `mysqlEnum('${colDbName}', [${prismaEnum.values.map((val) => `'${val.dbName ?? val.name}'`).join(', ')}])`;
	}

	switch (type.toLowerCase()) {
		case 'bigint':
			mySqlImports.add('bigint');
			return `bigint('${colDbName}', { mode: 'bigint' })`;
		case 'boolean':
			mySqlImports.add('boolean');
			return `boolean('${colDbName}')`;
		case 'bytes':
			// Drizzle doesn't support it yet...
			throw new GeneratorError("Drizzle ORM doesn't support binary data type for MySQL");
		case 'datetime':
			if (nativeType === 'Time') {
				mySqlImports.add('time');
				const precision = nativeTypeAttributes?.at(0) ?? '3';

				return `time('${colDbName}', { precision: ${precision} })`;
			}

			mySqlImports.add('datetime');
			return `datetime('${colDbName}', { fsp: 3 })`;
		case 'decimal':
			mySqlImports.add('decimal');
			return `decimal('${colDbName}', { precision: 65, scale: 30 })`;
		case 'float':
			mySqlImports.add('double');
			return `double('${colDbName}')`;
		case 'json':
			mySqlImports.add('json');
			return `json('${colDbName}')`;
		case 'int':
			mySqlImports.add('int');
			return `int('${colDbName}')`;
		case 'string':
			mySqlImports.add('varchar');
			return `varchar('${colDbName}', { length: 191 })`;
		default:
			return undefined;
	}
};

const addColumnModifiers = (field: DMMF.Field, column: string) => {
	if (field.isRequired) column = column + `.notNull()`;
	if (field.isId) column = column + `.primaryKey()`;
	if (field.isUnique) column = column + `.unique()`;

	if (field.default) {
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
					column = column + `.default(sql\`CURRENT_TIMESTAMP\`)`;
					break;
				}

				if (value.name === 'autoincrement') {
					column = column + `.autoincrement()`;
					break;
				}

				if (value.name === 'dbgenerated') {
					column = column + `.default(sql\`${s(value.args[0], '`')}\`)`;

					drizzleImports.add('sql');
					break;
				}

				if (/^uuid\([0-9]*\)$/.test(value.name) || value.name === "uuid") {
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

const prismaToDrizzleColumn = (
	field: DMMF.Field,
	enums: UnReadonlyDeep<DMMF.DatamodelEnum[]>,
	nativeType?: MySQLNativeTypeMappings,
	nativeTypeAttributes?: readonly string[],
): string | undefined => {
	const colDbName = s(field.dbName ?? field.name);
	let column = `\t${field.name}: `;

	const drizzleType = prismaToDrizzleType(
		field.type,
		colDbName,
		field.kind === 'enum' ? enums.find((e) => e.name === field.type)! : undefined,
		nativeType,
		nativeTypeAttributes,
	);
	if (!drizzleType) return undefined;

	column = column + drizzleType;

	column = addColumnModifiers(field, column);

	return column;
};

export const generateMySqlSchema = (options: GeneratorOptions) => {
	const { models, enums } = options.dmmf.datamodel;
	const clonedModels = JSON.parse(JSON.stringify(models)) as UnReadonlyDeep<DMMF.Model[]>;

	const manyToManyModels = extractManyToManyModels(clonedModels);

	const modelsWithImplicit = [...clonedModels, ...manyToManyModels] as DMMF.Model[];

	const tables: string[] = [];
	const rqb: string[] = [];

	for (const schemaTable of modelsWithImplicit) {
		const tableDbName = s(schemaTable.dbName ?? schemaTable.name);

		const columnFields = Object.fromEntries(
			schemaTable.fields
				.map((field) => {
					const [nativeType, nativeTypeAttributes = []] = field.nativeType ?? [];

					return [
						field.name,
						prismaToDrizzleColumn(
							field,
							enums as UnReadonlyDeep<typeof enums>,
							nativeType as MySQLNativeTypeMappings | undefined,
							nativeTypeAttributes,
						),
					];
				})
				.filter((field) => field.at(1) !== undefined),
		);

		const indexes: string[] = [];

		const relFields = schemaTable.fields.filter((field) => field.relationToFields && field.relationFromFields);
		const relations = relFields.map<string | undefined>((field) => {
			if (!field?.relationFromFields?.length) return undefined;

			const fkeyName = s(`${schemaTable.dbName ?? schemaTable.name}_${field.dbName ?? field.name}_fkey`);
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
					throw new GeneratorError(`Unknown delete action on relation ${fkeyName}: ${field.relationOnDelete}`);
			}

			mySqlImports.add('foreignKey');

			return `\t'${fkeyName}': foreignKey({\n\t\tname: '${fkeyName}',\n\t\tcolumns: [${
				field.relationFromFields.map((rel) => `${schemaTable.name}.${rel}`).join(', ')
			}],\n\t\tforeignColumns: [${field.relationToFields!.map((rel) => `${field.type}.${rel}`).join(', ')}]\n\t})${
				deleteAction && deleteAction !== 'no action' ? `\n\t\t.onDelete('${deleteAction}')` : ''
			}\n\t\t.onUpdate('cascade')`;
		}).filter((e) => e !== undefined) as string[];

		indexes.push(...relations);

		if (schemaTable.uniqueIndexes.length) {
			mySqlImports.add('uniqueIndex');

			const uniques = schemaTable.uniqueIndexes.map((idx) => {
				const idxName = s(idx.name ?? `${schemaTable.name}_${idx.fields.join('_')}_key`);
				// _key comes from Prisma, if their AI is to be trusted

				return `\t'${
					idx.name ? idxName : `${idxName.slice(0, idxName.length - 4)}_unique_idx`
				}': uniqueIndex('${idxName}')\n\t\t.on(${idx.fields.map((f) => `${schemaTable.name}.${f}`).join(', ')})`;
			});

			indexes.push(...uniques);
		}

		if (schemaTable.primaryKey) {
			mySqlImports.add('primaryKey');

			const pk = schemaTable.primaryKey!;
			const pkName = s(pk.name ?? `${schemaTable.name}_cpk`);

			const pkField = `\t'${pkName}': primaryKey({\n\t\tname: '${pkName}',\n\t\tcolumns: [${
				pk.fields.map((f) => `${schemaTable.name}.${f}`).join(', ')
			}]\n\t})`;

			indexes.push(pkField);
		}
		const table = `export const ${schemaTable.name} = mysqlTable('${tableDbName}', {\n${
			Object.values(columnFields).join(',\n')
		}\n}${indexes.length ? `, (${schemaTable.name}) => ({\n${indexes.join(',\n')}\n})` : ''});`;

		tables.push(table);

		if (!relFields.length) continue;
		drizzleImports.add('relations');

		const relationArgs = new Set<string>();
		const rqbFields = relFields.map((field) => {
			relationArgs.add(field.relationFromFields?.length ? 'one' : 'many');
			const relName = s(field.relationName ?? '');

			return `\t${field.name}: ${
				field.relationFromFields?.length
					? `one(${field.type}, {\n\t\trelationName: '${relName}',\n\t\tfields: [${
						field.relationFromFields.map((e) => `${schemaTable.name}.${e}`).join(', ')
					}],\n\t\treferences: [${field.relationToFields!.map((e) => `${field.type}.${e}`).join(', ')}]\n\t})`
					: `many(${field.type}, {\n\t\trelationName: '${relName}'\n\t})`
			}`;
		}).join(',\n');

		const argString = Array.from(relationArgs.values()).join(', ');

		const rqbRelation =
			`export const ${schemaTable.name}Relations = relations(${schemaTable.name}, ({ ${argString} }) => ({\n${rqbFields}\n}));`;

		rqb.push(rqbRelation);
	}

	const drizzleImportsArr = Array.from(drizzleImports.values()).sort((a, b) => a.localeCompare(b));
	const drizzleImportsStr = drizzleImportsArr.length
		? `import { ${drizzleImportsArr.join(', ')} } from 'drizzle-orm'`
		: undefined;

	const mySqlImportsArr = Array.from(mySqlImports.values()).sort((a, b) => a.localeCompare(b));
	const mySqlImportsStr = mySqlImportsArr.length
		? `import { ${mySqlImportsArr.join(', ')} } from 'drizzle-orm/mysql-core'`
		: undefined;

	let importsStr: string | undefined = [drizzleImportsStr, mySqlImportsStr].filter((e) => e !== undefined).join('\n');
	if (!importsStr.length) importsStr = undefined;

	return [importsStr, ...tables, ...rqb].filter((e) => e !== undefined).join('\n\n');
};

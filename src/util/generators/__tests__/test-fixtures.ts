import { DMMF, GeneratorOptions } from '@prisma/generator-helper';

/**
 * Creates a mock GeneratorOptions object for testing
 */
export function createMockOptions(
	models: any[],
	enums: any[] = [],
	indexes: any[] = []
): GeneratorOptions {
	return {
		generator: {
			name: 'drizzle',
			provider: {
				fromEnvVar: null,
				value: 'drizzle-prisma-generator',
			},
			output: {
				value: './src/db',
				fromEnvVar: null,
			},
			config: {},
			binaryTargets: [],
			previewFeatures: [],
		},
		dmmf: {
			datamodel: {
				models,
				enums,
				types: [],
				indexes,
			},
			schema: {
				inputObjectTypes: {
					prisma: [],
					model: [],
				},
				outputObjectTypes: {
					prisma: [],
					model: [],
				},
				enumTypes: {
					prisma: [],
					model: [],
				},
				fieldRefTypes: {
					prisma: [],
				},
			},
			mappings: {
				modelOperations: [],
				otherOperations: {
					read: [],
					write: [],
				},
			},
		},
		datasources: [
			{
				name: 'db',
				provider: 'postgresql',
				activeProvider: 'postgresql',
				url: {
					fromEnvVar: 'DATABASE_URL',
					value: null,
				},
				schemas: [],
			},
		],
		datamodel: '',
		schemaPath: '/path/to/schema.prisma',
		otherGenerators: [],
		version: '5.14.0',
	} as unknown as GeneratorOptions;
}

/**
 * Simple model with basic fields
 */
export const simpleUserModel: DMMF.Model = {
	name: 'User',
	dbName: null,
	fields: [
		{
			name: 'id',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: true,
			isReadOnly: false,
			hasDefaultValue: true,
			type: 'Int',
			default: {
				name: 'autoincrement',
				args: [],
			},
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'email',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: true,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'String',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'name',
			kind: 'scalar',
			isList: false,
			isRequired: false,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'String',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'createdAt',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: true,
			type: 'DateTime',
			default: {
				name: 'now',
				args: [],
			},
			isGenerated: false,
			isUpdatedAt: false,
		},
	],
	primaryKey: null,
	uniqueFields: [],
	uniqueIndexes: [],
	isGenerated: false,
};

/**
 * Model with relations (one-to-many)
 */
export const postModel: DMMF.Model = {
	name: 'Post',
	dbName: null,
	fields: [
		{
			name: 'id',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: true,
			isReadOnly: false,
			hasDefaultValue: true,
			type: 'Int',
			default: {
				name: 'autoincrement',
				args: [],
			},
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'title',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'String',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'userId',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: true,
			hasDefaultValue: false,
			type: 'Int',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'user',
			kind: 'object',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'User',
			relationName: 'PostToUser',
			relationFromFields: ['userId'],
			relationToFields: ['id'],
			isGenerated: false,
			isUpdatedAt: false,
		},
	],
	primaryKey: null,
	uniqueFields: [],
	uniqueIndexes: [],
	isGenerated: false,
};

export const userModelWithPosts: DMMF.Model = {
	...simpleUserModel,
	fields: [
		...simpleUserModel.fields,
		{
			name: 'posts',
			kind: 'object',
			isList: true,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'Post',
			relationName: 'PostToUser',
			relationFromFields: [],
			relationToFields: [],
			isGenerated: false,
			isUpdatedAt: false,
		},
	],
};

/**
 * Model with composite primary key
 */
export const userRoleModel: DMMF.Model = {
	name: 'UserRole',
	dbName: null,
	fields: [
		{
			name: 'userId',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'Int',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'roleId',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'Int',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'assignedAt',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: true,
			type: 'DateTime',
			default: {
				name: 'now',
				args: [],
			},
			isGenerated: false,
			isUpdatedAt: false,
		},
	],
	primaryKey: {
		name: null,
		fields: ['userId', 'roleId'],
	},
	uniqueFields: [],
	uniqueIndexes: [],
	isGenerated: false,
};

/**
 * Model with unique index
 */
export const productModel: DMMF.Model = {
	name: 'Product',
	dbName: null,
	fields: [
		{
			name: 'id',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: true,
			isReadOnly: false,
			hasDefaultValue: true,
			type: 'Int',
			default: {
				name: 'autoincrement',
				args: [],
			},
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'sku',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'String',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'name',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'String',
			isGenerated: false,
			isUpdatedAt: false,
		},
	],
	primaryKey: null,
	uniqueFields: [],
	uniqueIndexes: [
		{
			name: 'Product_sku_key',
			fields: ['sku'],
		},
	],
	isGenerated: false,
};

/**
 * Enum for testing
 */
export const roleEnum: DMMF.DatamodelEnum = {
	name: 'Role',
	values: [
		{ name: 'USER', dbName: null },
		{ name: 'ADMIN', dbName: null },
		{ name: 'MODERATOR', dbName: null },
	],
	dbName: null,
};

/**
 * Model with enum field
 */
export const userWithRoleModel: DMMF.Model = {
	name: 'User',
	dbName: null,
	fields: [
		{
			name: 'id',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: true,
			isReadOnly: false,
			hasDefaultValue: true,
			type: 'Int',
			default: {
				name: 'autoincrement',
				args: [],
			},
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'email',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: true,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'String',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'role',
			kind: 'enum',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: true,
			type: 'Role',
			default: 'USER',
			isGenerated: false,
			isUpdatedAt: false,
		},
	],
	primaryKey: null,
	uniqueFields: [],
	uniqueIndexes: [],
	isGenerated: false,
};

/**
 * Model with various data types
 */
export const allTypesModel: DMMF.Model = {
	name: 'AllTypes',
	dbName: null,
	fields: [
		{
			name: 'id',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: true,
			isReadOnly: false,
			hasDefaultValue: true,
			type: 'Int',
			default: { name: 'autoincrement', args: [] },
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'bigIntField',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'BigInt',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'boolField',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'Boolean',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'dateField',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'DateTime',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'decimalField',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'Decimal',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'floatField',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'Float',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'jsonField',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'Json',
			isGenerated: false,
			isUpdatedAt: false,
		},
		{
			name: 'stringField',
			kind: 'scalar',
			isList: false,
			isRequired: true,
			isUnique: false,
			isId: false,
			isReadOnly: false,
			hasDefaultValue: false,
			type: 'String',
			isGenerated: false,
			isUpdatedAt: false,
		},
	],
	primaryKey: null,
	uniqueFields: [],
	uniqueIndexes: [],
	isGenerated: false,
};

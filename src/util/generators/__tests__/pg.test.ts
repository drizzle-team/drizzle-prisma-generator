import { describe, expect, it } from 'vitest';
import { generatePgSchema } from '../pg';
import {
  allTypesModel,
  createMockOptions,
  postModel,
  productModel,
  roleEnum,
  simpleUserModel,
  userModelWithPosts,
  userRoleModel,
  userWithRoleModel,
} from './test-fixtures';

describe('generatePgSchema', () => {
  describe('basic table generation', () => {
    it('should generate a simple table with basic fields', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generatePgSchema(options);

      expect(result).toContain('pgTable');
      expect(result).toContain("export const User = pgTable('User'");
      expect(result).toContain("id: serial('id').notNull().primaryKey()");
      expect(result).toContain("email: text('email').notNull().unique()");
      expect(result).toContain("name: text('name')");
      expect(result).toContain(
        "createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow()"
      );
    });

    it('should handle nullable fields', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generatePgSchema(options);

      // name field should be nullable (no .notNull())
      expect(result).toMatch(/name: text\('name'\)(?!.*\.notNull\(\))/);
    });

    it('should handle unique constraints', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generatePgSchema(options);

      expect(result).toContain("email: text('email').notNull().unique()");
    });

    it('should handle composite primary keys', () => {
      const options = createMockOptions([userRoleModel]);
      const result = generatePgSchema(options);

      expect(result).toContain('primaryKey');
      expect(result).toContain('UserRole.userId');
      expect(result).toContain('UserRole.roleId');
    });

    it('should handle unique indexes', () => {
      const options = createMockOptions([productModel]);
      const result = generatePgSchema(options);

      expect(result).toContain('uniqueIndex');
      expect(result).toContain('Product_sku_key');
      expect(result).toContain('Product.sku');
    });
  });

  describe('data type mappings', () => {
    it('should correctly map all Prisma types to PostgreSQL types', () => {
      const options = createMockOptions([allTypesModel]);
      const result = generatePgSchema(options);

      expect(result).toContain("bigint('bigIntField', { mode: 'bigint' })");
      expect(result).toContain("boolean('boolField')");
      expect(result).toContain("timestamp('dateField', { precision: 3 })");
      expect(result).toContain("decimal('decimalField', { precision: 65, scale: 30 })");
      expect(result).toContain("doublePrecision('floatField')");
      expect(result).toContain("jsonb('jsonField')");
      expect(result).toContain("text('stringField')");
    });

    it('should use serial for int with autoincrement', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generatePgSchema(options);

      expect(result).toContain("serial('id')");
    });

    it('should use integer for int without autoincrement', () => {
      const modelWithoutAutoincrement = {
        ...simpleUserModel,
        fields: [
          {
            name: 'count',
            kind: 'scalar' as const,
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
        ],
      };

      const options = createMockOptions([modelWithoutAutoincrement]);
      const result = generatePgSchema(options);

      expect(result).toContain("integer('count')");
    });

    it('should throw error for Bytes type', () => {
      const modelWithBytes = {
        ...simpleUserModel,
        fields: [
          {
            name: 'data',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: false,
            isReadOnly: false,
            hasDefaultValue: false,
            type: 'Bytes',
            isGenerated: false,
            isUpdatedAt: false,
          },
        ],
      };

      const options = createMockOptions([modelWithBytes]);
      expect(() => generatePgSchema(options)).toThrow("doesn't support binary data type");
    });

    it('should handle enum types', () => {
      const options = createMockOptions([userWithRoleModel], [roleEnum]);
      const result = generatePgSchema(options);

      expect(result).toContain('pgEnum');
      expect(result).toContain(
        "export const Role = pgEnum('Role', ['USER', 'ADMIN', 'MODERATOR'])"
      );
      expect(result).toContain("role: Role('role')");
    });

    it('should handle array types', () => {
      const modelWithArray = {
        ...simpleUserModel,
        fields: [
          {
            name: 'id',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: true,
            isReadOnly: false,
            hasDefaultValue: false,
            type: 'Int',
            isGenerated: false,
            isUpdatedAt: false,
          },
          {
            name: 'tags',
            kind: 'scalar' as const,
            isList: true,
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
      };

      const options = createMockOptions([modelWithArray]);
      const result = generatePgSchema(options);

      expect(result).toContain("text('tags').array().notNull()");
    });
  });

  describe('default values', () => {
    it('should handle now() default', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generatePgSchema(options);

      expect(result).toContain('defaultNow()');
    });

    it('should handle autoincrement default for int', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generatePgSchema(options);

      // autoincrement should use serial type, not a modifier
      expect(result).toContain("serial('id')");
    });

    it('should handle primitive default values', () => {
      const modelWithDefaults = {
        ...simpleUserModel,
        fields: [
          {
            name: 'id',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: true,
            isReadOnly: false,
            hasDefaultValue: false,
            type: 'Int',
            isGenerated: false,
            isUpdatedAt: false,
          },
          {
            name: 'status',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: false,
            isReadOnly: false,
            hasDefaultValue: true,
            type: 'String',
            default: 'active',
            isGenerated: false,
            isUpdatedAt: false,
          },
          {
            name: 'count',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: false,
            isReadOnly: false,
            hasDefaultValue: true,
            type: 'Int',
            default: 0,
            isGenerated: false,
            isUpdatedAt: false,
          },
          {
            name: 'active',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: false,
            isReadOnly: false,
            hasDefaultValue: true,
            type: 'Boolean',
            default: true,
            isGenerated: false,
            isUpdatedAt: false,
          },
        ],
      };

      const options = createMockOptions([modelWithDefaults]);
      const result = generatePgSchema(options);

      expect(result).toContain('default("active")');
      expect(result).toContain('default(0)');
      expect(result).toContain('default(true)');
    });

    it('should handle array defaults', () => {
      const modelWithArrayDefault = {
        ...simpleUserModel,
        fields: [
          {
            name: 'id',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: true,
            isReadOnly: false,
            hasDefaultValue: false,
            type: 'Int',
            isGenerated: false,
            isUpdatedAt: false,
          },
          {
            name: 'tags',
            kind: 'scalar' as const,
            isList: true,
            isRequired: true,
            isUnique: false,
            isId: false,
            isReadOnly: false,
            hasDefaultValue: true,
            type: 'String',
            default: ['tag1', 'tag2'],
            isGenerated: false,
            isUpdatedAt: false,
          },
        ],
      };

      const options = createMockOptions([modelWithArrayDefault]);
      const result = generatePgSchema(options);

      expect(result).toContain('default(["tag1", "tag2"])');
    });

    it('should handle dbgenerated default', () => {
      const modelWithDbGenerated = {
        ...simpleUserModel,
        fields: [
          {
            name: 'id',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: true,
            isReadOnly: false,
            hasDefaultValue: true,
            type: 'String',
            default: {
              name: 'dbgenerated',
              args: ['uuid_generate_v4()'],
            },
            isGenerated: false,
            isUpdatedAt: false,
          },
        ],
      };

      const options = createMockOptions([modelWithDbGenerated]);
      const result = generatePgSchema(options);

      expect(result).toContain('import { sql }');
      expect(result).toContain('default(sql`uuid_generate_v4()`)');
    });

    it('should handle uuid default', () => {
      const modelWithUuid = {
        ...simpleUserModel,
        fields: [
          {
            name: 'id',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: true,
            isReadOnly: false,
            hasDefaultValue: true,
            type: 'String',
            default: {
              name: 'uuid()',
              args: [],
            },
            isGenerated: false,
            isUpdatedAt: false,
          },
        ],
      };

      const options = createMockOptions([modelWithUuid]);
      const result = generatePgSchema(options);

      expect(result).toContain('default(sql`uuid()`)');
    });
  });

  describe('relations', () => {
    it('should generate foreign keys for one-to-many relations', () => {
      const options = createMockOptions([userModelWithPosts, postModel]);
      const result = generatePgSchema(options);

      expect(result).toContain('foreignKey');
      expect(result).toContain('Post_user_fkey');
      expect(result).toContain('columns: [Post.userId]');
      expect(result).toContain('foreignColumns: [User.id]');
    });

    it('should generate defineRelations for models with relations', () => {
      const options = createMockOptions([userModelWithPosts, postModel]);
      const result = generatePgSchema(options);

      expect(result).toContain('defineRelations');
      expect(result).toContain('export const relations = defineRelations');
      expect(result).toContain('User, Post');
    });

    it('should generate r.one relations', () => {
      const options = createMockOptions([userModelWithPosts, postModel]);
      const result = generatePgSchema(options);

      expect(result).toContain('user: r.one.User');
      expect(result).toContain('from: r.Post.userId');
      expect(result).toContain('to: r.User.id');
    });

    it('should generate r.many relations', () => {
      const options = createMockOptions([userModelWithPosts, postModel]);
      const result = generatePgSchema(options);

      expect(result).toContain('posts: r.many.Post');
    });

    it('should handle cascade delete action', () => {
      const postWithCascade = {
        ...postModel,
        fields: postModel.fields.map((f) =>
          f.name === 'user' ? { ...f, relationOnDelete: 'Cascade' as const } : f
        ),
      };

      const options = createMockOptions([userModelWithPosts, postWithCascade]);
      const result = generatePgSchema(options);

      expect(result).toContain("onDelete('cascade')");
    });

    it('should handle SetNull delete action', () => {
      const postWithSetNull = {
        ...postModel,
        fields: postModel.fields.map((f) =>
          f.name === 'user' ? { ...f, relationOnDelete: 'SetNull' as const } : f
        ),
      };

      const options = createMockOptions([userModelWithPosts, postWithSetNull]);
      const result = generatePgSchema(options);

      expect(result).toContain("onDelete('set null')");
    });

    it('should handle SetDefault delete action', () => {
      const postWithSetDefault = {
        ...postModel,
        fields: postModel.fields.map((f) =>
          f.name === 'user' ? { ...f, relationOnDelete: 'SetDefault' as const } : f
        ),
      };

      const options = createMockOptions([userModelWithPosts, postWithSetDefault]);
      const result = generatePgSchema(options);

      expect(result).toContain("onDelete('set default')");
    });

    it('should handle Restrict delete action', () => {
      const postWithRestrict = {
        ...postModel,
        fields: postModel.fields.map((f) =>
          f.name === 'user' ? { ...f, relationOnDelete: 'Restrict' as const } : f
        ),
      };

      const options = createMockOptions([userModelWithPosts, postWithRestrict]);
      const result = generatePgSchema(options);

      expect(result).toContain("onDelete('restrict')");
    });

    it('should handle NoAction delete action', () => {
      const postWithNoAction = {
        ...postModel,
        fields: postModel.fields.map((f) =>
          f.name === 'user' ? { ...f, relationOnDelete: 'NoAction' as const } : f
        ),
      };

      const options = createMockOptions([userModelWithPosts, postWithNoAction]);
      const result = generatePgSchema(options);

      // NoAction should not add onDelete
      expect(result).not.toContain("onDelete('no action')");
    });
  });

  describe('imports', () => {
    it('should import required pg types', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generatePgSchema(options);

      expect(result).toContain("from 'drizzle-orm/pg-core'");
      expect(result).toContain('pgTable');
    });

    it('should import sql when needed', () => {
      const modelWithDbGenerated = {
        ...simpleUserModel,
        fields: [
          {
            name: 'id',
            kind: 'scalar' as const,
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: true,
            isReadOnly: false,
            hasDefaultValue: true,
            type: 'String',
            default: {
              name: 'dbgenerated',
              args: ['uuid_generate_v4()'],
            },
            isGenerated: false,
            isUpdatedAt: false,
          },
        ],
      };

      const options = createMockOptions([modelWithDbGenerated]);
      const result = generatePgSchema(options);

      expect(result).toContain("from 'drizzle-orm'");
      expect(result).toContain('sql');
    });

    it('should sort imports alphabetically', () => {
      const options = createMockOptions([userRoleModel]);
      const result = generatePgSchema(options);

      const pgImportMatch = result.match(/import { ([^}]+) } from 'drizzle-orm\/pg-core'/);
      if (pgImportMatch) {
        const imports = pgImportMatch[1]?.split(',').map((s) => s.trim());
        const sorted = [...(imports ?? [])].sort();
        expect(imports).toEqual(sorted);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty models array', () => {
      const options = createMockOptions([]);
      const result = generatePgSchema(options);

      // Should not generate any table exports
      expect(result).not.toContain('export const');
    });

    it('should handle models without relations', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generatePgSchema(options);

      // Should have table but no relations export
      expect(result).toContain('export const User');
      expect(result).not.toContain('export const relations');
    });

    it('should use dbName if provided', () => {
      const modelWithDbName = {
        ...simpleUserModel,
        dbName: 'users',
        fields: simpleUserModel.fields.map((f) =>
          f.name === 'email' ? { ...f, dbName: 'user_email' } : f
        ),
      };

      const options = createMockOptions([modelWithDbName]);
      const result = generatePgSchema(options);

      expect(result).toContain("pgTable('users'");
      expect(result).toContain("text('user_email')");
    });

    it('should handle enum dbName', () => {
      const enumWithDbName = {
        ...roleEnum,
        dbName: 'user_role',
        values: roleEnum.values.map((v) =>
          v.name === 'ADMIN' ? { ...v, dbName: 'administrator' } : v
        ),
      };

      const modelWithEnum = {
        ...userWithRoleModel,
        fields: userWithRoleModel.fields.map((f) =>
          f.name === 'role' ? { ...f, dbName: 'user_role' } : f
        ),
      };

      const options = createMockOptions([modelWithEnum], [enumWithDbName]);
      const result = generatePgSchema(options);

      expect(result).toContain("pgEnum('user_role'");
      expect(result).toContain("'administrator'");
    });
  });
});

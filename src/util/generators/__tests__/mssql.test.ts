import { describe, expect, it } from 'vitest';
import { generateMsSqlSchema } from '../mssql';
import {
  allTypesModel,
  createMockOptions,
  postModel,
  productModel,
  simpleUserModel,
  userModelWithPosts,
  userRoleModel,
} from './test-fixtures';

describe('generateMsSqlSchema', () => {
  describe('basic table generation', () => {
    it('should generate a simple table with basic fields', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain('mssqlTable');
      expect(result).toContain("export const User = mssqlTable('User'");
      expect(result).toContain(
        "id: int('id').notNull().primaryKey().identity({ seed: 1, increment: 1 })"
      );
      expect(result).toContain("email: varchar('email').notNull().unique()");
      expect(result).toContain("name: varchar('name')");
      expect(result).toContain(
        "createdAt: datetime('createdAt', { mode: 'date' }).notNull().defaultGetDate()"
      );
    });

    it('should handle nullable fields', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generateMsSqlSchema(options);

      // name field should be nullable (no .notNull())
      expect(result).toMatch(/name: varchar\('name'\)(?!.*\.notNull\(\))/);
    });

    it('should handle unique constraints', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain("email: varchar('email').notNull().unique()");
    });

    it('should handle composite primary keys', () => {
      const options = createMockOptions([userRoleModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain('primaryKey');
      expect(result).toContain('UserRole.userId');
      expect(result).toContain('UserRole.roleId');
    });

    it('should handle unique indexes', () => {
      const options = createMockOptions([productModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain('uniqueIndex');
      expect(result).toContain('Product_sku_key');
      expect(result).toContain('Product.sku');
    });
  });

  describe('data type mappings', () => {
    it('should correctly map all Prisma types to MSSQL types', () => {
      // Create a version of allTypesModel without JSON field since MSSQL doesn't support it
      const mssqlTypesModel = {
        ...allTypesModel,
        fields: allTypesModel.fields.filter(f => f.name !== 'jsonField')
      };

      const options = createMockOptions([mssqlTypesModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain("bigint('bigIntField', { mode: 'bigint' })");
      expect(result).toContain("bit('boolField')");
      expect(result).toContain("datetime('dateField', { mode: 'date' })");
      expect(result).toContain("decimal('decimalField', { precision: 65, scale: 30 })");
      expect(result).toContain("float('floatField')");
      expect(result).toContain("varchar('stringField')");
    });

    it('should throw error for JSON type', () => {
      const modelWithJson = {
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
            type: 'Json',
            isGenerated: false,
            isUpdatedAt: false,
          },
        ],
      };

      const options = createMockOptions([modelWithJson]);
      expect(() => generateMsSqlSchema(options)).toThrow("doesn't support JSON");
    });
  });

  describe('default values', () => {
    it('should handle now() default', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain('defaultGetDate()');
    });

    it('should handle autoincrement default', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain('identity({ seed: 1, increment: 1 })');
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
      const result = generateMsSqlSchema(options);

      expect(result).toContain('default("active")');
      expect(result).toContain('default(0)');
      expect(result).toContain('default(true)');
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
              args: ['NEWID()'],
            },
            isGenerated: false,
            isUpdatedAt: false,
          },
        ],
      };

      const options = createMockOptions([modelWithDbGenerated]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain('import { sql }');
      expect(result).toContain('default(sql`NEWID()`)');
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
      const result = generateMsSqlSchema(options);

      expect(result).toContain('default(sql`NEWSEQUENTIALID()`)');
    });
  });

  describe('relations', () => {
    it('should generate foreign keys for one-to-many relations', () => {
      const options = createMockOptions([userModelWithPosts, postModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain('foreignKey');
      expect(result).toContain('Post_user_fkey');
      expect(result).toContain('columns: [Post.userId]');
      expect(result).toContain('foreignColumns: [User.id]');
    });

    it('should generate defineRelations for models with relations', () => {
      const options = createMockOptions([userModelWithPosts, postModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain('defineRelations');
      expect(result).toContain('export const relations = defineRelations');
      expect(result).toContain('User, Post');
    });

    it('should generate r.one relations', () => {
      const options = createMockOptions([userModelWithPosts, postModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain('user: r.one.User');
      expect(result).toContain('from: r.Post.userId');
      expect(result).toContain('to: r.User.id');
    });

    it('should generate r.many relations', () => {
      const options = createMockOptions([userModelWithPosts, postModel]);
      const result = generateMsSqlSchema(options);

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
      const result = generateMsSqlSchema(options);

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
      const result = generateMsSqlSchema(options);

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
      const result = generateMsSqlSchema(options);

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
      const result = generateMsSqlSchema(options);

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
      const result = generateMsSqlSchema(options);

      // NoAction should not add onDelete
      expect(result).not.toContain("onDelete('no action')");
    });
  });

  describe('imports', () => {
    it('should import required mssql types', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain("from 'drizzle-orm/mssql-core'");
      expect(result).toContain('mssqlTable');
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
              args: ['NEWID()'],
            },
            isGenerated: false,
            isUpdatedAt: false,
          },
        ],
      };

      const options = createMockOptions([modelWithDbGenerated]);
      const result = generateMsSqlSchema(options);

      expect(result).toContain("from 'drizzle-orm'");
      expect(result).toContain('sql');
    });

    it('should sort imports alphabetically', () => {
      const options = createMockOptions([userRoleModel]);
      const result = generateMsSqlSchema(options);

      const mssqlImportMatch = result.match(/import { ([^}]+) } from 'drizzle-orm\/mssql-core'/);
      if (mssqlImportMatch) {
        const imports = mssqlImportMatch[1]?.split(',').map((s) => s.trim());
        const sorted = [...(imports ?? [])].sort();
        expect(imports).toEqual(sorted);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty models array', () => {
      const options = createMockOptions([]);
      const result = generateMsSqlSchema(options);

      // Should not generate any table exports
      expect(result).not.toContain('export const');
    });

    it('should handle models without relations', () => {
      const options = createMockOptions([simpleUserModel]);
      const result = generateMsSqlSchema(options);

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
      const result = generateMsSqlSchema(options);

      expect(result).toContain("mssqlTable('users'");
      expect(result).toContain("varchar('user_email')");
    });
  });
});

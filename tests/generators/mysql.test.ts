import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { createSchema, getGeneratorOptions, loadGenerators } from '../helpers/generators';

const generate = async (schema: string) => {
	const { generateMySqlSchema } = await loadGenerators();
	return generateMySqlSchema(await getGeneratorOptions(createSchema('mysql', schema)));
};

describe('generateMySqlSchema', () => {
	it('everything', async () => {
		const { generateMySqlSchema } = await loadGenerators();
		const schema = readFileSync(join(__dirname, '../fixtures/mysql.prisma'), 'utf8');

		await expect(generateMySqlSchema(await getGeneratorOptions(schema))).toMatchFileSnapshot(
			'./__snapshots__/mysql.ts',
		);
	});

	it('Int', async () => {
		const schema = `
			model User {
				id Int @id
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey()
			});
		`);
	});

	it('autoincrement', async () => {
		const schema = `
			model User {
				id Int @id @default(autoincrement())
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey().autoincrement()
			});
		`);
	});

	it('String', async () => {
		const schema = `
			model User {
				id   Int    @id
				name String
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				name: varchar('name', { length: 191 }).notNull()
			});
		`);
	});

	it('optional', async () => {
		const schema = `
			model User {
				id   Int     @id
				name String?
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				name: varchar('name', { length: 191 })
			});
		`);
	});

	it('Boolean', async () => {
		const schema = `
			model User {
				id       Int     @id
				isActive Boolean
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { boolean, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				isActive: boolean('isActive').notNull()
			});
		`);
	});

	it('BigInt', async () => {
		const schema = `
			model User {
				id    Int    @id
				views BigInt
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { bigint, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				views: bigint('views', { mode: 'bigint' }).notNull()
			});
		`);
	});

	it('Float', async () => {
		const schema = `
			model User {
				id     Int   @id
				rating Float
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { double, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				rating: double('rating').notNull()
			});
		`);
	});

	it('Decimal', async () => {
		const schema = `
			model User {
				id      Int     @id
				balance Decimal
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { decimal, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				balance: decimal('balance', { precision: 65, scale: 30 }).notNull()
			});
		`);
	});

	it('DateTime', async () => {
		const schema = `
			model User {
				id        Int      @id
				createdAt DateTime
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { datetime, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				createdAt: datetime('createdAt', { fsp: 3 }).notNull()
			});
		`);
	});

	it('Json', async () => {
		const schema = `
			model User {
				id       Int  @id
				settings Json
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, json, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				settings: json('settings').notNull()
			});
		`);
	});

	it('Bytes', async () => {
		const schema = `
			model User {
				id     Int   @id
				avatar Bytes
			}
		`;

		await expect(generate(schema)).rejects.toThrow(/binary data type for MySQL/);
	});

	it('unique', async () => {
		const schema = `
			model User {
				id    Int    @id
				email String @unique
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				email: varchar('email', { length: 191 }).notNull().unique()
			});
		`);
	});

	it('map', async () => {
		const schema = `
			model User {
				id   Int    @id
				name String @map("full_name")

				@@map("users")
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('users', {
				id: int('id').notNull().primaryKey(),
				name: varchar('full_name', { length: 191 }).notNull()
			});
		`);
	});

	it('literal defaults', async () => {
		const schema = `
			model User {
				id       Int     @id
				age      Int     @default(18)
				isActive Boolean @default(true)
				role     String  @default("member")
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { boolean, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				age: int('age').notNull().default(18),
				isActive: boolean('isActive').notNull().default(true),
				role: varchar('role', { length: 191 }).notNull().default("member")
			});
		`);
	});

	it('now', async () => {
		const schema = `
			model User {
				id        Int      @id
				createdAt DateTime @default(now())
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { sql } from 'drizzle-orm'
			import { datetime, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				createdAt: datetime('createdAt', { fsp: 3 }).notNull().default(sql\`CURRENT_TIMESTAMP\`)
			});
		`);
	});

	it('uuid', async () => {
		const schema = `
			model User {
				id String @id @default(uuid())
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { sql } from 'drizzle-orm'
			import { mysqlTable, varchar } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: varchar('id', { length: 191 }).notNull().primaryKey().default(sql\`uuid()\`)
			});
		`);
	});

	it('cuid', async () => {
		const schema = `
			model User {
				id String @id @default(cuid())
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { sql } from 'drizzle-orm'
			import { mysqlTable, varchar } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: varchar('id', { length: 191 }).notNull().primaryKey().default(sql\`cuid()\`)
			});
		`);
	});

	it('dbgenerated', async () => {
		const schema = `
			model User {
				id String @id @default(dbgenerated("gen_random_uuid()"))
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { sql } from 'drizzle-orm'
			import { mysqlTable, varchar } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: varchar('id', { length: 191 }).notNull().primaryKey().default(sql\`gen_random_uuid()\`)
			});
		`);
	});

	it('enum', async () => {
		const schema = `
			enum Role {
				USER
				ADMIN @map("administrator")
			}

			model User {
				id   Int  @id
				role Role @default(USER)
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlEnum, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey(),
				role: mysqlEnum('role', ['USER', 'administrator']).notNull().default("USER")
			});
		`);
	});

	it('one-to-many', async () => {
		const schema = `
			model User {
				id    Int    @id
				posts Post[]
			}

			model Post {
				id       Int  @id
				authorId Int
				author   User @relation(fields: [authorId], references: [id])
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { relations } from 'drizzle-orm'
			import { foreignKey, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey()
			});

			export const Post = mysqlTable('Post', {
				id: int('id').notNull().primaryKey(),
				authorId: int('authorId').notNull()
			}, (Post) => ({
				'Post_author_fkey': foreignKey({
					name: 'Post_author_fkey',
					columns: [Post.authorId],
					foreignColumns: [User.id]
				})
					.onDelete('cascade')
					.onUpdate('cascade')
			}));

			export const UserRelations = relations(User, ({ many }) => ({
				posts: many(Post, {
					relationName: 'PostToUser'
				})
			}));

			export const PostRelations = relations(Post, ({ one }) => ({
				author: one(User, {
					relationName: 'PostToUser',
					fields: [Post.authorId],
					references: [User.id]
				})
			}));
		`);
	});

	it('onDelete SetNull', async () => {
		const schema = `
			model User {
				id    Int    @id
				posts Post[]
			}

			model Post {
				id       Int   @id
				authorId Int?
				author   User? @relation(fields: [authorId], references: [id], onDelete: SetNull)
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { relations } from 'drizzle-orm'
			import { foreignKey, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey()
			});

			export const Post = mysqlTable('Post', {
				id: int('id').notNull().primaryKey(),
				authorId: int('authorId')
			}, (Post) => ({
				'Post_author_fkey': foreignKey({
					name: 'Post_author_fkey',
					columns: [Post.authorId],
					foreignColumns: [User.id]
				})
					.onDelete('set null')
					.onUpdate('cascade')
			}));

			export const UserRelations = relations(User, ({ many }) => ({
				posts: many(Post, {
					relationName: 'PostToUser'
				})
			}));

			export const PostRelations = relations(Post, ({ one }) => ({
				author: one(User, {
					relationName: 'PostToUser',
					fields: [Post.authorId],
					references: [User.id]
				})
			}));
		`);
	});

	it('onDelete Restrict', async () => {
		const schema = `
			model User {
				id    Int    @id
				posts Post[]
			}

			model Post {
				id       Int  @id
				authorId Int
				author   User @relation(fields: [authorId], references: [id], onDelete: Restrict)
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { relations } from 'drizzle-orm'
			import { foreignKey, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey()
			});

			export const Post = mysqlTable('Post', {
				id: int('id').notNull().primaryKey(),
				authorId: int('authorId').notNull()
			}, (Post) => ({
				'Post_author_fkey': foreignKey({
					name: 'Post_author_fkey',
					columns: [Post.authorId],
					foreignColumns: [User.id]
				})
					.onDelete('restrict')
					.onUpdate('cascade')
			}));

			export const UserRelations = relations(User, ({ many }) => ({
				posts: many(Post, {
					relationName: 'PostToUser'
				})
			}));

			export const PostRelations = relations(Post, ({ one }) => ({
				author: one(User, {
					relationName: 'PostToUser',
					fields: [Post.authorId],
					references: [User.id]
				})
			}));
		`);
	});

	it('onDelete NoAction', async () => {
		const schema = `
			model User {
				id    Int    @id
				posts Post[]
			}

			model Post {
				id       Int  @id
				authorId Int
				author   User @relation(fields: [authorId], references: [id], onDelete: NoAction)
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { relations } from 'drizzle-orm'
			import { foreignKey, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const User = mysqlTable('User', {
				id: int('id').notNull().primaryKey()
			});

			export const Post = mysqlTable('Post', {
				id: int('id').notNull().primaryKey(),
				authorId: int('authorId').notNull()
			}, (Post) => ({
				'Post_author_fkey': foreignKey({
					name: 'Post_author_fkey',
					columns: [Post.authorId],
					foreignColumns: [User.id]
				})
					.onUpdate('cascade')
			}));

			export const UserRelations = relations(User, ({ many }) => ({
				posts: many(Post, {
					relationName: 'PostToUser'
				})
			}));

			export const PostRelations = relations(Post, ({ one }) => ({
				author: one(User, {
					relationName: 'PostToUser',
					fields: [Post.authorId],
					references: [User.id]
				})
			}));
		`);
	});

	it('composite primary key', async () => {
		const schema = `
			model Membership {
				userId  Int
				groupId Int

				@@id([userId, groupId])
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable, primaryKey } from 'drizzle-orm/mysql-core'

			export const Membership = mysqlTable('Membership', {
				userId: int('userId').notNull(),
				groupId: int('groupId').notNull()
			}, (Membership) => ({
				'Membership_cpk': primaryKey({
					name: 'Membership_cpk',
					columns: [Membership.userId, Membership.groupId]
				})
			}));
		`);
	});

	it('unique index', async () => {
		const schema = `
			model Membership {
				id      Int @id
				userId  Int
				groupId Int

				@@unique([userId, groupId])
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable, uniqueIndex } from 'drizzle-orm/mysql-core'

			export const Membership = mysqlTable('Membership', {
				id: int('id').notNull().primaryKey(),
				userId: int('userId').notNull(),
				groupId: int('groupId').notNull()
			}, (Membership) => ({
				'Membership_userId_groupId_unique_idx': uniqueIndex('Membership_userId_groupId_key')
					.on(Membership.userId, Membership.groupId)
			}));
		`);
	});

	it('named unique index', async () => {
		const schema = `
			model Membership {
				id      Int @id
				userId  Int
				groupId Int

				@@unique([userId, groupId], name: "user_group")
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable, uniqueIndex } from 'drizzle-orm/mysql-core'

			export const Membership = mysqlTable('Membership', {
				id: int('id').notNull().primaryKey(),
				userId: int('userId').notNull(),
				groupId: int('groupId').notNull()
			}, (Membership) => ({
				'user_group': uniqueIndex('user_group')
					.on(Membership.userId, Membership.groupId)
			}));
		`);
	});

	it('implicit many-to-many', async () => {
		const schema = `
			model Post {
				id   Int   @id
				tags Tag[]
			}

			model Tag {
				id    Int    @id
				posts Post[]
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { relations } from 'drizzle-orm'
			import { foreignKey, int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const Post = mysqlTable('Post', {
				id: int('id').notNull().primaryKey()
			});

			export const Tag = mysqlTable('Tag', {
				id: int('id').notNull().primaryKey()
			});

			export const PostToTag = mysqlTable('_PostToTag', {
				TagId: int('A').notNull(),
				PostId: int('B').notNull()
			}, (PostToTag) => ({
				'_PostToTag_Tag_fkey': foreignKey({
					name: '_PostToTag_Tag_fkey',
					columns: [PostToTag.TagId],
					foreignColumns: [Tag.id]
				})
					.onDelete('cascade')
					.onUpdate('cascade'),
				'_PostToTag_Post_fkey': foreignKey({
					name: '_PostToTag_Post_fkey',
					columns: [PostToTag.PostId],
					foreignColumns: [Post.id]
				})
					.onDelete('cascade')
					.onUpdate('cascade')
			}));

			export const PostRelations = relations(Post, ({ many }) => ({
				tags: many(PostToTag, {
					relationName: 'PostToPostToTag'
				})
			}));

			export const TagRelations = relations(Tag, ({ many }) => ({
				posts: many(PostToTag, {
					relationName: 'TagToPostToTag'
				})
			}));

			export const PostToTagRelations = relations(PostToTag, ({ one }) => ({
				Tag: one(Tag, {
					relationName: 'TagToPostToTag',
					fields: [PostToTag.TagId],
					references: [Tag.id]
				}),
				Post: one(Post, {
					relationName: 'PostToPostToTag',
					fields: [PostToTag.PostId],
					references: [Post.id]
				})
			}));
		`);
	});

	// Generator currently swaps Prisma's A/B join column order.
	it.fails('A/B join columns in alphabetical model order', async () => {
		const schema = `
			model Post {
				id   Int   @id
				tags Tag[]
			}

			model Tag {
				id    Int    @id
				posts Post[]
			}
		`;

		const out = await generate(schema);

		expect(out).toContain("PostId: int('A')");
		expect(out).toContain("TagId: int('B')");
	});

	it('unsupported type', async () => {
		const schema = `
			model Place {
				id       Int @id
				location Unsupported("geometry")
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, mysqlTable } from 'drizzle-orm/mysql-core'

			export const Place = mysqlTable('Place', {
				id: int('id').notNull().primaryKey()
			});
		`);
	});
});

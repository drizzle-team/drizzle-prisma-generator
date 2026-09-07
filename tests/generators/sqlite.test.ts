import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { createSchema, getGeneratorOptions, loadGenerators } from '../helpers/generators';

const generate = async (schema: string) => {
	const { generateSQLiteSchema } = await loadGenerators();
	return generateSQLiteSchema(await getGeneratorOptions(createSchema('sqlite', schema)));
};

describe('generateSQLiteSchema', () => {
	it('everything', async () => {
		const { generateSQLiteSchema } = await loadGenerators();
		const schema = readFileSync(join(__dirname, '../fixtures/sqlite.prisma'), 'utf8');

		await expect(generateSQLiteSchema(await getGeneratorOptions(schema))).toMatchFileSnapshot(
			'./__snapshots__/sqlite.ts',
		);
	});

	it('Int', async () => {
		const schema = `
			model User {
				id Int @id
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
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
			import { int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey()
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
			import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				name: text('name').notNull()
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
			import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				name: text('name')
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
			import { int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				isActive: int('isActive', { mode: 'boolean' }).notNull()
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
			import { int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				views: int('views').notNull()
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
			import { int, real, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				rating: real('rating').notNull()
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
			import { int, numeric, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				balance: numeric('balance').notNull()
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
			import { int, numeric, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				createdAt: numeric('createdAt').notNull()
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

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { blob, int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				avatar: blob('avatar', { mode: 'buffer' }).notNull()
			});
		`);
	});

	it('unique', async () => {
		const schema = `
			model User {
				id    Int    @id
				email String @unique
			}
		`;

		expect(await generate(schema)).toMatchInlineSnapshot(`
			import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				email: text('email').notNull().unique()
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
			import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('users', {
				id: int('id').notNull().primaryKey(),
				name: text('full_name').notNull()
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
			import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				age: int('age').notNull().default(18),
				isActive: int('isActive', { mode: 'boolean' }).notNull().default(true),
				role: text('role').notNull().default("member")
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
			import { int, numeric, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey(),
				createdAt: numeric('createdAt').notNull().default(sql\`DATE('now')\`)
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
			import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: text('id').notNull().primaryKey().default(sql\`uuid()\`)
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
			import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: text('id').notNull().primaryKey().default(sql\`cuid()\`)
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
			import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: text('id').notNull().primaryKey().default(sql\`gen_random_uuid()\`)
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
			import { foreignKey, int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey()
			});

			export const Post = sqliteTable('Post', {
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
			import { foreignKey, int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey()
			});

			export const Post = sqliteTable('Post', {
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
			import { foreignKey, int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey()
			});

			export const Post = sqliteTable('Post', {
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
			import { foreignKey, int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const User = sqliteTable('User', {
				id: int('id').notNull().primaryKey()
			});

			export const Post = sqliteTable('Post', {
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
			import { int, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const Membership = sqliteTable('Membership', {
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
			import { int, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core'

			export const Membership = sqliteTable('Membership', {
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
			import { int, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core'

			export const Membership = sqliteTable('Membership', {
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
			import { foreignKey, int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const Post = sqliteTable('Post', {
				id: int('id').notNull().primaryKey()
			});

			export const Tag = sqliteTable('Tag', {
				id: int('id').notNull().primaryKey()
			});

			export const PostToTag = sqliteTable('_PostToTag', {
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
			import { int, sqliteTable } from 'drizzle-orm/sqlite-core'

			export const Place = sqliteTable('Place', {
				id: int('id').notNull().primaryKey()
			});
		`);
	});
});

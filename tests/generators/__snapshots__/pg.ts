import { relations, sql } from 'drizzle-orm'
import { bigint, boolean, decimal, doublePrecision, foreignKey, integer, jsonb, pgEnum, pgTable, primaryKey, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const Role = pgEnum('Role', ['USER', 'administrator'])

export const User = pgTable('users', {
	id: serial('id').notNull().primaryKey(),
	email: text('email').notNull().unique(),
	name: text('full_name'),
	age: integer('age').notNull().default(18),
	balance: doublePrecision('balance').notNull().default(0.5),
	isActive: boolean('isActive').notNull().default(true),
	bigCount: bigint('bigCount', { mode: 'bigint' }).notNull(),
	price: decimal('price', { precision: 65, scale: 30 }).notNull(),
	meta: jsonb('meta'),
	createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
	uuid: text('uuid').notNull().default(sql`uuid()`),
	cuid: text('cuid').notNull().default(sql`cuid()`),
	generated: text('generated').notNull().default(sql`gen_random_uuid()`),
	labels: text('labels').array().notNull().default(["a", "b"]),
	role: Role('role').notNull().default("USER")
});

export const Profile = pgTable('Profile', {
	id: integer('id').notNull().primaryKey(),
	userId: integer('userId').notNull().unique()
}, (Profile) => ({
	'Profile_user_fkey': foreignKey({
		name: 'Profile_user_fkey',
		columns: [Profile.userId],
		foreignColumns: [User.id]
	})
		.onDelete('cascade')
		.onUpdate('cascade')
}));

export const Post = pgTable('posts', {
	id: integer('id').notNull().primaryKey(),
	title: text('post_title').notNull(),
	authorId: integer('authorId')
}, (Post) => ({
	'posts_author_fkey': foreignKey({
		name: 'posts_author_fkey',
		columns: [Post.authorId],
		foreignColumns: [User.id]
	})
		.onDelete('set null')
		.onUpdate('cascade')
}));

export const Like = pgTable('Like', {
	id: integer('id').notNull().primaryKey(),
	userId: integer('userId').notNull()
}, (Like) => ({
	'Like_user_fkey': foreignKey({
		name: 'Like_user_fkey',
		columns: [Like.userId],
		foreignColumns: [User.id]
	})
		.onDelete('restrict')
		.onUpdate('cascade')
}));

export const Note = pgTable('Note', {
	id: integer('id').notNull().primaryKey(),
	userId: integer('userId').notNull()
}, (Note) => ({
	'Note_user_fkey': foreignKey({
		name: 'Note_user_fkey',
		columns: [Note.userId],
		foreignColumns: [User.id]
	})
		.onUpdate('cascade')
}));

export const Tag = pgTable('Tag', {
	id: integer('id').notNull().primaryKey()
});

export const Membership = pgTable('Membership', {
	userId: integer('userId').notNull(),
	groupId: integer('groupId').notNull(),
	role: text('role').notNull()
}, (Membership) => ({
	'Membership_userId_role_unique_idx': uniqueIndex('Membership_userId_role_key')
		.on(Membership.userId, Membership.role),
	'group_role': uniqueIndex('group_role')
		.on(Membership.groupId, Membership.role),
	'Membership_cpk': primaryKey({
		name: 'Membership_cpk',
		columns: [Membership.userId, Membership.groupId]
	})
}));

export const TagToUser = pgTable('_TagToUser', {
	UserId: integer('A').notNull(),
	TagId: integer('B').notNull()
}, (TagToUser) => ({
	'_TagToUser_User_fkey': foreignKey({
		name: '_TagToUser_User_fkey',
		columns: [TagToUser.UserId],
		foreignColumns: [User.id]
	})
		.onDelete('cascade')
		.onUpdate('cascade'),
	'_TagToUser_Tag_fkey': foreignKey({
		name: '_TagToUser_Tag_fkey',
		columns: [TagToUser.TagId],
		foreignColumns: [Tag.id]
	})
		.onDelete('cascade')
		.onUpdate('cascade')
}));

export const PostToTag = pgTable('_PostToTag', {
	TagId: integer('A').notNull(),
	PostId: integer('B').notNull()
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

export const UserRelations = relations(User, ({ many }) => ({
	posts: many(Post, {
		relationName: 'PostToUser'
	}),
	likes: many(Like, {
		relationName: 'LikeToUser'
	}),
	notes: many(Note, {
		relationName: 'NoteToUser'
	}),
	profile: many(Profile, {
		relationName: 'ProfileToUser'
	}),
	tags: many(TagToUser, {
		relationName: 'UserToTagToUser'
	})
}));

export const ProfileRelations = relations(Profile, ({ one }) => ({
	user: one(User, {
		relationName: 'ProfileToUser',
		fields: [Profile.userId],
		references: [User.id]
	})
}));

export const PostRelations = relations(Post, ({ one, many }) => ({
	author: one(User, {
		relationName: 'PostToUser',
		fields: [Post.authorId],
		references: [User.id]
	}),
	tags: many(PostToTag, {
		relationName: 'PostToPostToTag'
	})
}));

export const LikeRelations = relations(Like, ({ one }) => ({
	user: one(User, {
		relationName: 'LikeToUser',
		fields: [Like.userId],
		references: [User.id]
	})
}));

export const NoteRelations = relations(Note, ({ one }) => ({
	user: one(User, {
		relationName: 'NoteToUser',
		fields: [Note.userId],
		references: [User.id]
	})
}));

export const TagRelations = relations(Tag, ({ many }) => ({
	users: many(TagToUser, {
		relationName: 'TagToTagToUser'
	}),
	posts: many(PostToTag, {
		relationName: 'TagToPostToTag'
	})
}));

export const TagToUserRelations = relations(TagToUser, ({ one }) => ({
	User: one(User, {
		relationName: 'UserToTagToUser',
		fields: [TagToUser.UserId],
		references: [User.id]
	}),
	Tag: one(Tag, {
		relationName: 'TagToTagToUser',
		fields: [TagToUser.TagId],
		references: [Tag.id]
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
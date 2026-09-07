import { extractManyToManyModels } from '@/util/extract-many-to-many-models';
import type { UnReadonlyDeep } from '@/util/un-readonly-deep';
import type { DMMF } from '@prisma/generator-helper';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGeneratorOptions } from '../helpers/generators';

const manyToManySchema = `
	datasource db {
		provider = "postgresql"
		url      = env("DATABASE_URL")
	}

	model Post {
		id   Int   @id
		tags Tag[]
	}

	model Tag {
		id    Int    @id
		posts Post[]
	}
`;

const oneToManySchema = `
	datasource db {
		provider = "postgresql"
		url      = env("DATABASE_URL")
	}

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

const cloneModels = (models: readonly DMMF.Model[]) =>
	JSON.parse(JSON.stringify(models)) as UnReadonlyDeep<DMMF.Model[]>;

describe('extractManyToManyModels', () => {
	let models: UnReadonlyDeep<DMMF.Model[]>;

	beforeEach(async () => {
		const options = await getGeneratorOptions(manyToManySchema);
		models = cloneModels(options.dmmf.datamodel.models);
	});

	it('returns nothing for schemas without implicit many-to-many relations', async () => {
		const options = await getGeneratorOptions(oneToManySchema);
		expect(extractManyToManyModels(cloneModels(options.dmmf.datamodel.models))).toEqual([]);
	});

	it('creates a join model named after the Prisma relation', () => {
		const [join, ...rest] = extractManyToManyModels(models as DMMF.Model[]);

		expect(rest).toHaveLength(0);
		expect(join).toBeDefined();
		expect(join!.name).toBe('PostToTag');
		expect(join!.dbName).toBe('_PostToTag');
		expect(join!.primaryKey).toBeNull();
	});

	it('generates scalar join columns typed after the referenced ids', () => {
		const [join] = extractManyToManyModels(models as DMMF.Model[]);
		const scalars = join!.fields.filter((f) => f.kind === 'scalar');

		expect(scalars.map((f) => [f.name, f.type, f.isRequired])).toEqual([
			['TagId', 'Int', true],
			['PostId', 'Int', true],
		]);
		expect(scalars.map((f) => f.dbName).sort()).toEqual(['A', 'B']);
	});

	// Generator currently swaps Prisma's A/B join column order.
	it.fails('maps A to the alphabetically first model and B to the second', () => {
		const [join] = extractManyToManyModels(models as DMMF.Model[]);
		const byDbName = Object.fromEntries(join!.fields.filter((f) => f.dbName).map((f) => [f.dbName, f.name]));

		expect(byDbName).toEqual({ A: 'PostId', B: 'TagId' });
	});

	it('generates relation fields pointing back at both models', () => {
		const [join] = extractManyToManyModels(models as DMMF.Model[]);
		const relations = join!.fields.filter((f) => f.kind === 'object');

		expect(relations.map((f) => [f.name, f.type, f.relationFromFields, f.relationToFields])).toEqual([
			['Tag', 'Tag', ['TagId'], ['id']],
			['Post', 'Post', ['PostId'], ['id']],
		]);
	});

	it('rewrites the original list fields to point at the join model', () => {
		extractManyToManyModels(models as DMMF.Model[]);

		const post = models.find((m) => m.name === 'Post')!;
		const tag = models.find((m) => m.name === 'Tag')!;

		expect(post.fields.find((f) => f.name === 'tags')!.type).toBe('PostToTag');
		expect(tag.fields.find((f) => f.name === 'posts')!.type).toBe('PostToTag');
	});

	it('throws when a referenced model has no id field', () => {
		const broken = cloneModels(models);
		const tag = broken.find((m) => m.name === 'Tag')!;
		tag.fields = tag.fields.map((f) => ({ ...f, isId: false }));

		expect(() => extractManyToManyModels(broken as DMMF.Model[])).toThrow(/No ID field/);
	});
});

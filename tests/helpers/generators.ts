import type { DataSource, GeneratorOptions } from '@prisma/generator-helper';
import { getDMMF } from '@prisma/internals';
import { vi } from 'vitest';

export const createSchema = (provider: DataSource['provider'], schema: string) => `
	datasource db {
		provider = "${provider}"
		url      = env("DATABASE_URL")
	}

	${schema}
`;

export const getGeneratorOptions = async (schema: string) =>
	({ dmmf: await getDMMF({ datamodel: schema }) }) as GeneratorOptions;

export const loadGenerators = async () => {
	vi.resetModules();
	return await import('@/util/generators');
};

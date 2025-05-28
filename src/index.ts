#!/usr/bin/env node
import { defaultPath, generatorName } from '@/globals';
import { GeneratorError, generatorHandler } from '@prisma/generator-helper';
import path from 'path';
import { version } from '../package.json';
import { generateMySqlSchema, generatePgSchema, generateSQLiteSchema } from './util/generators';
import { recursiveWrite } from './util/recursive-write';

export const generator = generatorHandler({
	onManifest() {
		return {
			version,
			defaultOutput: defaultPath,
			prettyName: generatorName,
		};
	},
	onGenerate: async (options) => {
		const dbType = options.datasources[0]?.provider;

		let schema: string;
		let relations: string;

		switch (dbType) {
			case 'postgres':
			case 'postgresql': {
				[schema, relations] = generatePgSchema(options);

				break;
			}

			case 'mysql': {
				[schema, relations] = generateMySqlSchema(options);

				break;
			}

			case 'sqlite': {
				[schema, relations] = generateSQLiteSchema(options);

				break;
			}

			case undefined:
				throw new GeneratorError('Unable to determine database type.\nMake sure datasource.provider is specified.');

			default:
				throw new GeneratorError(
					`Invalid database type for Drizzle schema generation: ${dbType}.\nSupported database types: PostgreSQL, MySQL, SQLite.`,
				);
		}

		const folderPath = path.resolve(
			options.generator.output?.value ?? (!!options.generator.output?.fromEnvVar
				? process.env[options.generator.output.fromEnvVar!] ?? defaultPath
				: defaultPath),
		);

		const schemaPath = folderPath.endsWith('.ts')
			? folderPath
			: path.join(folderPath, '/schema.ts');

		recursiveWrite(schemaPath, schema);

		if (options.generator.config['relationsVersion'] !== 'v1') {
			const relationsPath = folderPath.endsWith('.ts')
				? folderPath
				: path.join(folderPath, '/relations.ts');

			recursiveWrite(relationsPath, relations);
		}
	},
});

export default generator;
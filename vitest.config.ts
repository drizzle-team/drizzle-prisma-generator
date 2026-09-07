import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	test: {
		include: ['tests/**/*.test.ts'],
		snapshotSerializers: ['./tests/helpers/remove-snapshot-quotes.ts'],
		testTimeout: 30_000,
		typecheck: {
			enabled: true,
			include: ['tests/generators/__snapshots__/*.ts'],
		},
	},
});

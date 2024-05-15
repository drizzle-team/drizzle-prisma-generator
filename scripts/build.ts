import 'zx/globals';

import { build } from 'tsup';
(async () => {
	fs.removeSync('dist');

	await build({
		entry: ['src/index.ts'],
		splitting: false,
		sourcemap: true,
		dts: true,
		format: ['cjs'],
		outExtension() {
			return {
				dts: '.d.ts',
				js: '.js',
			};
		},
	});

	fs.copyFileSync('package.json', 'dist/package.json');
	fs.copyFileSync('README.md', 'dist/README.md');
})();

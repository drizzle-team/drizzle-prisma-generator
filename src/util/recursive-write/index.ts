import fs from 'fs';
import pathLib from 'path';

export const recursiveWrite = async (
	path: string,
	content: string,
) => {
	fs.mkdirSync(pathLib.dirname(path), {
		recursive: true,
	});

	fs.writeFileSync(path, content);
};

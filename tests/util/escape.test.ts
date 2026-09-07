import { s } from '@/util/escape';
import { describe, expect, it } from 'vitest';

describe('s (string escape)', () => {
	it('leaves plain strings untouched', () => {
		expect(s('users')).toBe('users');
	});

	it('escapes single quotes by default', () => {
		expect(s("it's")).toBe("it\\'s");
	});

	it('escapes backslashes', () => {
		expect(s('a\\b')).toBe('a\\\\b');
	});

	it('escapes the requested container only', () => {
		expect(s('say "hi" `there`', '`')).toBe('say "hi" \\`there\\`');
		expect(s('say "hi" `there`', '"')).toBe('say \\"hi\\" `there`');
	});

	it('escapes backslashes before quotes so escapes are not double-applied', () => {
		expect(s("\\'")).toBe("\\\\\\'");
	});
});

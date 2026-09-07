import type { SnapshotSerializer } from 'vitest';

export default {
	test: (value) => typeof value === 'string',
	serialize: (value) => value,
} satisfies SnapshotSerializer;

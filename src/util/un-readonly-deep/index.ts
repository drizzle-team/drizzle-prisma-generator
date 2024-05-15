export type UnReadonlyDeep<O> = {
	-readonly [K in keyof O]: UnReadonlyDeep<O[K]>;
};

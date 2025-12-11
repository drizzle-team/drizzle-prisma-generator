export type StringContainer = "'" | '`' | '"';

const backslashes = new RegExp(/\\/g);

export const s = (src: string, container: StringContainer = "'") =>
  src?.replace(backslashes, '\\\\')?.replace(new RegExp(container, 'g'), `\\${container}`);

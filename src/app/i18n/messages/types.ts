/**
 * Noteme's interface text. English is the source: each area's `en` object is a flat record of `'<area>.<name>'` keys,
 * a string, or a function of the values it carries for text with numbers, names or plurals. French and Vietnamese are
 * typed `Translation<typeof en>`, so a missing or extra message, or one taking other values, fails the build.
 */
export type Messages = Record<string, string | ((...args: never[]) => string)>;

/** The same keys as `T`, each a string, or a function of the same values as in English. */
export type Translation<T extends Messages> = {
  [K in keyof T]: T[K] extends (...args: infer A) => string ? (...args: A) => string : string;
};

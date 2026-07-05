/** Normalizes a JSDoc type string. */
export declare function handleJsDocType(type?: string): string;

/** Normalizes JSDoc description text. */
export declare function normalizeDescription<T>(desc: T): T extends unknown[] ? string : T;

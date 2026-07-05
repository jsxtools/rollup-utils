import type { CEM, Context } from "../types.js";

/** Resolved module or package reference fields. */
export type ModuleOrPackageReference = Partial<Pick<CEM.Reference, "module" | "package">>;

/** Checks for a non-empty array. */
export declare function has(arr: unknown): arr is readonly unknown[];

/** Builds a decorator-name predicate. */
export declare function decorator(type: string): (decorator: unknown) => boolean;

/** Checks for a bare module specifier. */
export declare function isBareModuleSpecifier(specifier: string): boolean;

/** Converts a path to a file URL pathname. */
export declare function url(path: string): string;

/** Resolves module or package metadata for a symbol. */
export declare function resolveModuleOrPackageSpecifier(moduleDoc: Partial<CEM.Module>, context: Context, name: string): ModuleOrPackageReference;

/** Converts a string to kebab case. */
export declare function toKebabCase(str: string): string;

/** Runs a callback with a fallback value. */
export declare function safe<T>(cb: () => T, returnType: T): T;

/** Runs a callback with a fallback value. */
export declare function safe<T>(cb: () => T): T | "";

/** Runs a plugin callback with analyzer error context. */
export declare function withErrorHandling(name: string | undefined, cb: () => void): void;

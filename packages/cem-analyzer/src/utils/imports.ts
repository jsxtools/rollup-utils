import type { TS } from "../types.js";

/** Checks for a default import binding. */
export declare function hasDefaultImport(node: TS.Node): boolean;

/** Checks for named import bindings. */
export declare function hasNamedImport(node: TS.Node): boolean;

/** Checks for a namespace import binding. */
export declare function hasAggregatingImport(node: TS.Node): boolean;

/** Checks for a side-effect-only import. */
export declare function hasSideEffectImport(node: TS.Node): boolean;

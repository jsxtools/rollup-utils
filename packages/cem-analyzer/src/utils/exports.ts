import type { TS } from "../types.js";

/** Checks for an export modifier. */
export declare function hasExportModifier(node: TS.Node): boolean;

/** Checks for a default modifier. */
export declare function hasDefaultModifier(node: TS.Node): boolean;

/** Checks for named exports. */
export declare function hasNamedExports(node: TS.Node): boolean;

/** Checks for a re-export declaration. */
export declare function isReexport(node: TS.Node): boolean;

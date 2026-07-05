import type { TS } from "../types.js";

/** TypeScript nodes that form a mixin declaration. */
export interface MixinNodes {
	mixinFunction: TS.VariableStatement | TS.FunctionDeclaration | TS.ArrowFunction;
	mixinClass: TS.ClassDeclaration | TS.ClassExpression;
}

/** Checks for a mixin declaration node. */
export declare function isMixin(node: TS.Node): node is TS.VariableStatement | TS.FunctionDeclaration;

/** Extracts function and class nodes from a mixin. */
export declare function extractMixinNodes(node: TS.Node): MixinNodes | false | undefined;

import type { CEM, TS } from "../../../types.js";

/** Declaration shapes produced from function-like nodes. */
export type FunctionLikeDoc = CEM.FunctionDeclaration | CEM.ClassMethod | CEM.MixinDeclaration;

/** Builds a function or method declaration from a function-like node. */
export declare function createFunctionLike(node: TS.FunctionDeclaration | TS.MethodDeclaration): FunctionLikeDoc;

/** Assigns kind metadata to a function-like declaration. */
export declare function handleKind<T extends object>(functionLike: T, node: TS.FunctionDeclaration | TS.MethodDeclaration): T;

/** Adds parameter and return metadata to a declaration. */
export declare function handleParametersAndReturnType<T extends object>(functionLike: T, node: TS.SignatureDeclarationBase | undefined): T;

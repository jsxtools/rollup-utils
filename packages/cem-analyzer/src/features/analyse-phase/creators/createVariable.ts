import type { CEM, TS } from "../../../types.js";

/** Builds a variable declaration from a variable statement. */
export declare function createVariable(variableStatementNode: TS.VariableStatement, declarationNode: TS.VariableDeclaration): CEM.VariableDeclaration;

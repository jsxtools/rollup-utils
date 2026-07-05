import type { CEM, TS } from "../../../types.js";

/** Builds a class field declaration from a class member. */
export declare function createField(node: TS.PropertyDeclaration | TS.GetAccessorDeclaration | TS.SetAccessorDeclaration): CEM.ClassField;

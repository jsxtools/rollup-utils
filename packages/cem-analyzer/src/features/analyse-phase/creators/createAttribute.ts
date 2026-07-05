import type { CEM, TS } from "../../../types.js";

/** Builds an attribute declaration from a string literal. */
export declare function createAttribute(node: TS.StringLiteral): CEM.Attribute;

/** Builds an attribute declaration from a class field. */
export declare function createAttributeFromField(field: CEM.ClassField | CEM.CustomElementField): CEM.Attribute;

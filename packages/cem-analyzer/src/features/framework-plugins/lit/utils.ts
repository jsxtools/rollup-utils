import type { TS } from "../../../types.js";

/** Lit property decorator or static property options. */
export type LitPropertyOptions = TS.ObjectLiteralExpression | TS.PropertyAssignment | undefined;

/** Checks whether a Lit property defines an attribute. */
export declare function isAlsoAttribute(node: LitPropertyOptions): boolean;

/** Checks whether a Lit property reflects to an attribute. */
export declare function reflects(node: LitPropertyOptions): boolean;

/** Reads the configured Lit property type. */
export declare function getType(node: LitPropertyOptions): string | false;

/** Reads the configured Lit attribute name. */
export declare function getAttributeName(node: LitPropertyOptions): string | false;

/** Checks for a Lit property decorator. */
export declare function hasPropertyDecorator(node: TS.Node): boolean;

/** Checks for a static keyword. */
export declare function hasStaticKeyword(node: TS.Node): boolean;

/** Reads a Lit static properties object expression. */
export declare function getPropertiesObject(node: TS.GetAccessorDeclaration | TS.PropertyDeclaration): TS.Expression | undefined;

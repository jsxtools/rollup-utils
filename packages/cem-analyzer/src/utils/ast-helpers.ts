import type { TS } from "../types.js";

/** Checks for a property-like class member. */
export declare function isProperty(node: TS.Node): node is TS.PropertyDeclaration | TS.GetAccessorDeclaration | TS.SetAccessorDeclaration;

/** Checks for a this.dispatchEvent call. */
export declare function isDispatchEvent(node: TS.Node): boolean;

/** Checks for a return statement. */
export declare function isReturnStatement(statement: TS.Node): statement is TS.ReturnStatement;

/** Checks for a customElements.define call. */
export declare function isCustomElementsDefineCall(node: TS.Node): boolean;

/** Checks for an attribute JSDoc tag. */
export declare function hasAttrAnnotation(member: TS.Node): boolean;

/** Checks for a primitive literal expression. */
export declare function isPrimitive(node: TS.Node | undefined): boolean;

/** Checks whether a variable statement has an initializer. */
export declare function hasInitializer(node: TS.VariableStatement): boolean;

/** Reads the element name from a custom element decorator. */
export declare function getElementNameFromDecorator(decorator: TS.Decorator): string | undefined;

/** Reads the options object from a decorator call. */
export declare function getOptionsObject(decorator: TS.Decorator): TS.ObjectLiteralExpression | undefined;

/** Reads expression text from a return statement. */
export declare function getReturnValue(returnStatement: TS.ReturnStatement): string | undefined;

/** Checks whether a class member is static. */
export declare function isStaticMember(member: TS.ClassElement): boolean;

/** Checks for a well-known type initializer. */
export declare function isWellKnownType(node: TS.Node & { initializer?: TS.Expression }): boolean;

/** Checks for ignored or internal JSDoc markers. */
export declare function hasIgnoreJSDoc(node: TS.Node): boolean;

/** Checks for a self-bind call statement. */
export declare function isBindCall(statement: TS.ExpressionStatement): boolean;

/** Finds a declaration in a source file. */
export declare function getDeclarationInFile(nodeOrName: TS.Node | string, sourceFile?: TS.SourceFile): TS.Node | undefined;

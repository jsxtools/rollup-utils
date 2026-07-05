import type { CEM, Context, TS } from "../../../types.js";

/** Class declaration shape used during analyzer phases. */
export interface AnalyzerClassDeclaration extends CEM.ClassDeclaration {
	attributes: CEM.Attribute[];
	customElement?: true;
	cssParts: CEM.CssPart[];
	cssProperties: CEM.CssCustomProperty[];
	cssStates: CEM.CssCustomState[];
	demos?: CEM.Demo[];
	events: CEM.Event[];
	members: Array<CEM.ClassMember | CEM.CustomElementField>;
	slots: CEM.Slot[];
	tagName?: string;
}

/** Builds a class declaration from a TypeScript class node. */
export declare function createClass(node: TS.ClassDeclaration | TS.ClassExpression, moduleDoc: Partial<CEM.Module>, context: Context): AnalyzerClassDeclaration;

/** Adds constructor-assigned defaults to class fields. */
export declare function getDefaultValuesFromConstructorVisitor(source: TS.Node, classTemplate: AnalyzerClassDeclaration, context: Context): void;

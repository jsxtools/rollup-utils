import type { CEM, Context, TS } from "../../../types.js";
import type { AnalyzerClassDeclaration } from "./createClass.js";

/** Mixin declaration shape used during analyzer phases. */
export interface AnalyzerMixinDeclaration extends CEM.MixinDeclaration {
	attributes?: CEM.Attribute[];
	customElement?: true;
	cssParts?: CEM.CssPart[];
	cssProperties?: CEM.CssCustomProperty[];
	cssStates?: CEM.CssCustomState[];
	demos?: CEM.Demo[];
	events?: CEM.Event[];
	members?: Array<CEM.ClassMember | CEM.CustomElementField>;
	slots?: CEM.Slot[];
	tagName?: string;
}

/** Builds a mixin declaration from its function and class nodes. */
export declare function createMixin(
	mixinFunctionNode: TS.VariableStatement | TS.FunctionDeclaration | TS.ArrowFunction,
	mixinClassNode: TS.ClassDeclaration | TS.ClassExpression,
	moduleDoc: Partial<CEM.Module>,
	context: Context,
): AnalyzerMixinDeclaration;

/** Assigns a declaration name from its source node. */
export declare function handleName<T extends Partial<AnalyzerClassDeclaration | AnalyzerMixinDeclaration>>(mixin: T, node: TS.Node): T;

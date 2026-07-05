import type { CEM, Context, TS } from "../../../types.js";
import type { ModuleOrPackageReference } from "../../../utils/index.js";

/** Mutable declaration shapes accepted by creator helpers. */
export type MutableDoc = Partial<
	| CEM.Declaration
	| CEM.ClassMember
	| CEM.CustomElementField
	| CEM.Attribute
	| CEM.Event
	| CEM.Reference
	| CEM.Parameter
	| CEM.Slot
	| CEM.CssPart
	| CEM.CssCustomProperty
	| CEM.CssCustomState
>;

/** Adds TypeScript modifier metadata to a declaration. */
export declare function handleModifiers<T extends MutableDoc>(doc: T, node: TS.Node): T;

/** Adds JSDoc metadata to a declaration. */
export declare function handleJsDoc<T extends MutableDoc>(doc: T, node: TS.Node): T;

/** Builds a mixin reference for a class declaration. */
export declare function createClassDeclarationMixin(name: string, moduleDoc: Partial<CEM.Module>, context: Context): CEM.Reference;

/** Adds superclass and mixin heritage metadata. */
export declare function handleHeritage<T extends Partial<CEM.ClassDeclaration>>(
	classTemplate: T,
	moduleDoc: Partial<CEM.Module>,
	context: Context,
	node: TS.ClassDeclaration,
): T;

/** Adds @attr JSDoc metadata to an attribute. */
export declare function handleAttrJsDoc<T extends CEM.Attribute>(node: TS.Node, doc: T): T;

/** Infers type metadata from an initializer. */
export declare function handleTypeInference<T extends MutableDoc>(doc: T, node: TS.Node & { initializer?: TS.Expression }): T;

/** Adds well-known literal and namespace type metadata. */
export declare function handleWellKnownTypes<T extends MutableDoc>(doc: T, node: TS.Node & { initializer?: TS.Expression }): T;

/** Adds default metadata from an initializer expression. */
export declare function handleDefaultValue<T extends MutableDoc>(doc: T, node: TS.Node & { initializer?: TS.Expression }, expression?: TS.BinaryExpression): T;

/** Adds explicit TypeScript type metadata. */
export declare function handleExplicitType<T extends MutableDoc>(doc: T, node: TS.Node & { type?: TS.TypeNode; questionToken?: TS.QuestionToken }): T;

/** Adds private metadata for private class members. */
export declare function handlePrivateMember<T extends MutableDoc>(doc: T, node: TS.Node & { name?: TS.PropertyName | TS.PrivateIdentifier }): T;

/** Module or package reference metadata. */
export type { ModuleOrPackageReference };

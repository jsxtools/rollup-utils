import type { CEM } from "../types.js";

/** Gets manifest exports of a specific kind. */
export declare function getAllExportsOfKind<K extends CEM.Export["kind"]>(manifest: CEM.Package, kind: K): Extract<CEM.Export, { kind: K }>[];

/** Gets manifest declarations of a specific kind. */
export declare function getAllDeclarationsOfKind<K extends CEM.Declaration["kind"]>(manifest: CEM.Package, kind: K): Extract<CEM.Declaration, { kind: K }>[];

/** Gets the inheritance tree for a class-like declaration. */
export declare function getInheritanceTree(manifests: CEM.Package[], className: string): Array<CEM.ClassDeclaration | CEM.MixinDeclaration>;

/** Finds a module by path across manifests. */
export declare function getModuleFromManifests(manifests: CEM.Package[], modulePath: string): CEM.Module | undefined;

/** Finds the module path for a class-like declaration. */
export declare function getModuleForClassLike(manifests: CEM.Package[], className: string): string | undefined;

/** Finds a class member declaration by name. */
export declare function getClassMemberDoc(
	moduleDoc: Partial<CEM.Module>,
	className: string,
	memberName: string,
	isStatic?: boolean,
): CEM.ClassMember | undefined;

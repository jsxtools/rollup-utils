import type * as CEM from "custom-elements-manifest/schema.d.ts";
import type * as TS from "typescript";

/** Custom Elements Manifest and TypeScript namespaces. */
export type { CEM, TS };

/** Analyzer plugin or nested plugin collection. */
export type PluginOption = Plugin | Plugin[];

/** Analyzer plugin phase hooks. */
export interface Plugin {
	name: string;
	initialize?: (params: InitializeParams) => void;
	collectPhase?: (params: CollectPhaseParams) => void;
	analyzePhase?: (params: AnalyzePhaseParams) => void;
	moduleLinkPhase?: (params: ModuleLinkPhaseParams) => void;
	packageLinkPhase?: (params: PackageLinkPhaseParams) => void;
}

/** Initialize hook parameters. */
export interface InitializeParams extends PhaseParams {
	customElementsManifest: CEM.Package;
}

/** Collect-phase hook parameters. */
export interface CollectPhaseParams extends PhaseParams {
	node: TS.Node;
}

/** Analyze-phase hook parameters. */
export interface AnalyzePhaseParams extends PhaseParams {
	node: TS.Node;
	moduleDoc: Partial<CEM.Module>;
}

/** Module-link-phase hook parameters. */
export interface ModuleLinkPhaseParams extends PhaseParams {
	moduleDoc: CEM.Module;
}

/** Package-link-phase hook parameters. */
export interface PackageLinkPhaseParams extends Omit<PhaseParams, "ts"> {
	customElementsManifest: CEM.Package;
}

/** Shared analyzer phase parameters. */
export interface PhaseParams {
	ts: typeof import("typescript");
	context: Context;
}

/** Shared mutable analyzer context. */
export interface Context extends Record<string, unknown> {}

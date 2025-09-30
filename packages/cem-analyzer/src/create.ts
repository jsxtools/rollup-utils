import type * as CEM from "custom-elements-manifest/schema.d.ts"
import type * as TS from "typescript"

export type { CEM, TS }

export declare function create(options: CreateOptions): CEM.Package

export interface CreateOptions {
	modules: TS.SourceFile[]
	plugins?: PluginOption[]
	context?: Context
}

export type PluginOption = Plugin | Plugin[]

export interface Plugin {
	name: string
	initialize?: (params: InitializeParams) => void
	collectPhase?: (params: CollectPhaseParams) => void
	analyzePhase?: (params: AnalyzePhaseParams) => void
	moduleLinkPhase?: (params: ModuleLinkPhaseParams) => void
	packageLinkPhase?: (params: PackageLinkPhaseParams) => void
}

export interface InitializeParams extends PhaseParams {
	customElementsManifest: CEM.Package
}

export interface CollectPhaseParams extends PhaseParams {
	node: TS.Node
}

export interface AnalyzePhaseParams extends PhaseParams {
	node: TS.Node
	moduleDoc: Partial<CEM.Module>
}

export interface ModuleLinkPhaseParams extends PhaseParams {
	moduleDoc: CEM.Module
}

export interface PackageLinkPhaseParams extends Omit<PhaseParams, "ts"> {
	customElementsManifest: CEM.Package
}

export interface PhaseParams {
	ts: typeof import("typescript")
	context: Context
}

export interface Context extends Record<string, unknown> {}

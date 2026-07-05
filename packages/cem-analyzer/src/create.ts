import type { CEM, Context, PluginOption, TS } from "./types.js";

/** Options passed to create(). */
export interface CreateOptions {
	modules: TS.SourceFile[];
	plugins?: PluginOption[];
	context?: Context;
}

/** Creates a Custom Elements Manifest from TypeScript source files. */
export declare function create(options: CreateOptions): CEM.Package;

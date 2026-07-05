import type { TS } from "@jsxtools/cem-analyzer/types";
import { getDirs } from "@jsxtools/rollup-plugin-utils/options";
import type { Plugin, RollupOptions } from "rollup";
import { CemAPI, type CemOptions } from "./cem-api.js";

export const rollupPluginCem = (pluginOptions?: CemOptions): CompatiblePlugin => {
	const api = new CemAPI();

	let initialized = false;

	const plugin = {
		name: "rollup-plugin-cem",
		options(options: RollupOptions): RollupOptions {
			if (!initialized) {
				api.init({
					...getDirs(options),
					...pluginOptions,
				});

				initialized = true;
			}

			return options;
		},
		generateBundle(): void {
			api.clearModules();

			for (const id of this.getModuleIds()) {
				const tscMeta = this.getModuleInfo(id)?.meta?.tsc as TscModuleMeta | undefined;
				const sourceFile = tscMeta?.sourceFile;

				if (sourceFile) {
					api.addModule(sourceFile);
				}
			}
		},
		async writeBundle(): Promise<void> {
			await api.updateManifest();
		},
	} satisfies Plugin;

	return plugin;
};

interface CompatiblePlugin {
	name: string;
}

interface TscModuleMeta {
	program?: TS.Program;
	sourceFile?: TS.SourceFile;
	typeChecker?: TS.TypeChecker;
}

export { catalystPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst/catalyst";
export { catalystPlugin2 } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst-major-2/catalyst";
export { fastPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/fast/fast";
export { litPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/lit/lit";
export { stencilPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/stencil/stencil";
export type { CemOptions };

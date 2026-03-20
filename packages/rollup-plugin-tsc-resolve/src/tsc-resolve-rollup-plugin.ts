import type * as Rollup from "rollup";
import { TscResolveAPI, type TscResolveOptions } from "./tsc-resolve-api.js";

export function rollupPluginTscResolve(pluginOptions?: TscResolveOptions): Rollup.Plugin {
	const resolve = new TscResolveAPI();
	const rollup = {
		/** Whether this is the first run. */
		firstRun: true,
	};

	return {
		name: "rollup-plugin-tsc-resolve",
		buildStart(): void {
			if (rollup.firstRun) {
				resolve.init(pluginOptions);
			}
		},
		resolveId(id, importer): Rollup.ResolveIdResult {
			if (!importer) {
				return;
			}

			const resolvedFileName = resolve.resolve(id, importer);

			if (resolvedFileName) {
				return resolvedFileName;
			}
		},
		generateBundle(): Promise<void> | void {
			rollup.firstRun = false;
		},
	};
}

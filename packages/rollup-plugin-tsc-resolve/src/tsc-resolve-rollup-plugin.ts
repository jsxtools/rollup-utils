import type * as Rollup from "rollup";
import { TscResolveAPI, type TscResolveOptions } from "./tsc-resolve-api.js";

export function rollupPluginTscResolve(pluginOptions?: TscResolveOptions): CompatiblePlugin {
	const resolve = new TscResolveAPI();
	const rollup = {
		/** Whether this is the first run. */
		firstRun: true,
	};

	const plugin = {
		name: "rollup-plugin-tsc-resolve",
		buildStart(): void {
			if (rollup.firstRun) {
				resolve.init(pluginOptions);
				rollup.firstRun = false;
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
	} satisfies Rollup.Plugin;

	return plugin;
}

interface CompatiblePlugin {
	name: string;
}

import { getDirs } from "@jsxtools/rollup-plugin-utils/options";
import type * as Rollup from "rollup";
import { CopyAPI, type CopyOptions } from "./copy-api.js";

export const rollupPluginCopy = (pluginOptions?: CopyOptions): CompatiblePlugin => {
	const copy = new CopyAPI();
	const rollup = {
		/** Whether this is the first run. */
		firstRun: true,

		/** Whether this is a watch run. */
		watchRun: false,

		/** Deferred promise used to optimize async operations. */
		deferred: Promise.resolve(),
	};

	const plugin = {
		name: "rollup-plugin-copy",
		options(options: Rollup.RollupOptions): Rollup.RollupOptions {
			if (rollup.firstRun) {
				copy.init({
					...getDirs(options),
					...pluginOptions,
				});

				rollup.deferred = rollup.deferred.then(() => copy.loadCache());
			}

			return options;
		},
		buildStart(): void | Promise<void> {
			if (rollup.firstRun || rollup.watchRun) {
				rollup.deferred = rollup.deferred.then(() => copy.updateCache());

				return rollup.deferred;
			}
		},
		generateBundle(): void {
			if (this.meta.watchMode) {
				this.addWatchFile(copy.cacheFile);

				for (const fileName of copy.sourceFiles) {
					this.addWatchFile(fileName);
				}
			}
		},
		writeBundle(): Promise<void> | void {
			if (rollup.firstRun || rollup.watchRun) {
				rollup.firstRun = false;
				rollup.watchRun = false;

				rollup.deferred = rollup.deferred.then(() => copy.saveCache());

				return rollup.deferred;
			}
		},
		watchChange(id): void {
			if (id === copy.cacheFile || copy.hasSourceFile(id)) {
				rollup.watchRun = true;
			}
		},
	} satisfies Rollup.Plugin;

	return plugin;
};

interface CompatiblePlugin {
	name: string;
}

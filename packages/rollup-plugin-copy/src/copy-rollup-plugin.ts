import { getDirs } from "@jsxtools/rollup-plugin-utils/options"
import { VirtualAsset } from "@jsxtools/rollup-plugin-utils/virtual-asset"
import type * as Rollup from "rollup"
import { CopyAPI, type CopyOptions } from "./copy-api.js"

export const rollupPluginCopy = (pluginOptions?: CopyOptions): Rollup.Plugin => {
	const copy = new CopyAPI()
	const virtualAsset = new VirtualAsset("rollup-plugin-copy")
	const rollup = {
		/** Whether this is the first run. */
		firstRun: true,

		/** Whether this is a watch run. */
		watchRun: false,

		/** Code for the virtual entry point. */
		codeForVirtualId: "export let _",

		/** Deferred promise used to optimize async operations. */
		deferred: Promise.resolve(),
	}

	return {
		name: "rollup-plugin-copy",
		options(options: Rollup.RollupOptions): Rollup.RollupOptions {
			if (rollup.firstRun) {
				copy.init({
					...getDirs(options),
					...pluginOptions,
				})

				rollup.deferred = rollup.deferred.then(() => copy.loadCache())
			}

			virtualAsset.options(options)

			return options
		},
		buildStart(): void | Promise<void> {
			if (rollup.firstRun || rollup.watchRun) {
				rollup.deferred = rollup.deferred.then(() => copy.updateCache())

				return rollup.deferred
			}
		},
		resolveId(id): Rollup.ResolveIdResult {
			// conditionally return virtual module source
			if (id === virtualAsset.virtualId) {
				return { id }
			}
		},
		load(id): Rollup.LoadResult {
			// conditionally return virtual module source
			if (id === virtualAsset.virtualId) {
				return {
					code: rollup.codeForVirtualId,
				}
			}
		},
		generateBundle(options, bundle): void {
			virtualAsset.generateBundle(options, bundle)

			if (this.meta.watchMode) {
				this.addWatchFile(copy.cacheFile)
			}
		},
		writeBundle(): Promise<void> | void {
			if (rollup.firstRun || rollup.watchRun) {
				rollup.firstRun = false
				rollup.watchRun = false

				rollup.deferred = rollup.deferred.then(() => copy.saveCache())

				return rollup.deferred
			}
		},
		watchChange(id): void {
			if (id === copy.cacheFile) {
				rollup.watchRun = true
			}
		},
	}
}

import { getDirs } from "@jsxtools/rollup-plugin-utils/options"
import { VirtualAsset } from "@jsxtools/rollup-plugin-utils/virtual-asset"
import type * as Rollup from "rollup"
import { CopyAPI, type CopyOptions } from "./copy-api.js"

export const rollupPluginCopy = (pluginOptions?: CopyOptions): Rollup.Plugin => {
	const copy = new CopyAPI()
	const virtualAsset = new VirtualAsset("rollup-plugin-copy")

	let deferred = Promise.resolve()
	let firstRun = true
	let watchRun = false

	return {
		name: "rollup-plugin-copy",
		options(options: Rollup.RollupOptions): Rollup.RollupOptions {
			if (firstRun) {
				copy.init({
					...getDirs(options),
					...pluginOptions,
				})

				deferred = deferred.then(() => copy.loadCache())
			}

			return options
		},
		buildStart(options: Rollup.NormalizedInputOptions): void {
			if (firstRun || watchRun) {
				deferred = deferred.then(() => copy.updateCache())
			}

			virtualAsset.buildStart(this, options)
		},
		resolveId(id, importer, options): Rollup.ResolveIdResult {
			return virtualAsset.resolveId(this, id, importer, options)
		},
		load(id): Rollup.LoadResult {
			return virtualAsset.load(this, id)
		},
		generateBundle(options, bundle): void {
			virtualAsset.generateBundle(this, options, bundle)
		},
		writeBundle(): Promise<void> | void {
			if (firstRun || watchRun) {
				firstRun = false
				watchRun = false

				if (this.meta.watchMode) {
					this.addWatchFile(copy.cacheFile)
				}

				deferred = deferred.then(() => copy.saveCache())

				return deferred
			}
		},
		watchChange(id): void {
			if (id === copy.cacheFile) {
				watchRun = true
			}
		},
	}
}

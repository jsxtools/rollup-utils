import { VirtualAsset } from "@jsxtools/rollup-plugin-utils/virtual-asset"
import type { LoadResult, NormalizedInputOptions, Plugin, ResolveIdResult } from "rollup"
import { CopyAPI, type CopyOptions } from "./copy-api.js"

export const rollupPluginCopy = (pluginOptions?: CopyOptions): Plugin => {
	const copy = new CopyAPI()
	const virtualAsset = new VirtualAsset("rollup-plugin-copy")

	let firstRun = true
	let watchRun = false

	return {
		name: "rollup-plugin-copy",
		async buildStart(options: NormalizedInputOptions): Promise<void> {
			if (firstRun) {
				copy.init(pluginOptions)

				await copy.loadConfig()
			}

			if (firstRun || watchRun) {
				await copy.captureWatchedFiles()
			}

			virtualAsset.buildStart(this, options)

			await copy.captureChangedFiles()

			for (const changedFile of copy.changedFiles) {
				this.emitFile({
					type: "asset",
					fileName: copy.getRelativePath(changedFile, copy.rootDir),
					needsCodeReference: false,
					originalFileName: copy.getAbsolutePath(changedFile, copy.workDir),
					source: await copy.getFileContent(changedFile),
				})
			}

			// Clear file contents cache to free memory after emitting all files
			copy.clearFileContentsCache()

			if (this.meta.watchMode) {
				for (const watchedFile of copy.watchedFiles) {
					this.addWatchFile(watchedFile)
				}
			}
		},
		resolveId(id, importer, options): ResolveIdResult {
			return virtualAsset.resolveId(this, id, importer, options)
		},
		load(id): LoadResult {
			return virtualAsset.load(this, id)
		},
		generateBundle(options, bundle): void {
			firstRun = false
			watchRun = false

			virtualAsset.generateBundle(this, options, bundle)
		},
		async writeBundle(): Promise<void> {
			if (copy.changedFiles.length > 0) {
				await copy.saveConfig().catch((error) => {
					this.warn(`Failed to save asset cache: ${error}`)
				})
			}
		},
		watchChange(id): void {
			if (copy.watchedFiles.includes(id)) {
				watchRun = true
			}
		},
	}
}

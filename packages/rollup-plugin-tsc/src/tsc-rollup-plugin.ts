import { VirtualAsset } from "@jsxtools/rollup-plugin-utils/virtual-asset"
import type { LoadResult, Plugin, ResolveIdResult } from "rollup"
import { type SourceFile, TscAPI, type TscApiOptions } from "./tsc-api.js"

export function rollupPluginTsc(pluginOptions?: TscApiOptions): Plugin {
	const tsc = new TscAPI()

	const virtualAsset = new VirtualAsset("rollup-plugin-tsc", {
		load() {
			const compiledSources = [...tsc.compiledSource.keys()]

			const code = compiledSources.map((file, i) => `import * as mod${i} from ${JSON.stringify(file)}`).join(";")

			return {
				code,
			}
		},
	})

	let firstRun = true
	let watchRun = false

	return {
		name: "rollup-plugin-tsc",
		buildStart(options): void {
			if (firstRun) {
				tsc.init(pluginOptions)
			}

			if (firstRun || watchRun) {
				tsc.emit()

				// Create map of ids to SourceFiles
				const sourceFileMap = new Map<string, SourceFile>()
				for (const [id, compiledSource] of tsc.compiledSource) {
					sourceFileMap.set(id, compiledSource.tsf)
				}

				// Namespace under plugin name to avoid conflicts
				Reflect.set(this.meta, "rollupPluginTsc", {
					sourceFileMap,
				})
			}

			virtualAsset.buildStart(this, options)

			if (this.meta.watchMode) {
				for (const sourceFile of tsc.program.getProgram().getSourceFiles()) {
					this.addWatchFile(sourceFile.fileName)
				}
			}
		},
		resolveId(id, importer, options): ResolveIdResult {
			const virtualResult = virtualAsset.resolveId(this, id, importer, options)

			if (virtualResult) {
				return virtualResult
			}

			if (tsc.compiledSource.has(id) || tsc.emitableSource.has(id)) {
				return { id }
			}

			if (importer && tsc.compiledSource.has(importer)) {
				return { id, external: true }
			}

			return null
		},
		load(id): LoadResult {
			const virtualResult = virtualAsset.load(this, id)

			if (virtualResult) {
				return virtualResult
			}

			const result = tsc.compiledSource.get(id)

			if (result) {
				if (result.dts) {
					this.emitFile({
						type: "asset",
						fileName: result.dts.name,
						source: result.dts.code,
					})
				}

				return {
					code: result.jsc.code,
					map: result.map.code,
					moduleSideEffects: false,

					// attach the TypeScript SourceFile for other plugins to use
					meta: {
						tsc: {
							sourceFile: result.tsf,
						},
					},
				}
			}

			if (tsc.emitableSource.has(id)) {
				return {
					code: `export default ${JSON.stringify(tsc.emitableSource.get(id))}`,
				}
			}

			return null
		},
		generateBundle(_options, bundle): void {
			firstRun = false
			watchRun = false

			virtualAsset.generateBundle(this, _options, bundle)
		},
		async writeBundle(): Promise<void> {
			tsc.writeEmitableAssets()
		},
		watchChange(id, event): void {
			if (tsc.config.fileNames.includes(id)) {
				if (event.event === "update") {
					watchRun = true
				}
			}
		},
	}
}

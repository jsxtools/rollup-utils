import { VirtualAsset } from "@jsxtools/rollup-plugin-utils/virtual-asset"
import type * as Rollup from "rollup"
import * as ts from "typescript"
import { type CompiledSource, type Source, TscAPI, type TscApiOptions } from "./tsc-api.js"

export function rollupPluginTsc(pluginOptions?: TscApiOptions): Rollup.Plugin {
	const virtualAsset = new VirtualAsset("rollup-plugin-tsc")

	const tsc = new TscAPI()

	const rollup = {
		/** Whether this is the first run. */
		firstRun: true,

		/** Whether this is a watch run. */
		watchRun: false,

		/** Code for the virtual entry point. */
		codeForVirtualId: "export let _",

		/** Emit a source file to the rollup pipeline if it exists. */
		emitFileFromSource(context: Rollup.PluginContext, source: Source): string {
			return context.emitFile({
				type: "asset",
				fileName: source.name,
				source: source.code,
			})
		},

		/** Returns the code for the virtual entry point. */
		getSourceForVirtualId(): string {
			return Array.from(tsc.compiledSource, ([path, compiledSource], index) => {
				if (compiledSource.js) {
					return `import * as mod${index} from ${JSON.stringify(path)}`
				}

				return ""
			}).join(";")
		},

		/** Return the load result for the compiled source. */
		getResultFromCompiledSource(
			context: Rollup.PluginContext,
			compiled: CompiledSource,
		): Rollup.SourceDescription | null {
			// emit d.ts file
			if (compiled.dts) {
				rollup.emitFileFromSource(context, compiled.dts)
			}

			// emit d.ts.map file
			if (compiled.dtsMap) {
				rollup.emitFileFromSource(context, compiled.dtsMap)
			}

			// emit js.map (if js source is not available)
			if (compiled.jsMap && !compiled.js) {
				rollup.emitFileFromSource(context, compiled.jsMap)
			}

			// return js source (if it is available)
			if (compiled.js) {
				return {
					code: compiled.js.code,
					map: compiled.jsMap?.code,
					moduleSideEffects: false,

					// attach TypeScript SourceFile for other plugins to use
					meta: {
						tsc: {
							sourceFile: compiled.sourceFile,
						},
					},
				}
			}

			return null
		},
	}

	return {
		name: "rollup-plugin-tsc",
		options(options: Rollup.RollupOptions) {
			virtualAsset.options(options)
		},
		buildStart(): void {
			if (rollup.firstRun) {
				tsc.init(pluginOptions)
			}

			if (rollup.firstRun || rollup.watchRun) {
				tsc.emit()

				// Surface TypeScript diagnostics as errors
				for (const diagnostic of tsc.diagnostics) {
					const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
					const location =
						diagnostic.file && diagnostic.start
							? {
									file: diagnostic.file.fileName,
									line: diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1,
									column:
										diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).character + 1,
								}
							: undefined

					this.error({
						message,
						loc: location,
					});
				}

				rollup.codeForVirtualId = rollup.getSourceForVirtualId()
			}

			if (this.meta.watchMode) {
				for (const sourceFile of tsc.program.getProgram().getSourceFiles()) {
					this.addWatchFile(sourceFile.fileName)
				}
			}
		},
		resolveId(id, importer): Rollup.ResolveIdResult {
			// conditionally resolve virtual entry point
			if (id === virtualAsset.virtualId) {
				return { id }
			}

			// conditionally resolve compiled source
			if (tsc.compiledSource.get(id)?.js !== undefined || tsc.emitableSource.has(id)) {
				return { id }
			}

			// conditionally resolve external source
			if (tsc.compiledSource.has(id) || tsc.compiledSource.has(importer as string)) {
				return { id, external: true }
			}
		},
		load(id): Rollup.LoadResult {
			// conditionally return virtual module source
			if (id === virtualAsset.virtualId) {
				return {
					code: rollup.codeForVirtualId,
				}
			}

			// conditionally return emitable source
			if (tsc.emitableSource.has(id)) {
				return {
					code: `export default ${JSON.stringify(tsc.emitableSource.get(id))}`,
				}
			}

			/** Compiled source for the module id. */
			const compiled = tsc.compiledSource.get(id)

			// conditionally return compiled source
			if (compiled) {
				return rollup.getResultFromCompiledSource(this, compiled)
			}
		},
		generateBundle(options, bundle): void {
			rollup.firstRun = false
			rollup.watchRun = false

			virtualAsset.generateBundle(options, bundle)
		},
		writeBundle(): void {
			tsc.writeEmitableAssets()
		},
		watchChange(id, event): void {
			if (tsc.config.fileNames.includes(id)) {
				if (event.event === "update") {
					rollup.watchRun = true
				}
			}
		},
	}
}

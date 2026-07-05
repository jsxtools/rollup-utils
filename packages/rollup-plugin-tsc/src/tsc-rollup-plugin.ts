import { toDirPath, toPath } from "@jsxtools/rollup-plugin-utils/path";
import type * as Rollup from "rollup";
import * as ts from "typescript";
import { type CompiledSource, type Source, TscAPI, type TscApiOptions } from "./tsc-api.js";

export function rollupPluginTsc(pluginOptions?: TscApiOptions): CompatiblePlugin {
	const tsc = new TscAPI();

	const rollup = {
		/** Whether this is the first run. */
		firstRun: true,

		/** Whether this is a watch run. */
		watchRun: false,

		/** Whether TypeScript has been initialized. */
		initialized: false,

		/** Source ids already provided to the bundler as real inputs. */
		inputSourceIds: new Set<string>(),

		/** Initialize TypeScript once. */
		init(): void {
			if (!this.initialized) {
				tsc.init(pluginOptions);
				this.initialized = true;
			}
		},

		/** Ensure Rollup has a real TypeScript input to start from. */
		assignInput(options: Rollup.RollupOptions): void {
			this.inputSourceIds.clear();

			if (hasInput(options.input)) {
				this.addInputSourceIds(options.input);

				return;
			}

			const sourceFileName = tsc.sourceFileNames.find((fileName) => tsc.getJsOutputName(fileName));
			const jsOutputName = sourceFileName && tsc.getJsOutputName(sourceFileName);

			if (sourceFileName && jsOutputName) {
				this.inputSourceIds.add(sourceFileName);

				options.input = {
					[jsOutputName.replace(/\.[^/.]+$/, "")]: sourceFileName,
				};
			}
		},

		/** Track user-provided source inputs so they are not emitted twice. */
		addInputSourceIds(input: NonNullable<Rollup.RollupOptions["input"]>): void {
			for (const sourceFileName of getInputValues(input)) {
				this.inputSourceIds.add(toPath(sourceFileName));
			}
		},

		/** Emit a source file to the rollup pipeline if it exists. */
		emitFileFromSource(context: Rollup.PluginContext, source: Source): string {
			return context.emitFile({
				type: "asset",
				fileName: source.name,
				source: source.code,
			});
		},

		/** Emit every compiled JavaScript source as a chunk entry. */
		emitCompiledChunks(context: Rollup.PluginContext): void {
			for (const [id, compiled] of tsc.compiledSources()) {
				if (compiled.js && !this.inputSourceIds.has(id)) {
					context.emitFile({
						type: "chunk",
						id,
						fileName: compiled.js.name,
						preserveSignature: "strict",
					});
				}
			}
		},

		/** Return the load result for the compiled source. */
		getResultFromCompiledSource(context: Rollup.PluginContext, compiled: CompiledSource): Rollup.SourceDescription | null {
			// emit d.ts file
			if (compiled.dts) {
				rollup.emitFileFromSource(context, compiled.dts);
			}

			// emit d.ts.map file
			if (compiled.dtsMap) {
				rollup.emitFileFromSource(context, compiled.dtsMap);
			}

			// emit js.map (if js source is not available)
			if (compiled.jsMap && !compiled.js) {
				rollup.emitFileFromSource(context, compiled.jsMap);
			}

			// return js source (if it is available)
			if (compiled.js) {
				return {
					code: compiled.js.code,
					map: compiled.jsMap?.code,
					moduleSideEffects: false,

					// attach TypeScript program metadata for other plugins to use
					meta: {
						tsc: {
							program: tsc.program,
							sourceFile: compiled.sourceFile,
							typeChecker: tsc.typeChecker,
						},
					},
				};
			}

			return null;
		},

		/** Surface TypeScript diagnostics with TypeScript emit defaults. */
		reportDiagnostics(context: Rollup.PluginContext): void {
			for (const diagnostic of tsc.diagnostics) {
				const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
				const location =
					diagnostic.file && diagnostic.start !== undefined
						? {
								file: diagnostic.file.fileName,
								line: diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1,
								column: diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).character + 1,
							}
						: undefined;
				const log = {
					message,
					loc: location,
				};

				if (tsc.emitSkipped) {
					context.error(log);
				} else {
					context.warn(log);
				}
			}
		},

		/** Validate that Rollup output is aligned with TypeScript outDir. */
		validateOutputDir(context: Rollup.PluginContext, options: Rollup.NormalizedOutputOptions): void {
			if (!options.dir) {
				context.error("rollup-plugin-tsc requires output.dir to match TypeScript compilerOptions.outDir.");
			}

			const outputDir = toDirPath(options.dir);

			if (outputDir !== tsc.distDir) {
				context.error(
					`rollup-plugin-tsc expected output.dir to match TypeScript outDir. Expected ${JSON.stringify(tsc.distDir)}, received ${JSON.stringify(outputDir)}.`,
				);
			}
		},
	};

	const plugin = {
		name: "rollup-plugin-tsc",
		options(this: Rollup.MinimalPluginContext, options: Rollup.RollupOptions): Rollup.RollupOptions {
			if (!isViteContext(this)) {
				rollup.init();
				rollup.assignInput(options);
			}

			return options;
		},
		buildStart(): void {
			rollup.init();

			if (rollup.firstRun || rollup.watchRun) {
				tsc.emit();

				rollup.reportDiagnostics(this);
			}

			rollup.emitCompiledChunks(this);

			if (this.meta.watchMode) {
				for (const fileName of tsc.getWatchFiles()) {
					this.addWatchFile(fileName);
				}
			}
		},
		resolveId(id, importer): Rollup.ResolveIdResult {
			// conditionally resolve compiled source
			if (tsc.hasCompiledJs(id) || tsc.hasEmitableSource(id)) {
				return { id };
			}

			// conditionally resolve external source
			if (tsc.hasCompiledSource(id) || tsc.hasCompiledSource(importer as string)) {
				return { id, external: true };
			}
		},
		load: withFilter(
			{
				handler(this: Rollup.PluginContext, id): Rollup.LoadResult {
					// conditionally return emitable source
					const emitableSource = tsc.getEmitableSource(id);

					if (emitableSource !== undefined) {
						return {
							code: `export default ${JSON.stringify(emitableSource)}`,
						};
					}

					/** Compiled source for the module id. */
					const compiled = tsc.getCompiledSource(id);

					// conditionally return compiled source
					if (compiled) {
						return rollup.getResultFromCompiledSource(this, compiled);
					}
				},
			},
			{ id: sourceIdFilter },
		),
		generateBundle(options): void {
			rollup.validateOutputDir(this, options);

			rollup.firstRun = false;
			rollup.watchRun = false;
		},
		writeBundle(): void {
			tsc.writeEmitableAssets();
		},
		watchChange(id, event): void {
			if (tsc.hasSourceFile(id) || tsc.hasWatchFile(id)) {
				if (event.event === "delete") {
					tsc.deleteOutputsForSource(id);
				}

				rollup.watchRun = true;
			}
		},
	} satisfies Rollup.Plugin;

	return plugin;
}

Object.assign(rollupPluginTsc, {
	getOutputOptions: TscAPI.getOutputOptions,
});

export declare namespace rollupPluginTsc {
	export const getOutputOptions: typeof TscAPI.getOutputOptions;
}

interface CompatiblePlugin {
	name: string;
}

interface VitePluginContext {
	meta?: {
		rollupVersion?: string;
		viteVersion?: string;
		watchMode?: boolean;
	};
}

const isViteContext = (context: VitePluginContext): boolean => Boolean(context.meta?.viteVersion);

const sourceIdFilter = /\.(?:[cm]?[jt]sx?|json)$/;

const withFilter = <Hook extends object>(hook: Hook, filter: unknown): Hook => Object.assign(hook, { filter });

const getInputValues = (input: NonNullable<Rollup.RollupOptions["input"]>): string[] =>
	Array.isArray(input) ? input : typeof input === "string" ? [input] : Object.values(input);

const hasInput = (input: Rollup.RollupOptions["input"]): input is NonNullable<Rollup.RollupOptions["input"]> =>
	typeof input === "string" || (Array.isArray(input) ? input.length > 0 : Boolean(input && Object.keys(input).length));

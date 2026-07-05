import * as array from "@jsxtools/rollup-plugin-utils/array";
import * as path from "@jsxtools/rollup-plugin-utils/path";
import * as ts from "typescript";

export class TscAPI {
	static getOutputOptions(options?: TscOutputOptionsInit): TscOutputOptions {
		const api = new TscAPI();
		const compilerOptions = { ...options?.compilerOptions };

		if (options?.outDir) {
			compilerOptions.outDir = options.outDir;
		}

		if (options?.tsBuildInfoFile) {
			compilerOptions.tsBuildInfoFile = options.tsBuildInfoFile;
		}

		api.init({ ...options, compilerOptions });

		const outDir = toConfigPath(api.#distDir, api.#workDir);
		const tsBuildInfoFilePath = api.#config.options.tsBuildInfoFile && path.toPath(api.#config.options.tsBuildInfoFile);
		const tsBuildInfoFile = tsBuildInfoFilePath && toConfigPath(tsBuildInfoFilePath, api.#workDir);

		return {
			outDir,
			outDirPath: api.#distDir,
			tsBuildInfoFile,
			tsBuildInfoFilePath,
			compilerOptions: { ...options?.compilerOptions, outDir, ...(tsBuildInfoFile ? { tsBuildInfoFile } : null) },
			rollupOutput: { dir: outDir },
			viteBuild: { outDir },
		};
	}

	#affectedSourceFileNames = new Set<string>();
	#builder?: ts.EmitAndSemanticDiagnosticsBuilderProgram;
	#compiledSource = new Map<string, CompiledSource>();
	#config: ts.ParsedCommandLine = { errors: [], fileNames: [], options: {} };
	#configFile = path.toPath(Default.WorkDir, Default.ConfigFile);
	#customTransformers: ts.CustomTransformers = {};
	#diagnostics: ts.Diagnostic[] = [];
	#diagnosticsMode: TscDiagnosticsMode = true;
	#distDir = path.toDirPath(Default.WorkDir, Default.RootDir);
	#emitableAssets = new Map<string, string>();
	#emitableSource = new Map<string, string>();
	#emittedAssetCache = new Map<string, string>();
	#host?: ts.CompilerHost;
	#outputFileNames = new Map<string, readonly string[]>();
	#program?: ts.Program;
	#result: ts.EmitResult = { emitSkipped: true, diagnostics: [], emittedFiles: [] };
	#rootDir = path.toDirPath(Default.WorkDir, Default.RootDir);
	#semanticDiagnostics = new Map<string, readonly ts.Diagnostic[]>();
	#solutionBuilder?: ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>;
	#solutionDiagnostics: ts.Diagnostic[] = [];
	#sourceFileNameSet = new Set<string>();
	#sourcesResetThisEmit = new Set<string>();
	#syntacticDiagnostics = new Map<string, readonly ts.Diagnostic[]>();
	#watchFiles = new Set<string>();
	#workDir = path.toDirPath(Default.WorkDir);

	get diagnostics(): readonly ts.Diagnostic[] {
		return this.#diagnostics;
	}

	get distDir(): string {
		return this.#distDir;
	}

	get emitSkipped(): boolean {
		return this.#result.emitSkipped;
	}

	get sourceFileNames(): readonly string[] {
		return this.#config.fileNames;
	}

	get program(): ts.Program {
		if (!this.#program) {
			this.init();

			this.#program = ts.createProgram({
				configFileParsingDiagnostics: this.#config.errors,
				options: this.#config.options,
				projectReferences: this.#config.projectReferences,
				rootNames: this.#config.fileNames,
			});
		}

		return this.#program;
	}

	get typeChecker(): ts.TypeChecker {
		return this.program.getTypeChecker();
	}

	init(options?: TscApiOptions): void {
		this.#workDir = path.toDirPath(options?.workDir ?? Default.WorkDir);

		const configFile = this.#getConfigFile(options?.configFile ?? Default.ConfigFile);
		const configData = { ...ts.readConfigFile(configFile, ts.sys.readFile).config };

		if (Array.isArray(options?.include)) {
			configData.include = array.merge(configData.include, options.include);
		}

		if (Array.isArray(options?.exclude)) {
			configData.exclude = array.merge(configData.exclude, options.exclude);
		}

		if (Array.isArray(options?.references)) {
			configData.references = array.merge(configData.references, options.references);
		}

		configData.compilerOptions = { ...configData.compilerOptions, ...options?.compilerOptions };

		this.#configFile = configFile;
		this.#config = ts.parseJsonConfigFileContent(configData, ts.sys, ts.getDirectoryPath(configFile), undefined, configFile);
		this.#customTransformers = copyCustomTransformers(options?.customTransformers);
		this.#diagnosticsMode = options?.diagnostics ?? !this.#config.options.noCheck;
		this.#rootDir = ts.getCommonSourceDirectory(this.#config.options, () => this.#config.fileNames, ts.getDirectoryPath(configFile), String);
		this.#distDir = path.toDirPath(this.#config.options.outDir ?? this.#workDir ?? this.#rootDir);
		this.#outputFileNames.clear();
		this.#program = undefined;
		this.#sourceFileNameSet = new Set(this.#config.fileNames);
	}

	compiledSources(): IterableIterator<[string, CompiledSource]> {
		return this.#compiledSource.entries();
	}

	deleteOutputsForSource(fileName: string): void {
		this.#compiledSource.delete(fileName);
		this.#emitableSource.delete(fileName);
		this.#semanticDiagnostics.delete(fileName);
		this.#syntacticDiagnostics.delete(fileName);

		for (const outputFileName of this.#getKnownOutputFileNames(fileName)) {
			this.#emittedAssetCache.delete(outputFileName);

			ts.sys.deleteFile?.(outputFileName);
		}
	}

	emit(): boolean {
		const fullEmit = !this.#builder;

		this.#buildProjectReferences();

		this.#host ??= ts.createIncrementalCompilerHost(this.#config.options);
		this.#builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
			this.#config.fileNames,
			this.#config.options,
			this.#host,
			this.#builder,
			this.#config.errors,
			this.#config.projectReferences,
		);
		this.#program = this.#builder.getProgram();
		this.#distDir = path.toDirPath(this.#builder.getCompilerOptions().outDir ?? this.#workDir ?? this.#rootDir);

		this.#resetEmitState(fullEmit);

		const emitResults: ts.EmitResult[] = [];

		let affected: ts.AffectedFileResult<ts.EmitResult>;

		while ((affected = this.#builder.emitNextAffectedFile(this.#writeFile, undefined, undefined, this.#customTransformers))) {
			emitResults.push(affected.result);

			this.#addAffectedSourceFiles(affected.affected);
		}

		this.#result = getEmitResult(emitResults);

		if (!fullEmit) {
			for (const sourceFileName of this.#affectedSourceFileNames) {
				this.#resetSource(sourceFileName);
			}
		}

		this.#loadEmittedFilesFromDisk(fullEmit ? this.#config.fileNames : this.#affectedSourceFileNames);

		this.#diagnostics = this.#collectDiagnostics(fullEmit ? undefined : this.#affectedSourceFileNames);

		this.#refreshWatchFiles();

		return !this.#result.emitSkipped;
	}

	getCompiledSource(fileName: string): CompiledSource | undefined {
		return this.#compiledSource.get(fileName);
	}

	getSourceFile(fileName: string): SourceFile | undefined {
		return this.program?.getSourceFile(fileName);
	}

	getSourceFiles(): SourceFile[] {
		const program = this.program;

		return program ? this.#config.fileNames.flatMap((fileName) => program.getSourceFile(fileName) ?? []) : [];
	}

	getEmitableSource(fileName: string): string | undefined {
		return this.#emitableSource.get(fileName);
	}

	getJsOutputName(sourceFileName: string): string | undefined {
		const outputFileName = this.#getOutputFileNames(sourceFileName).find((fileName) => fileName.endsWith(".js"));

		return outputFileName && path.toRelativePath(outputFileName, this.#distDir, { explicit: false });
	}

	getWatchFiles(): Iterable<string> {
		return this.#watchFiles;
	}

	hasCompiledJs(fileName: string): boolean {
		return this.#compiledSource.get(fileName)?.js !== undefined;
	}

	hasCompiledSource(fileName: string): boolean {
		return this.#compiledSource.has(fileName);
	}

	hasEmitableSource(fileName: string): boolean {
		return this.#emitableSource.has(fileName);
	}

	hasSourceFile(fileName: string): boolean {
		return this.#sourceFileNameSet.has(fileName);
	}

	hasWatchFile(fileName: string): boolean {
		return this.#watchFiles.has(fileName);
	}

	writeEmitableAssets(): void {
		for (const [fileName, source] of this.#emitableAssets) {
			if (this.#emittedAssetCache.get(fileName) === source || ts.sys.readFile(fileName) === source) {
				this.#emittedAssetCache.set(fileName, source);
			} else {
				ts.sys.writeFile(fileName, source);

				this.#emittedAssetCache.set(fileName, source);
			}
		}
	}

	#writeFile: ts.WriteFileCallback = (outputFileName, code, _writeBOM, _onError, sourceFiles) => {
		if (!sourceFiles?.length) {
			this.#emitableAssets.set(outputFileName, code);

			return;
		}

		this.#setSourceOutput(this.#getSourceFile(sourceFiles), outputFileName, code);
	};

	#addAffectedSourceFiles(affected: ts.SourceFile | ts.Program): void {
		const sourceFiles = "getSourceFiles" in affected ? affected.getSourceFiles() : [affected];

		for (const sourceFile of sourceFiles) {
			if (this.#sourceFileNameSet.has(sourceFile.fileName)) {
				this.#affectedSourceFileNames.add(sourceFile.fileName);
			}
		}
	}

	#buildProjectReferences(): void {
		this.#solutionDiagnostics = [];

		if (!this.#config.projectReferences?.length) {
			return;
		}

		this.#solutionBuilder ??= ts.createSolutionBuilder(
			ts.createSolutionBuilderHost(
				ts.sys,
				undefined,
				(diagnostic) => this.#solutionDiagnostics.push(diagnostic),
				() => undefined,
			),
			[this.#configFile],
			{},
		);

		this.#solutionBuilder.buildReferences(this.#configFile);
	}

	#collectDiagnostics(affectedSourceFileNames?: Iterable<string>): ts.Diagnostic[] {
		const diagnostics = [...this.#solutionDiagnostics, ...this.#result.diagnostics];

		if (this.#diagnosticsMode === true || this.#diagnosticsMode === "syntactic") {
			for (const sourceFile of this.#diagnosticSourceFiles(affectedSourceFileNames)) {
				this.#syntacticDiagnostics.set(sourceFile.fileName, this.#builder!.getSyntacticDiagnostics(sourceFile));
			}

			appendDiagnostics(diagnostics, this.#syntacticDiagnostics);
		}

		if (this.#diagnosticsMode === true || this.#diagnosticsMode === "semantic") {
			for (const sourceFile of this.#diagnosticSourceFiles(affectedSourceFileNames)) {
				this.#semanticDiagnostics.set(sourceFile.fileName, this.#builder!.getSemanticDiagnostics(sourceFile));
			}

			appendDiagnostics(diagnostics, this.#semanticDiagnostics);
		}

		return diagnostics;
	}

	*#diagnosticSourceFiles(sourceFileNames?: Iterable<string>): Iterable<ts.SourceFile> {
		if (!sourceFileNames) {
			for (const sourceFile of this.#program!.getSourceFiles()) {
				if (this.#shouldCollectDiagnostics(sourceFile)) {
					yield sourceFile;
				}
			}

			return;
		}

		for (const sourceFileName of sourceFileNames) {
			const sourceFile = this.#program!.getSourceFile(sourceFileName);

			if (sourceFile && this.#shouldCollectDiagnostics(sourceFile)) {
				yield sourceFile;
			} else {
				this.#semanticDiagnostics.delete(sourceFileName);
				this.#syntacticDiagnostics.delete(sourceFileName);
			}
		}
	}

	#getCompiledSource(sourceFile: SourceFile): CompiledSource {
		const canonicalSourceFile = this.#program!.getSourceFile(sourceFile.fileName) ?? sourceFile;

		let compiledSource = this.#compiledSource.get(canonicalSourceFile.fileName);

		if (!compiledSource) {
			this.#compiledSource.set(canonicalSourceFile.fileName, (compiledSource = {} as CompiledSource));
		}

		compiledSource.sourceFile = canonicalSourceFile;

		return compiledSource;
	}

	#getConfigFile(configFile: string): string {
		return ts.findConfigFile(this.#workDir, ts.sys.fileExists, configFile) ?? path.toPath(this.#workDir, configFile);
	}

	#getKnownOutputFileNames(sourceFileName: string): readonly string[] {
		return this.#outputFileNames.get(sourceFileName) ?? (this.#sourceFileNameSet.has(sourceFileName) ? this.#getOutputFileNames(sourceFileName) : []);
	}

	#getOutputFileNames(sourceFileName: string): readonly string[] {
		let outputFileNames = this.#outputFileNames.get(sourceFileName);

		if (!outputFileNames) {
			this.#outputFileNames.set(sourceFileName, (outputFileNames = ts.getOutputFileNames(this.#config, sourceFileName, false)));
		}

		return outputFileNames;
	}

	#getSourceFile(sourceFiles: readonly SourceFile[]): SourceFile {
		const sourceFile = sourceFiles.find((file) => this.#sourceFileNameSet.has(file.fileName)) ?? sourceFiles[0]!;

		return this.#program!.getSourceFile(sourceFile.fileName) ?? sourceFile;
	}

	#loadEmittedFilesFromDisk(sourceFileNames: Iterable<string>): void {
		for (const sourceFileName of sourceFileNames) {
			const sourceFile = this.#program!.getSourceFile(sourceFileName);

			if (!sourceFile) {
				continue;
			}

			const compiledSource = this.#getCompiledSource(sourceFile);

			for (const outputFileName of this.#getOutputFileNames(sourceFileName)) {
				const outputKind = getSourceOutputKind(outputFileName);

				if (!outputKind || compiledSource[outputKind]) {
					continue;
				}

				const code = ts.sys.readFile(outputFileName);

				if (code !== undefined) {
					compiledSource[outputKind] = this.#source(outputFileName, code);
				}
			}
		}
	}

	#refreshWatchFiles(): void {
		const files = new Set([this.#configFile, ...this.#config.fileNames]);

		for (const projectReference of this.#config.projectReferences ?? []) {
			files.add(projectReference.path);
		}

		for (const sourceFile of this.#program!.getSourceFiles()) {
			if (!isDefaultLibrarySource(sourceFile) && !isNodeModuleDeclaration(sourceFile)) {
				files.add(sourceFile.fileName);
			}
		}

		this.#watchFiles = files;
	}

	#resetEmitState(fullEmit: boolean): void {
		this.#affectedSourceFileNames.clear();
		this.#diagnostics = [];
		this.#emitableAssets.clear();
		this.#sourcesResetThisEmit.clear();

		if (!fullEmit) {
			return;
		}

		this.#compiledSource.clear();
		this.#emitableSource.clear();
		this.#semanticDiagnostics.clear();
		this.#syntacticDiagnostics.clear();
	}

	#resetSource(sourceFileName: string): void {
		if (this.#sourcesResetThisEmit.has(sourceFileName)) {
			return;
		}

		this.#emitableSource.delete(sourceFileName);
		this.#sourcesResetThisEmit.add(sourceFileName);
	}

	#setSourceOutput(sourceFile: SourceFile, outputFileName: string, code: string): void {
		this.#resetSource(sourceFile.fileName);

		const outputKind = getSourceOutputKind(outputFileName);

		if (outputKind) {
			this.#getCompiledSource(sourceFile)[outputKind] = this.#source(outputFileName, code);
		} else {
			this.#emitableSource.set(sourceFile.fileName, code);
		}
	}

	#shouldCollectDiagnostics(sourceFile: ts.SourceFile): boolean {
		return !isDefaultLibrarySource(sourceFile) && !(sourceFile.isDeclarationFile && this.#config.options.skipLibCheck);
	}

	#source(fileName: string, code: string): Source {
		return {
			name: path.toRelativePath(fileName, this.#distDir, { explicit: false }),
			code,
		};
	}

	// biome-ignore lint/suspicious/useAdjacentOverloadSignatures: preference
	static init(options?: TscApiOptions): TscAPI {
		const api = new TscAPI();

		api.init(options);

		return api;
	}
}

export type SourceFile = ts.SourceFile;

export interface TscModuleMeta {
	program?: ts.Program;
	sourceFile: SourceFile;
	typeChecker?: ts.TypeChecker;
}

export interface TscApiOptions {
	workDir?: string;
	configFile?: string;
	compilerOptions?: ts.CompilerOptions;
	customTransformers?: ts.CustomTransformers;
	diagnostics?: TscDiagnosticsMode;
	exclude?: string[];
	include?: string[];
	references?: ts.ProjectReference[];
}

export type TscDiagnosticsMode = boolean | "semantic" | "syntactic";

export interface TscOutputOptions {
	outDir: string;
	outDirPath: string;
	tsBuildInfoFile?: string;
	tsBuildInfoFilePath?: string;
	compilerOptions: ts.CompilerOptions;
	rollupOutput: { dir: string };
	viteBuild: { outDir: string };
}

export interface TscOutputOptionsInit extends TscApiOptions {
	outDir?: string;
	tsBuildInfoFile?: string;
}

export interface CompiledSource {
	dts?: Source;
	dtsMap?: Source;
	js?: Source;
	jsMap?: Source;
	sourceFile: SourceFile;
}

export interface Source {
	name: string;
	code: string;
}

const enum Default {
	ConfigFile = "tsconfig.json",
	RootDir = "src",
	WorkDir = ".",
}

const appendDiagnostics = (target: ts.Diagnostic[], cache: Map<string, readonly ts.Diagnostic[]>): void => {
	for (const diagnostics of cache.values()) {
		target.push(...diagnostics);
	}
};

const copyCustomTransformers = (transformers?: ts.CustomTransformers): ts.CustomTransformers => ({
	...(Array.isArray(transformers?.before) ? { before: [...transformers.before] } : null),
	...(Array.isArray(transformers?.after) ? { after: [...transformers.after] } : null),
	...(Array.isArray(transformers?.afterDeclarations) ? { afterDeclarations: [...transformers.afterDeclarations] } : null),
});

const getEmitResult = (emitResults: readonly ts.EmitResult[]): ts.EmitResult => {
	const diagnostics: ts.Diagnostic[] = [];
	const emittedFiles: string[] = [];

	let emitSkipped = false;

	for (const emitResult of emitResults) {
		diagnostics.push(...emitResult.diagnostics);
		emittedFiles.push(...(emitResult.emittedFiles ?? []));

		emitSkipped ||= emitResult.emitSkipped;
	}

	return { diagnostics, emittedFiles, emitSkipped };
};

const getSourceOutputKind = (outputFileName: string): keyof Pick<CompiledSource, "dts" | "dtsMap" | "js" | "jsMap"> | undefined =>
	outputFileName.endsWith(".d.ts")
		? "dts"
		: outputFileName.endsWith(".d.ts.map")
			? "dtsMap"
			: outputFileName.endsWith(".js")
				? "js"
				: outputFileName.endsWith(".map")
					? "jsMap"
					: undefined;

const isDefaultLibrarySource = (sourceFile: ts.SourceFile): boolean =>
	sourceFile.hasNoDefaultLib || /[/\\]typescript[/\\]lib[/\\]lib\..*\.d\.[cm]?ts$/.test(sourceFile.fileName);

const isNodeModuleDeclaration = (sourceFile: ts.SourceFile): boolean => sourceFile.isDeclarationFile && /[/\\]node_modules[/\\]/.test(sourceFile.fileName);

const toConfigPath = (fileName: string, workDir: string): string => path.toRelativePath(fileName, workDir, { explicit: false }).replace(/\/$/, "") || ".";

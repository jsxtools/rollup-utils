import * as array from "@jsxtools/rollup-plugin-utils/array"
import * as path from "@jsxtools/rollup-plugin-utils/path"

import * as ts from "typescript"

export type SourceFile = ts.SourceFile

const enum Default {
	ConfigFile = "tsconfig.json",
	RootDir = "src",
	WorkDir = ".",
}

export class TscAPI {
	/** Working directory. */
	workDir = path.toDirPath(Default.WorkDir)
	rootDir = path.toDirPath(Default.WorkDir, Default.RootDir)
	distDir = path.toDirPath(Default.WorkDir, Default.RootDir)
	include = [] as string[]
	exclude = [] as string[]
	configFile = path.toPath(Default.WorkDir, Default.ConfigFile)

	host!: ts.CompilerHost
	program!: ts.EmitAndSemanticDiagnosticsBuilderProgram
	config!: ts.ParsedCommandLine
	result!: ts.EmitResult

	#program!: ts.Program

	#outputToSource = new Map<string, string>()

	compiledSource = new Map<string, CompiledSource>()
	emitableAssets = new Map<string, string>()
	emitableSource = new Map<string, string>()

	init(options?: TscApiOptions): void {
		this.workDir = path.toDirPath(options?.workDir ?? Default.WorkDir)

		const configFile = this.getConfigFile(options?.configFile ?? Default.ConfigFile)
		const configData = { ...ts.readConfigFile(configFile, ts.sys.readFile).config }

		if (Array.isArray(options?.include)) {
			configData.include = array.merge(configData.include, options.include)
		}

		if (Array.isArray(options?.exclude)) {
			configData.exclude = array.merge(configData.exclude, options.exclude)
		}

		if (Array.isArray(options?.references)) {
			configData.references = array.merge(configData.references, options.references)
		}

		this.configFile = configFile

		this.config = ts.parseJsonConfigFileContent(
			configData,
			ts.sys,
			ts.getDirectoryPath(configFile),
			undefined,
			configFile,
		)

		this.rootDir = ts.getCommonSourceDirectory(
			this.config.options,
			() => this.config.fileNames,
			ts.getDirectoryPath(configFile),
			String,
		)
	}

	getConfigFile(configFile: string): string {
		return ts.findConfigFile(this.workDir, ts.sys.fileExists, configFile) ?? path.toPath(this.workDir, configFile)
	}

	writeEmitableAssets(): void {
		for (const [fileName, source] of this.emitableAssets) {
			ts.sys.writeFile(fileName, source)
		}
	}

	emit(): boolean {
		this.host = ts.createIncrementalCompilerHost(this.config.options)

		this.program = ts.createIncrementalProgram({
			rootNames: this.config.fileNames,
			options: this.config.options,
			projectReferences: this.config.projectReferences,
			host: this.host,
		})

		this.#program = this.program.getProgram()

		this.distDir = this.program.getCompilerOptions().outDir ?? path.toDirPath(this.workDir ?? this.rootDir)

		this.#outputToSource.clear()
		this.compiledSource.clear()
		this.emitableAssets.clear()
		this.emitableSource.clear()

		for (const sourceFileName of this.config.fileNames) {
			const outputFileNames = ts.getOutputFileNames(this.config, sourceFileName, false)

			for (const outputFileName of outputFileNames) {
				this.#outputToSource.set(outputFileName, sourceFileName)
			}
		}

		const writeFile: ts.WriteFileCallback = (outputFileName, code, _writeBOM, _onError, sourceFiles) => {
			// tsbuildinfo and other non-source outputs
			if (!sourceFiles || sourceFiles.length === 0) {
				this.emitableAssets.set(outputFileName, code)

				return
			}

			if (outputFileName.endsWith(".js")) {
				this.#getCompiledSource(sourceFiles).jsc = {
					name: path.toPathWithoutBase(outputFileName, this.distDir),
					code,
				}

				return
			}

			if (outputFileName.endsWith(".d.ts")) {
				this.#getCompiledSource(sourceFiles).dts = {
					name: path.toPathWithoutBase(outputFileName, this.distDir),
					code,
				}

				return
			}

			if (outputFileName.endsWith(".map")) {
				this.#getCompiledSource(sourceFiles).map = {
					name: path.toPathWithoutBase(outputFileName, this.distDir),
					code,
				}

				return
			}

			// non js, d.ts, or map files
			this.emitableSource.set(this.#getSourceFile(sourceFiles).fileName, code)
		}

		this.result = this.program.emit(undefined, writeFile)

		return !this.result.emitSkipped
	}

	getAbsolutePath(fileName: string, baseDir: string): string {
		return ts.combinePaths(baseDir, fileName)
	}

	getRelativePath(fileName: string, baseDir: string): string {
		return ts.getRelativePathFromDirectory(baseDir, fileName)
	}

	/** Returns the canonical SourceFile from the pipelined source files. */
	#getSourceFile(sourceFiles: readonly SourceFile[]): SourceFile {
		const pipelinedSourceFile = sourceFiles.find((sourceFile) =>
			this.config.fileNames.includes(sourceFile.fileName),
		)!
		const canonicalSourceFile = this.#program.getSourceFile(pipelinedSourceFile.fileName)!

		return canonicalSourceFile
	}

	#getCompiledSource(sourceFiles: readonly SourceFile[]): CompiledSource {
		const sourceFile = this.#getSourceFile(sourceFiles)

		let compiledSource = this.compiledSource.get(sourceFile.fileName)!

		if (!compiledSource) {
			compiledSource = {} as CompiledSource

			this.compiledSource.set(sourceFile.fileName, compiledSource)
		}

		compiledSource.tsf ??= sourceFile

		return compiledSource
	}
}

export interface TscApiOptions {
	workDir?: string
	configFile?: string

	compilerOptions?: ts.CompilerOptions
	exclude?: string[]
	include?: string[]
	references?: ts.ProjectReference[]
}

export interface CompiledSource {
	/** TypeScript declaration source. */
	dts: Source
	/** Compiled JavaScript source. */
	jsc: Source
	/** Compiled JavaScript sourcemap source. */
	map: Source
	/** SourceFile object of the original TypeScript. */
	tsf: SourceFile
}

export interface Source {
	name: string
	code: string
}

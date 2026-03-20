import * as path from "@jsxtools/rollup-plugin-utils/path";
import * as ts from "typescript";

const enum Default {
	ConfigFile = "tsconfig.json",
	WorkDir = ".",
}

export class TscResolveAPI {
	/** Working directory. */
	workDir = path.toDirPath(Default.WorkDir);
	configFile = path.toPath(Default.WorkDir, Default.ConfigFile);

	config: ts.ParsedCommandLine = {
		errors: [],
		fileNames: [],
		options: {},
	};

	/** TypeScript semantic and syntactic diagnostics. */
	diagnostics: ts.Diagnostic[] = [];

	init(options?: TscResolveOptions): void {
		this.workDir = path.toDirPath(options?.workDir ?? Default.WorkDir);
		this.configFile = this.#getConfigFile(options?.configFile ?? Default.ConfigFile);
		this.config = this.#getConfigData(this.configFile);
	}

	resolve(id: string, importer: string): string | undefined {
		const { resolvedModule } = ts.resolveModuleName(id, importer, this.config.options, ts.sys);

		return resolvedModule?.resolvedFileName;
	}

	#getConfigFile(configFile: string): string {
		return ts.findConfigFile(this.workDir, ts.sys.fileExists, configFile) ?? path.toPath(this.workDir, configFile);
	}

	#getConfigData(configFile: string): ts.ParsedCommandLine {
		const configData = { ...ts.readConfigFile(configFile, ts.sys.readFile).config };

		return ts.parseJsonConfigFileContent(configData, ts.sys, ts.getDirectoryPath(configFile));
	}
}

export interface TscResolveOptions {
	/** Working directory. */
	workDir?: string;

	/** Path to the tsconfig file. */
	configFile?: string;
}

import * as path from "@jsxtools/rollup-plugin-utils/path";
import * as ts from "typescript";

const enum Default {
	ConfigFile = "tsconfig.json",
	WorkDir = ".",
}

export class TscResolveAPI {
	#config: ts.ParsedCommandLine = {
		errors: [],
		fileNames: [],
		options: {},
	};
	#configFile = path.toPath(Default.WorkDir, Default.ConfigFile);
	#moduleResolutionCache!: ts.ModuleResolutionCache;
	#moduleResolutionHost: ts.ModuleResolutionHost = ts.sys;
	#resolvedFileNameByCacheKey = new Map<string, ResolvedFileName>();
	#workDir = path.toDirPath(Default.WorkDir);

	init(options?: TscResolveOptions): void {
		this.#workDir = path.toDirPath(options?.workDir ?? Default.WorkDir);
		this.#configFile = this.#getConfigFile(options?.configFile ?? Default.ConfigFile);
		this.#config = this.#getConfigData(this.#configFile);
		this.#resolvedFileNameByCacheKey.clear();
		this.#moduleResolutionCache = ts.createModuleResolutionCache(
			ts.getDirectoryPath(this.#configFile),
			ts.sys.useCaseSensitiveFileNames ? (fileName) => fileName : (fileName) => fileName.toLowerCase(),
			this.#config.options,
		);
	}

	resolve(id: string, importer: string): string | undefined {
		const cacheKey = this.#cacheKey(id, importer);
		const cachedFileName = this.#resolvedFileNameByCacheKey.get(cacheKey);

		if (cachedFileName !== undefined) {
			if (cachedFileName === false) {
				return undefined;
			}

			return cachedFileName;
		}

		const { resolvedModule } = ts.resolveModuleName(id, importer, this.#config.options, this.#moduleResolutionHost, this.#moduleResolutionCache);
		const resolvedFileName = resolvedModule?.resolvedFileName;

		this.#resolvedFileNameByCacheKey.set(cacheKey, resolvedFileName ?? false);

		return resolvedFileName;
	}

	#cacheKey(id: string, importer: string): string {
		return `${importer}\0${id}`;
	}

	#getConfigFile(configFile: string): string {
		return ts.findConfigFile(this.#workDir, ts.sys.fileExists, configFile) ?? path.toPath(this.#workDir, configFile);
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

type ResolvedFileName = string | false;

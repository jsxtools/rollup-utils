import { create } from "@jsxtools/cem-analyzer/create";
import type { CEM, Plugin, PluginOption, TS } from "@jsxtools/cem-analyzer/types";
import * as array from "@jsxtools/rollup-plugin-utils/array";
import * as fs from "@jsxtools/rollup-plugin-utils/file";
import * as json from "@jsxtools/rollup-plugin-utils/json";
import * as path from "@jsxtools/rollup-plugin-utils/path";
import { Pattern } from "@jsxtools/rollup-plugin-utils/pattern";
import * as str from "@jsxtools/rollup-plugin-utils/string";

const enum Default {
	ManifestFile = "custom-elements.json",
	RootDir = "src",
	DistDir = "dist",
	WorkDir = ".",
}

export class CemAPI {
	#modules = new SourceSet();
	#options = getNormalizedOptions();
	#package = createPackage();
	#plugins = new PluginSet();
	#program?: TS.Program;
	#typeChecker?: TS.TypeChecker;

	get manifestFile(): string {
		return this.#options.manifestFile;
	}

	get manifest(): CEM.Package {
		return this.#package;
	}

	get program(): TS.Program | undefined {
		return this.#program;
	}

	get sourceFiles(): readonly TS.SourceFile[] {
		return [...this.#modules];
	}

	get typeChecker(): TS.TypeChecker | undefined {
		return this.#typeChecker ?? this.#program?.getTypeChecker();
	}

	addModule(sourceFile: TS.SourceFile): void {
		this.#modules.add(sourceFile);
	}

	addModules(...sourceFiles: TS.SourceFile[]): void {
		this.#modules.add(...sourceFiles);
	}

	clearModules(): void {
		this.#modules.clear(this.#options);
	}

	init(options?: CemOptions): void {
		this.#options = getNormalizedOptions(options);

		this.#plugins.clear();
		this.#plugins.add(...this.#options.plugins);
		this.#program = this.#options.program;
		this.#typeChecker = this.#options.typeChecker;

		this.clearModules();
		this.addModules(...this.#options.modules);
	}

	async generate(): Promise<boolean> {
		if (this.#modules.size === 0) {
			return false;
		}

		const manifest = getValueWithRelativePaths(
			create({
				modules: [...this.#modules],
				plugins: [...this.#plugins],
			}),
			path.toDirPath(this.#options.workDir),
		);

		if (manifest.modules.length === 0) {
			return false;
		}

		const packageManifest = await this.loadManifest();
		const packageModules = new Map(packageManifest.modules.map((module) => [module.path, module]));

		for (const module of manifest.modules) {
			packageModules.set(module.path, module);
		}

		this.#package = {
			...packageManifest,
			schemaVersion: manifest.schemaVersion,
			readme: manifest.readme,
			modules: [...packageModules.values()],
		};

		return true;
	}

	async loadManifest(): Promise<CEM.Package> {
		const manifest = await fs.readJSON<CEM.Package>(this.manifestFile).catch(() => undefined);

		if (manifest?.schemaVersion === "1.0.0") {
			return manifest;
		}

		return createPackage();
	}

	async saveManifest(): Promise<void> {
		await fs.ensureFileDir(this.manifestFile);
		await fs.writeFile(this.manifestFile, this.toJSON());
	}

	async updateManifest(): Promise<void> {
		if (await this.generate()) {
			await this.saveManifest();
		}
	}

	toJSON(): string {
		return json.to(this.#package);
	}

	// biome-ignore lint/suspicious/useAdjacentOverloadSignatures: preference
	static init(options?: CemOptions): CemAPI {
		const api = new CemAPI();

		api.init(options);

		return api;
	}
}

export class SourceSet extends Set<TS.SourceFile> {
	#excludePatterns: Pattern[] = [];
	#includePatterns: Pattern[] = [];
	#seenSourceFileNames = new Set<string>();
	#workDir = path.toDirPath(Default.WorkDir);

	override add(...sourceFiles: TS.SourceFile[]): this {
		if (!this.#includePatterns.length) {
			return this;
		}

		for (const sourceFile of sourceFiles) {
			if (sourceFile == null || typeof sourceFile.fileName !== "string" || this.#seenSourceFileNames.has(sourceFile.fileName)) {
				continue;
			}

			const relativePath = path.toRelativePath(sourceFile.fileName, this.#workDir, { explicit: false });
			const isIncluded = this.#includePatterns.some((pattern) => pattern.match(relativePath));

			if (!isIncluded) {
				continue;
			}

			const isExcluded = this.#excludePatterns.some((pattern) => pattern.match(relativePath));

			if (isExcluded) {
				continue;
			}

			this.#seenSourceFileNames.add(sourceFile.fileName);

			super.add(sourceFile);
		}

		return this;
	}

	override clear(init?: CemOptions): void {
		const options = getNormalizedOptions(init);

		this.#excludePatterns = options.exclude.map((pattern) => new Pattern(pattern));
		this.#includePatterns = options.include.map((pattern) => new Pattern(pattern));
		this.#seenSourceFileNames.clear();
		this.#workDir = options.workDir;

		super.clear();
	}
}

export const getNormalizedOptions = (init?: CemOptions): CemNormalizedOptions => {
	const workDir = path.toDirPath(init?.workDir ?? Default.WorkDir);
	const distDir = path.toDirPath(workDir, init?.distDir || Default.DistDir);

	return {
		workDir,
		distDir,
		rootDir: path.toDirPath(workDir, init?.rootDir || Default.RootDir),
		manifestFile: init?.manifestFile ? path.toPath(workDir, init.manifestFile) : path.toPath(distDir, Default.ManifestFile),
		include: array.from(init?.include ?? "**", str.hasTrimmedValue).map(str.trim),
		exclude: array.from(init?.exclude).map(str.trim),
		modules: array.from(init?.modules),
		plugins: array.from(init?.plugins).flat(),
		program: init?.program,
		typeChecker: init?.typeChecker ?? init?.program?.getTypeChecker(),
	};
};

export const getSourceFileNameFromModulePath = (modulePath: string, workDir = Default.WorkDir): string => path.toPath(path.toDirPath(workDir), modulePath);

export const getSourceFilesByFileName = (sourceFiles: Iterable<TS.SourceFile>): Map<string, TS.SourceFile> => {
	const sourceFilesByFileName = new Map<string, TS.SourceFile>();

	for (const sourceFile of sourceFiles) {
		sourceFilesByFileName.set(path.toPath(sourceFile.fileName), sourceFile);
	}

	return sourceFilesByFileName;
};

const createPackage = (): CEM.Package => ({
	schemaVersion: "1.0.0",
	readme: "",
	modules: [],
});

const getValueWithRelativePaths = <T>(value: T, basePath: string): T => {
	if (typeof value === "string") {
		let normalized = String(value);

		normalized = normalized.startsWith("//") ? normalized.slice(1) : normalized;
		normalized = normalized.startsWith(basePath) ? `./${normalized.slice(basePath.length)}` : normalized;

		return normalized as T;
	} else if (value && typeof value === "object") {
		const result = Array.isArray(value) ? ([] as T) : ({} as T);

		for (const [name, data] of Object.entries(value)) {
			result[name as keyof typeof value] = getValueWithRelativePaths(data, basePath) as never;
		}

		return result;
	}

	return value;
};

export class PluginSet extends Set<Plugin> {
	#seenPluginNames = new Set<string>();

	override add(...plugins: PluginOption[]): this {
		for (const plugin of plugins.flat()) {
			if (plugin == null || typeof plugin.name !== "string" || this.#seenPluginNames.has(plugin.name)) {
				continue;
			}

			this.#seenPluginNames.add(plugin.name);

			super.add(plugin);
		}

		return this;
	}

	override clear(): void {
		this.#seenPluginNames.clear();

		super.clear();
	}
}

export interface CemOptions {
	workDir?: string;
	rootDir?: string;
	distDir?: string;
	manifestFile?: string;
	include?: string | string[];
	exclude?: string | string[];
	modules?: TS.SourceFile[];
	program?: TS.Program;
	plugins?: PluginOption[];
	typeChecker?: TS.TypeChecker;
}

export interface CemNormalizedOptions {
	workDir: string;
	rootDir: string;
	distDir: string;
	manifestFile: string;
	include: string[];
	exclude: string[];
	modules: TS.SourceFile[];
	program?: TS.Program;
	plugins: Plugin[];
	typeChecker?: TS.TypeChecker;
}

export { catalystPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst/catalyst";
export { catalystPlugin2 } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst-major-2/catalyst";
export { fastPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/fast/fast";
export { litPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/lit/lit";
export { stencilPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/stencil/stencil";

import { type CEM, create, type Plugin, type PluginOption, type TS } from "@jsxtools/cem-analyzer/create"
import * as array from "@jsxtools/rollup-plugin-utils/array"
import * as fs from "@jsxtools/rollup-plugin-utils/file"
import * as json from "@jsxtools/rollup-plugin-utils/json"
import * as path from "@jsxtools/rollup-plugin-utils/path"
import { match } from "@jsxtools/rollup-plugin-utils/pattern"
import * as str from "@jsxtools/rollup-plugin-utils/string"

const enum Default {
	ManifestFile = "custom-elements.json",
	RootDir = "src",
	DistDir = "dist",
	WorkDir = ".",
}

export class CemAPI {
	#internals = {
		options: getNormalizedOptions(),
		modules: new SourceSet(),
		plugins: new PluginSet(),
		package: {
			schemaVersion: "1.0.0",
			readme: "",
			modules: [],
		} as CEM.Package,
	}

	get options(): CemNormalizedOptions {
		return this.#internals.options
	}

	set options(options: CemOptions) {
		const internals = this.#internals

		internals.options = getNormalizedOptions(options)

		internals.modules.clear(this.options)
		internals.plugins.clear()

		internals.modules.add(...array.from(internals.options.modules, str.hasTrimmedValue))
		internals.plugins.add(...array.from(internals.options.plugins, str.hasTrimmedValue))
	}

	get manifestFile(): string {
		return this.#internals.options.manifestFile
	}

	get modules(): SourceSet {
		return this.#internals.modules
	}

	init(options?: CemOptions): void {
		this.options = getNormalizedOptions(options)
	}

	async generate(): Promise<boolean> {
		const internals = this.#internals
		const manifest = getValueWithRelativePaths(
			create({
				modules: [...internals.modules],
				plugins: [...internals.plugins],
			}),
			path.toDirPath(internals.options.workDir),
		)

		if (manifest.modules.length === 0) {
			return false
		}

		internals.package = await this.loadManifest()

		internals.package.schemaVersion = manifest.schemaVersion
		internals.package.readme = manifest.readme

		for (const module of manifest.modules) {
			const existingModuleIndex = internals.package.modules.findIndex(
				(oldModule) => oldModule.path === module.path,
			)

			if (existingModuleIndex !== -1) {
				internals.package.modules.splice(existingModuleIndex, 1, module)
			} else {
				internals.package.modules.push(module)
			}
		}

		return true
	}

	async loadManifest(): Promise<CEM.Package> {
		const manifest = await fs.readJSON<CEM.Package>(this.manifestFile).catch(() => undefined)

		if (manifest?.schemaVersion === "1.0.0") {
			return manifest
		}

		return {
			schemaVersion: "1.0.0",
			readme: "",
			modules: [],
		}
	}

	async saveManifest(): Promise<void> {
		await fs.ensureFileDir(this.manifestFile)
		await fs.writeFile(this.manifestFile, this.toJSON())
	}

	async updateManifest(): Promise<void> {
		if (await this.generate()) {
			this.saveManifest()
		}
	}

	toJSON(): string {
		return json.to(this.#internals.package)
	}
}

export class SourceSet extends Set<TS.SourceFile> {
	#seen = new Set<string>()
	#options!: CemNormalizedOptions

	override add(...sourceFiles: TS.SourceFile[]): this {
		if (!this.#options.include.length) {
			return this
		}

		for (const sourceFile of sourceFiles) {
			if (sourceFile == null || typeof sourceFile.fileName !== "string" || this.#seen.has(sourceFile.fileName)) {
				continue
			}

			const relativePath = path.toRelativePath(sourceFile.fileName, this.#options.workDir, { explicit: false })

			// use picomatch to match the file name against the include and exclude patterns
			const isIncluded = this.#options.include.some((pattern) => match(pattern, relativePath))

			if (!isIncluded) {
				continue
			}

			const isExcluded = this.#options.exclude.some((pattern) => match(pattern, sourceFile.fileName))

			if (isExcluded) {
				continue
			}

			this.#seen.add(sourceFile.fileName)

			super.add(sourceFile)
		}

		return this
	}

	override clear(init?: CemOptions): void {
		this.#options = getNormalizedOptions(init)

		this.#seen.clear()

		super.clear()
	}
}

export const getNormalizedOptions = (init?: CemOptions): CemNormalizedOptions => {
	const workDir = path.toDirPath(init?.workDir ?? Default.WorkDir)
	const distDir = path.toDirPath(workDir, init?.distDir || Default.DistDir)

	return {
		workDir,
		distDir,
		rootDir: path.toDirPath(workDir, init?.rootDir || Default.RootDir),
		manifestFile: init?.manifestFile
			? path.toPath(workDir, init.manifestFile)
			: path.toPath(distDir, Default.ManifestFile),
		include: array.from(init?.include ?? "**", str.hasTrimmedValue).map(str.trim),
		exclude: array.from(init?.exclude).map(str.trim),
		modules: array.from(init?.modules),
		plugins: array.from(init?.plugins).flat(),
	}
}

const getValueWithRelativePaths = <T>(value: T, path: string): T => {
	if (typeof value === "string") {
		let normalized = String(value)

		normalized = normalized.startsWith("//") ? normalized.slice(1) : normalized
		normalized = normalized.startsWith("/") ? `./${normalized.slice(path.length)}` : normalized

		return normalized as T
	} else if (value && typeof value === "object") {
		const result = Array.isArray(value) ? ([] as T) : ({} as T)

		for (const [name, data] of Object.entries(value)) {
			result[name as keyof typeof value] = getValueWithRelativePaths(data, path) as never
		}

		return result
	}

	return value
}

export class PluginSet extends Set<Plugin> {
	#seen = new Set<string>()

	override add(...plugins: PluginOption[]): this {
		for (const plugin of plugins.flat()) {
			if (plugin == null || typeof plugin.name !== "string" || this.#seen.has(plugin.name)) {
				continue
			}

			this.#seen.add(plugin.name)

			super.add(plugin)
		}

		return this
	}

	override clear(): void {
		this.#seen.clear()

		super.clear()
	}
}

export interface CemOptions {
	workDir?: string
	rootDir?: string
	distDir?: string
	manifestFile?: string
	include?: string | string[]
	exclude?: string | string[]
	modules?: TS.SourceFile[]
	plugins?: PluginOption[]
}

export interface CemNormalizedOptions {
	workDir: string
	rootDir: string
	distDir: string
	manifestFile: string
	include: string[]
	exclude: string[]
	modules: TS.SourceFile[]
	plugins: Plugin[]
}

export { catalystPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst/catalyst"
export { catalystPlugin2 } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst-major-2/catalyst"
export { fastPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/fast/fast"
export { litPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/lit/lit"
export { stencilPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/stencil/stencil"

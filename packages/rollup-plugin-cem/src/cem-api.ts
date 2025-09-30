import { readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { type CEM, create, type Plugin, type PluginOption, type TS } from "@jsxtools/cem-analyzer/create"
import { toArray } from "@jsxtools/rollup-plugin-utils/options"
import { relative, resolve, resolveDir } from "@jsxtools/rollup-plugin-utils/path"
import picomatch from "picomatch"

const enum Default {
	ManifestFile = "custom-elements.json",
	RootDir = "src",
	DistDir = "dist",
	WorkDir = ".",
}

export class CemAPI {
	options = getNormalizedOptions()
	modules = new SourceSet()
	plugins = new PluginSet()
	package = {
		schemaVersion: "1.0.0",
		readme: "",
		modules: [],
	} as CEM.Package

	init(options?: CemOptions): void {
		this.options = getNormalizedOptions(options)

		this.modules.clear(this.options)
		this.plugins.clear()

		this.modules.add(...toArray(this.options.modules))
		this.plugins.add(...toArray(this.options.plugins))
	}

	generate(): boolean {
		const manifest = getValueWithRelativePaths(
			create({
				modules: [...this.modules],
				plugins: [...this.plugins],
			}),
			pathToFileURL(this.options.workDir).pathname,
		)

		if (manifest.modules.length === 0) {
			return false
		}

		this.package = this.loadManifest()

		this.package.schemaVersion = manifest.schemaVersion
		this.package.readme = manifest.readme

		for (const module of manifest.modules) {
			const existingModuleIndex = this.package.modules.findIndex((oldModule) => oldModule.path === module.path)

			if (existingModuleIndex !== -1) {
				this.package.modules.splice(existingModuleIndex, 1, module)
			} else {
				this.package.modules.push(module)
			}
		}

		return true
	}

	loadManifest(): CEM.Package {
		try {
			return JSON.parse(readFileSync(resolve(this.options.workDir, this.options.manifestFile), "utf-8"))
		} catch {
			// do nothing and use the default manifest
			return {
				schemaVersion: "1.0.0",
				readme: "",
				modules: [],
			}
		}
	}

	saveManifest(): void {
		writeFileSync(this.options.manifestFile, this.toJSON())
	}

	updateManifest(): void {
		if (this.generate()) {
			this.saveManifest()
		}
	}

	toJSON(): string {
		return JSON.stringify(this.package)
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

			const relativePath = relative(this.#options.workDir, sourceFile.fileName)

			// use picomatch to match the file name against the include and exclude patterns
			const isIncluded = this.#options.include.some((pattern) => picomatch(pattern)(relativePath))

			if (!isIncluded) {
				continue
			}

			const isExcluded = this.#options.exclude.some((pattern) => picomatch(pattern)(sourceFile.fileName))

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
	const workDir = resolveDir(init?.workDir ?? Default.WorkDir)
	const distDir = resolveDir(workDir, init?.distDir || Default.DistDir)

	return {
		workDir,
		distDir,
		rootDir: resolveDir(workDir, init?.rootDir || Default.RootDir),
		manifestFile: init?.manifestFile ? resolve(workDir, init.manifestFile) : resolve(distDir, Default.ManifestFile),
		include: toArray(init?.include ?? "**"),
		exclude: toArray(init?.exclude),
		modules: toArray(init?.modules),
		plugins: toArray(init?.plugins).flat(),
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

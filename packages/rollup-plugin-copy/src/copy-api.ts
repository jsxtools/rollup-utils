import * as array from "@jsxtools/rollup-plugin-utils/array"
import * as fs from "@jsxtools/rollup-plugin-utils/file"
import * as json from "@jsxtools/rollup-plugin-utils/json"
import * as path from "@jsxtools/rollup-plugin-utils/path"
import * as str from "@jsxtools/rollup-plugin-utils/string"

const enum Default {
	CacheFile = "cpconfig.cpbuildinfo",
	RootDir = "src",
	DistDir = "dist",
	WorkDir = "",
}

export class CopyAPI {
	#internals = {
		cache: {
			fileNames: [],
			fileInfos: [],
			version: "0.2.0",
		} as Cache,
		files: {
			globbed: [] as string[],
			stashed: [] as string[],
		},
		glob: {
			include: ["**/*"],
			exclude: ["node_modules"],
		} as fs.GlobOptions,
		operations: {
			dists: [] as FileOperation[],
			cache: [] as FileOperation[],
			files: [] as FileOperation[],
		},
		paths: {
			workDir: path.toDirURL(Default.WorkDir),
			rootDir: path.toDirURL(Default.WorkDir, Default.RootDir),
			distDir: path.toDirURL(Default.WorkDir, Default.DistDir),
			cacheFile: path.toURL(Default.WorkDir, Default.CacheFile),
		},
		stash: {
			cache: {} as Record<string, FileCache>,
			files: new Map<string, FileCache>(),
			fileNames: [] as string[],
			shouldUpdate: false,
		},
	}

	get cacheFile(): string {
		return this.#internals.paths.cacheFile.pathname
	}

	files(): AsyncGenerator<string, void, void> {
		const { glob, paths } = this.#internals

		return fs.glob({
			cwd: paths.workDir,
			include: glob.include,
			exclude: glob.exclude,
		})
	}

	init(options = null as never as CopyOptions): void {
		const { paths, glob } = this.#internals

		paths.workDir = path.toDirURL(options?.workDir ?? Default.WorkDir)
		paths.rootDir = path.toDirURL(paths.workDir, options?.rootDir ?? Default.RootDir)
		paths.distDir = path.toDirURL(paths.workDir, options?.distDir ?? Default.DistDir)
		paths.cacheFile = path.toURL(paths.workDir, options?.cacheFile ?? Default.CacheFile)

		Object.assign(glob, {
			include: array.from(options?.include, str.hasTrimmedValue),
			exclude: array.from(options?.exclude, str.hasTrimmedValue),
		})
	}

	async loadCache(): Promise<void> {
		const { cache, paths, stash } = this.#internals
		const filed = await fs.readJSON<Cache>(paths.cacheFile).catch(() => undefined)

		cache.fileNames = []
		cache.fileInfos = []

		stash.cache = {}
		stash.shouldUpdate = false

		if (filed?.version === cache.version) {
			const fileNames = array.every(filed.fileNames, isCacheFileName) ? filed.fileNames : []
			const fileInfos = array.every(filed.fileInfos, isCacheFileInfo) ? filed.fileInfos : []

			if (fileNames.length === fileInfos.length) {
				cache.fileNames.push(...fileNames)
				cache.fileInfos.push(...fileInfos)

				stash.cache = Object.fromEntries(
					fileNames.map((fileName, index) => [path.toPath(paths.workDir, fileName), fileInfos[index]]),
				)
			}
		}
	}

	async updateCache(): Promise<void> {
		const { operations, paths, stash } = this.#internals
		const globbedFiles = await Array.fromAsync(this.files())

		operations.cache = []
		operations.files = []

		stash.files.clear()
		stash.shouldUpdate = false

		for (const [stashedPath, stashedInfo] of Object.entries(stash.cache)) {
			const cachingPath = path.toRelativePath(paths.workDir, stashedPath)

			if (!globbedFiles.includes(stashedPath)) {
				stash.shouldUpdate = true
				operations.files.push(async () => await fs.deleteFile(stashedPath))
			} else {
				operations.cache.push(async () => {
					const stat = await fs.getFileStats(stashedPath)

					if (stat.mtimeMs === stashedInfo[0] && stat.size === stashedInfo[1]) {
						stash.files.set(cachingPath, stashedInfo)
						stash.fileNames.push(stashedPath)
					} else {
						const hash = await fs.hash(stashedPath)

						stashedInfo[0] = stat.mtimeMs
						stashedInfo[1] = stat.size

						if (stashedInfo[2] !== hash) {
							stashedInfo[2] = hash

							const relativePath = path.toRelativePath(paths.rootDir, stashedPath)
							const targetedPath = path.toPath(paths.distDir, relativePath)

							stash.shouldUpdate = true
							stash.files.set(cachingPath, stashedInfo)
							stash.fileNames.push(targetedPath)

							operations.files.push(async () => await fs.copyFile(stashedPath, targetedPath))
						}
					}
				})
			}
		}

		for (const globbedFile of globbedFiles) {
			if (!Object.hasOwn(stash.cache, globbedFile)) {
				const cachingPath = path.toRelativePath(paths.workDir, globbedFile)
				const relativePath = path.toRelativePath(paths.rootDir, globbedFile)
				const targetedPath = path.toPath(paths.distDir, relativePath)

				operations.cache.push(async () => {
					const [stat, hash] = await Promise.all([fs.getFileStats(globbedFile), fs.hash(globbedFile)])

					stash.shouldUpdate = true
					stash.files.set(cachingPath, [stat.mtimeMs, stat.size, hash])
					stash.fileNames.push(targetedPath)
				})

				operations.files.push(async () => await fs.copyFile(globbedFile, targetedPath))
			}
		}

		return this.#operate(operations.cache)
	}

	async saveCache(): Promise<void> {
		const { cache, operations, paths, stash } = this.#internals

		if (stash.shouldUpdate) {
			cache.fileNames = [...stash.files.keys()]
			cache.fileInfos = [...stash.files.values()]

			await fs.ensureFileDir(paths.cacheFile, ...stash.fileNames)

			await Promise.all([fs.writeFile(paths.cacheFile, json.to(cache)), this.#operate(operations.files)])
		}
	}

	async #operate(operations: FileOperation[]): Promise<void> {
		await Promise.all(operations.splice(0).map(operate))
	}
}

const isCacheFileName = (fileName: unknown): fileName is string => typeof fileName === "string"
const isCacheFileInfo = (fileInfo: unknown): fileInfo is FileCache =>
	Array.isArray(fileInfo) &&
	fileInfo.length === 3 &&
	typeof fileInfo[0] === "number" &&
	typeof fileInfo[1] === "number" &&
	typeof fileInfo[2] === "string"

const operate = (operation: FileOperation) => operation()

export interface Cache {
	fileNames: string[]
	fileInfos: FileCache[]
	version: string
}

export type FileCache = [time: number, size: number, hash: string]

export type FileOperation = () => Promise<void>

// const emptyBuffer = Buffer.from([])

export interface CopyOptions {
	cacheFile?: string | undefined
	workDir?: string | undefined
	rootDir?: string | undefined
	distDir?: string | undefined
	include?: string | undefined | (string | undefined)[]
	exclude?: string | undefined | (string | undefined)[]
}

// #region Types

// export interface CacheRecord extends Record<string, CacheEntry> {}

// export type { CacheEntry }

export interface FileStats {
	mtime: number
	size: number
}

export interface CopyBuildInfo {
	fileNames: string[]
	fileInfos: CopyFileInfo[]
	version: string
}

export type CopyFileInfo = [time: number, size: number, hash: string]

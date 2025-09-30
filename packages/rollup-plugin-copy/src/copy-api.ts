import { glob, readFile, stat, writeFile } from "node:fs/promises"
import { getFileHashAndData } from "@jsxtools/rollup-plugin-utils/get-file-hash"
import { toArray } from "@jsxtools/rollup-plugin-utils/options"
import { relative, resolve, resolveDir } from "@jsxtools/rollup-plugin-utils/path"

const enum Default {
	CacheFile = "cpconfig.cpbuildinfo",
	RootDir = "src",
	DistDir = "dist",
	WorkDir = ".",
}

export class CopyAPI {
	/** Working directory. */
	workDir = resolveDir(Default.WorkDir)

	/** Source directory. */
	rootDir = resolveDir(Default.WorkDir, Default.RootDir)

	/** Destination directory. */
	distDir = resolveDir(Default.WorkDir, Default.DistDir)

	/** File patterns to include. */
	include = [] as string[]

	/** File patterns to exclude. */
	exclude = [] as string[]

	/** Cache file. */
	cacheFile = resolve(Default.WorkDir, Default.CacheFile)

	cache = Object.create(null) as CacheRecord
	watchedFiles = [] as string[]
	changedFiles = [] as string[]

	/** Files read during build. */
	fileContents = new Map<string, Buffer>()

	init(userOptions = null as never as CopyOptions): void {
		this.workDir = resolveDir(userOptions?.workDir ?? Default.WorkDir)
		this.rootDir = resolveDir(this.workDir, userOptions?.rootDir ?? Default.RootDir)
		this.distDir = resolveDir(this.workDir, userOptions?.distDir ?? Default.DistDir)

		this.include = toArray(userOptions?.include).map(String)
		this.exclude = toArray(userOptions?.exclude).map(String)

		this.cacheFile = resolve(this.workDir, userOptions?.cacheFile ?? Default.CacheFile)
	}

	async captureWatchedFiles(): Promise<void> {
		this.watchedFiles = []

		for await (const filePath of glob(this.include, {
			cwd: this.workDir,
			exclude: this.exclude,
		})) {
			this.watchedFiles.push(`./${filePath}`)
		}
	}

	async captureChangedFiles(): Promise<void> {
		const awaited: Promise<void>[] = []

		this.changedFiles = []

		for (const watchedFile of this.watchedFiles) {
			awaited.push(
				this.hasFileChanged(watchedFile).then((hasChanged) => {
					if (hasChanged) {
						this.changedFiles.push(watchedFile)
					}
				}),
			)
		}

		await Promise.all(awaited)
	}

	async loadConfig(): Promise<CacheRecord> {
		const cacheRecord = Object.create(null) as CacheRecord

		try {
			const cacheRecordJson = await readFile(this.cacheFile, "utf-8")

			Object.assign(cacheRecord, JSON.parse(cacheRecordJson))
		} catch {
			// Cache file doesn't exist or is invalid, continue with empty cache
		} finally {
			this.cache = cacheRecord
		}

		return this.cache
	}

	async saveConfig(): Promise<void> {
		await writeFile(this.cacheFile, JSON.stringify(this.cache))
	}

	async getFileStats(filePath: string): Promise<FileStats | null> {
		try {
			const fileStats = await stat(resolve(this.workDir, filePath))

			return {
				mtime: fileStats.mtimeMs,
				size: fileStats.size,
			}
		} catch {
			return null
		}
	}

	async hasFileChanged(filePath: string): Promise<boolean> {
		const stats = await this.getFileStats(filePath)

		// return false if the file doesn't exist
		if (stats === null) {
			return false
		}

		const resolvedPath = resolve(this.workDir, filePath)

		// return true if the file is not in the cache
		if (!(filePath in this.cache)) {
			const { hash, data } = await getFileHashAndData(resolvedPath)

			this.cache[filePath] = { ...stats, hash }

			// store uncached data to avoid re-reading
			this.fileContents.set(filePath, data ?? emptyBuffer)

			return true
		}

		const oldEntry = this.cache[filePath]!
		const newEntry = { ...oldEntry, ...stats } as CacheEntry

		// return false if the file has not changed modified time or size
		if (oldEntry.mtime === newEntry.mtime && oldEntry.size === newEntry.size) {
			return false
		}

		const { hash, data } = await getFileHashAndData(resolvedPath)

		newEntry.hash = hash

		// return false if the hash has not changed
		if (oldEntry.hash === newEntry.hash) {
			return false
		}

		this.cache[filePath] = newEntry

		// store uncached data to avoid re-reading
		this.fileContents.set(filePath, data ?? emptyBuffer)

		return true
	}

	getAbsolutePath(filePath: string, basePath = this.rootDir): string {
		return resolve(basePath, filePath)
	}

	getRelativePath(filePath: string, basePath = this.rootDir): string {
		return relative(basePath, filePath)
	}

	/**
	 * Get cached file content if available, otherwise read from disk.
	 * This avoids double reads when content was already loaded during hash calculation.
	 */
	async getFileContent(filePath: string): Promise<Buffer> {
		const cachedContent = this.fileContents.get(filePath)

		if (cachedContent) {
			return cachedContent
		}

		// Fallback to reading from disk if not cached
		return await readFile(resolve(this.workDir, filePath))
	}

	/**
	 * Clear the file contents cache to free memory after processing.
	 * Should be called after all files have been emitted.
	 */
	clearFileContentsCache(): void {
		this.fileContents.clear()
	}
}

const emptyBuffer = Buffer.from([])

export interface CopyOptions {
	cacheFile?: string
	workDir?: string
	rootDir?: string
	distDir: string
	include?: string | string[]
	exclude?: string | string[]
}

// #region Types

export interface CacheRecord extends Record<string, CacheEntry> {}

export interface CacheEntry {
	hash: string | null
	mtime: number
	size: number
}

export interface FileStats {
	mtime: number
	size: number
}

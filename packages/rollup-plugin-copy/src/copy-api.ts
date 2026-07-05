import * as array from "@jsxtools/rollup-plugin-utils/array";
import * as fs from "@jsxtools/rollup-plugin-utils/file";
import * as json from "@jsxtools/rollup-plugin-utils/json";
import * as path from "@jsxtools/rollup-plugin-utils/path";
import * as str from "@jsxtools/rollup-plugin-utils/string";

const enum Default {
	CacheFile = "cpconfig.cpbuildinfo",
	RootDir = "src",
	DistDir = "dist",
	WorkDir = "",
}

export class CopyAPI {
	#cache: Cache = createCache();
	#cachedInfoBySourceFileName = new Map<string, FileCache>();
	#cacheFile = path.toURL(Default.WorkDir, Default.CacheFile);
	#distDir = path.toDirURL(Default.WorkDir, Default.DistDir);
	#pendingFileOperations: FileOperation[] = [];
	#glob: fs.GlobOptions = {
		include: ["**/*"],
		exclude: ["node_modules"],
	};
	#nextCacheByRelativeSourceFileName = new Map<string, FileCache>();
	#rootDir = path.toDirURL(Default.WorkDir, Default.RootDir);
	#cacheChanged = false;
	#sourceFileNames: string[] = [];
	#sourceFileNameSet = new Set<string>();
	#targetFileNameSet = new Set<string>();
	#workDir = path.toDirURL(Default.WorkDir);

	get cacheFile(): string {
		return this.#cacheFile.pathname;
	}

	files(): AsyncGenerator<string, void, void> {
		return fs.glob({
			cwd: this.#workDir,
			include: this.#glob.include,
			exclude: this.#glob.exclude,
		});
	}

	init(options?: CopyOptions): void {
		const include = array.from(options?.include, str.hasTrimmedValue);
		const exclude = array.from(options?.exclude, str.hasTrimmedValue);

		this.#workDir = path.toDirURL(options?.workDir ?? Default.WorkDir);
		this.#rootDir = path.toDirURL(this.#workDir, options?.rootDir ?? Default.RootDir);
		this.#distDir = path.toDirURL(this.#workDir, options?.distDir ?? Default.DistDir);
		this.#cacheFile = path.toURL(this.#workDir, options?.cacheFile ?? Default.CacheFile);
		this.#glob = {
			include: include.length ? include : ["**/*"],
			exclude: exclude.length ? exclude : ["node_modules"],
		};
	}

	get sourceFiles(): readonly string[] {
		return this.#sourceFileNames;
	}

	hasSourceFile(fileName: string): boolean {
		return this.#sourceFileNameSet.has(fileName);
	}

	async loadCache(): Promise<void> {
		const storedCache = await fs.readJSON<Cache>(this.#cacheFile).catch(() => undefined);

		this.#cache = createCache();
		this.#cachedInfoBySourceFileName.clear();
		this.#cacheChanged = false;

		if (storedCache?.version === this.#cache.version) {
			const fileNames = array.every(storedCache.fileNames, isCacheFileName) ? storedCache.fileNames : [];
			const fileInfos = array.every(storedCache.fileInfos, isCacheFileInfo) ? storedCache.fileInfos : [];

			if (fileNames.length === fileInfos.length) {
				this.#cache.fileNames.push(...fileNames);
				this.#cache.fileInfos.push(...fileInfos);

				for (let index = 0; index < fileNames.length; ++index) {
					this.#cachedInfoBySourceFileName.set(path.toPath(this.#workDir, fileNames[index]), fileInfos[index]);
				}
			}
		}
	}

	async updateCache(): Promise<void> {
		const globbedFiles = await Array.fromAsync(this.files());
		const globbedFileSet = new Set(globbedFiles);
		const cacheOperations: FileOperation[] = [];

		this.#pendingFileOperations = [];
		this.#nextCacheByRelativeSourceFileName.clear();
		this.#cacheChanged = false;
		this.#sourceFileNames = globbedFiles;
		this.#sourceFileNameSet = globbedFileSet;
		this.#targetFileNameSet.clear();

		for (const [sourceFileName, cachedInfo] of this.#cachedInfoBySourceFileName) {
			const relativeSourceFileName = path.toRelativePath(sourceFileName, this.#workDir);
			const targetFileName = this.#targetFileName(sourceFileName);

			if (!globbedFileSet.has(sourceFileName)) {
				this.#cacheChanged = true;
				this.#queueDelete(targetFileName);
				continue;
			}

			cacheOperations.push(async () => {
				const stat = await fs.getFileStats(sourceFileName);

				if (stat.mtimeMs === cachedInfo[0] && stat.size === cachedInfo[1]) {
					const hasTarget = await fs.exists(targetFileName);

					this.#rememberCachedFile(relativeSourceFileName, cachedInfo, targetFileName);

					if (!hasTarget) {
						this.#cacheChanged = true;
						this.#queueCopy(sourceFileName, targetFileName);
					}

					return;
				}

				const hash = await fs.hash(sourceFileName);
				const hasChanged = cachedInfo[2] !== hash;

				let hasTarget = true;

				if (!hasChanged) {
					hasTarget = await fs.exists(targetFileName);
				}

				const nextInfo: FileCache = [stat.mtimeMs, stat.size, hash];

				this.#rememberCachedFile(relativeSourceFileName, nextInfo, targetFileName);
				this.#cacheChanged = true;

				if (hasChanged || !hasTarget) {
					this.#queueCopy(sourceFileName, targetFileName);
				}
			});
		}

		for (const globbedFile of globbedFiles) {
			if (!this.#cachedInfoBySourceFileName.has(globbedFile)) {
				const relativeSourceFileName = path.toRelativePath(globbedFile, this.#workDir);
				const targetFileName = this.#targetFileName(globbedFile);

				cacheOperations.push(async () => {
					const [stat, hash] = await Promise.all([fs.getFileStats(globbedFile), fs.hash(globbedFile)]);

					this.#rememberCachedFile(relativeSourceFileName, [stat.mtimeMs, stat.size, hash], targetFileName);
					this.#cacheChanged = true;
				});

				this.#queueCopy(globbedFile, targetFileName);
			}
		}

		await this.#runOperations(cacheOperations);
	}

	async saveCache(): Promise<void> {
		if (this.#cacheChanged) {
			this.#cache.fileNames = [...this.#nextCacheByRelativeSourceFileName.keys()];
			this.#cache.fileInfos = [...this.#nextCacheByRelativeSourceFileName.values()];

			await fs.ensureFileDir(this.#cacheFile, ...this.#targetFileNameSet);
			await this.#runOperations(this.#pendingFileOperations);
			await fs.writeFile(this.#cacheFile, json.to(this.#cache));

			this.#cachedInfoBySourceFileName = new Map(
				[...this.#nextCacheByRelativeSourceFileName].map(([fileName, info]) => [path.toPath(this.#workDir, fileName), info]),
			);
			this.#pendingFileOperations = [];
			this.#cacheChanged = false;
		}
	}

	#queueCopy(sourceFileName: string, targetFileName: string): void {
		this.#pendingFileOperations.push(async () => {
			await fs.copyFile(sourceFileName, targetFileName);
		});
	}

	#queueDelete(fileName: string): void {
		this.#pendingFileOperations.push(async () => {
			await fs.deleteFile(fileName).catch((error: NodeJS.ErrnoException) => {
				if (error?.code !== "ENOENT") {
					throw error;
				}
			});
		});
	}

	#rememberCachedFile(relativeSourceFileName: string, cacheInfo: FileCache, targetFileName: string): void {
		this.#nextCacheByRelativeSourceFileName.set(relativeSourceFileName, cacheInfo);
		this.#targetFileNameSet.add(targetFileName);
	}

	async #runOperations(operations: FileOperation[]): Promise<void> {
		await Promise.all(
			operations.map(async (operation) => {
				await operation();
			}),
		);
	}

	#targetFileName(sourceFileName: string): string {
		return path.toPath(this.#distDir, path.toRelativePath(sourceFileName, this.#rootDir));
	}
}

const isCacheFileName = (fileName: unknown): fileName is string => typeof fileName === "string";
const isCacheFileInfo = (fileInfo: unknown): fileInfo is FileCache =>
	Array.isArray(fileInfo) && fileInfo.length === 3 && typeof fileInfo[0] === "number" && typeof fileInfo[1] === "number" && typeof fileInfo[2] === "string";

const createCache = (): Cache => ({
	fileNames: [],
	fileInfos: [],
	version: "0.2.0",
});

export interface Cache {
	fileNames: string[];
	fileInfos: FileCache[];
	version: string;
}

export type FileCache = [time: number, size: number, hash: string];

export type FileOperation = () => Promise<void>;

export interface CopyOptions {
	cacheFile?: string | undefined;
	workDir?: string | undefined;
	rootDir?: string | undefined;
	distDir?: string | undefined;
	include?: string | undefined | (string | undefined)[];
	exclude?: string | undefined | (string | undefined)[];
}

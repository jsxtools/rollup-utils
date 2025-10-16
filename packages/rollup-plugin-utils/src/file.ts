import { createHash } from "node:crypto"
import { createReadStream, type Stats } from "node:fs"
import {
	constants as fsConstants,
	copyFile as fsCopyFile,
	glob as fsGlob,
	mkdir as fsMkdir,
	readFile as fsReadFile,
} from "node:fs/promises"
import * as array from "./array.js"
import * as json from "./json.js"
import * as path from "./path.js"

export { readFile, stat as getFileStats, unlink as deleteFile, writeFile } from "node:fs/promises"

/** Copies a file using the fastest method available. */
export const copyFile = async (src: PathLike, dest: PathLike): Promise<void> => {
	try {
		return await fsCopyFile(src, dest, fsConstants.COPYFILE_FICLONE)
	} catch {
		return await fsCopyFile(src, dest)
	}
}

/** Returns an async generator yielding file paths. */
export const glob = (options?: GlobOptions): AsyncGenerator<string, void, void> =>
	(async function* () {
		const globPattern = array.from(options?.include)
		const globOptions = {
			cwd: options?.cwd,
			exclude: array.from(options?.exclude),
		}

		for await (const path of fsGlob(globPattern, globOptions)) {
			yield new URL(path, globOptions.cwd).pathname
		}
	})()

/** Options for `glob`. */
export type GlobOptions = { cwd?: PathLike; include?: string | string[]; exclude: string | string[] }

/** Returns the SHA-256 hash of a file. */
export const hash = async (file: PathLike): Promise<string> => {
	const hash = createHash("sha256")
	const stream = createReadStream(file)

	stream.on("data", (chunk) => hash.update(chunk))

	return new Promise((resolve, reject) => {
		stream.on("end", () => resolve(hash.digest("hex")))
		stream.on("error", reject)
	})
}

/** Creates a directory recursively. */
export const mkdir = async (path: PathLike): Promise<string | undefined> => fsMkdir(path, { recursive: true })

/** Ensures directories for the given file or files exist. */
export const ensureFileDir = async (...files: PathLike[]): Promise<void> => {
	const fileDirs = files.map(path.toParentURL).sort(__reverseSortURL)
	const makeDirs = [] as URL[]

	for (const fileDir of fileDirs) {
		if (makeDirs.every(({ pathname }) => !pathname.startsWith(fileDir.pathname))) {
			makeDirs.push(fileDir)
		}
	}

	await Promise.all(makeDirs.map((makeDir) => fsMkdir(makeDir, { recursive: true })))
}

/** Reads a file as parsed JSON. */
export const readJSON = <T>(file: PathLike) => fsReadFile(file, "utf-8").then((data) => json.from<T>(data)!)

// #region Types

export type FileStats = Stats
export type PathLike = path.PathLike

// #region Internals

const __reverseSortURL = ({ pathname: a }: URL, { pathname: b }: URL): -1 | 0 | 1 => (a > b ? -1 : a < b ? 1 : 0)

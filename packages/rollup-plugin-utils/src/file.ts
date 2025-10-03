import { createHash } from "node:crypto"
import { createReadStream, type Stats } from "node:fs"
import {
	constants,
	copyFile,
	glob as globWithNode,
	mkdir as mkdirWithNode,
	readFile as readFileWithNode,
} from "node:fs/promises"
import * as array from "./array.js"
import * as json from "./json.js"
import type { PathLike } from "./path.js"

export { readFile, stat as getFileStats, unlink as deleteFile, writeFile } from "node:fs/promises"

/** Copies a file using the fastest method available. */
export const copy = async (src: PathLike, dest: PathLike): Promise<void> => {
	try {
		return copyFile(src, dest, constants.COPYFILE_FICLONE)
	} catch {
		return copyFile(src, dest)
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

		for await (const path of globWithNode(globPattern, globOptions)) {
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
export const mkdir = async (path: PathLike): Promise<string | undefined> => mkdirWithNode(path, { recursive: true })

/** Reads a file as parsed JSON. */
export const readJSON = <T>(file: PathLike) => readFileWithNode(file, "utf-8").then((data) => json.from<T>(data)!)

// #region Types

export type FileStats = Stats

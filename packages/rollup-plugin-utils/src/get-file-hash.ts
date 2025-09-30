import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { readFile } from "node:fs/promises"

/** Returns a SHA-1 hash of the given file path. */
export const getFileHash = async (filePath: string): Promise<string | null> =>
	new Promise<string | null>((resolve) => {
		const sha1Hash = createHash("sha1")
		const stream = createReadStream(filePath)

		stream.on("data", (chunk) => sha1Hash.update(chunk))
		stream.on("error", () => resolve(null))
		stream.on("end", () => resolve(sha1Hash.digest("hex")))
	})

/** Returns both a SHA-1 hash and the file content from a single file read. */
export const getFileHashAndData = async (filePath: string): Promise<FileHashAndData> => {
	try {
		const data = await readFile(filePath)
		const hash = createHash("sha1").update(data).digest("hex")

		return { hash, data }
	} catch {
		return { hash: null, data: null }
	}
}

export type FileHashAndData =
	| {
			hash: string
			data: Buffer
	  }
	| {
			hash: null
			data: null
	  }

import { isAbsolute as isAbsoluteByOS, sep as sepByOS } from "node:path"
import { resolve, sep } from "node:path/posix"
import { fileURLToPath, pathToFileURL } from "node:url"

/** Returns the file path with a trailing slash. */
export const toDirPath = (path: PathLike, ...parts: PathLike[]) => __toPath(toDirURL(path, ...parts))

/** Returns a resolved URL of a directory from any path. */
export const toDirURL = (path: PathLike, ...parts: PathLike[]) => __toDirFromURL(toURL(path, ...parts))

/** Returns the parent directory path of the given path. */
export const toParentPath = (path: PathLike) => __toPath(toParentURL(path))

/** Returns the parent directory URL of the given path. */
export const toParentURL = (path: PathLike) => toURL(path, "./")

/** Returns a resolved, posix path from any path. */
export const toPath = (path: PathLike, ...parts: PathLike[]): string => __toPath(toURL(path, ...parts))

/** Returns a URL from any path. */
export const toURL = (path: PathLike, ...parts: PathLike[]): URL => __withPartsFromURL(__toURL(path), parts)

/** Returns the given path relative to the base path. */
export const toRelativePath = (path: PathLike, base: PathLike, opts = null as never as RelativePathOptions): string => {
	opts = {
		explicit: true,
		matchOS: false,
		...opts,
	}

	base = __toURL(base)
	path = __withPartsFromURL(base, [path])

	/** Base path segments (omitting the root segment and last segment). */
	const baseParts = base.pathname.split("/").slice(1, -1)

	/** Path path segments (omitting the root segment). */
	const pathParts = path.pathname.split("/").slice(1)

	let shared = 0

	const max = Math.min(baseParts.length, pathParts.length)

	while (shared < max && baseParts[shared] === pathParts[shared]) {
		++shared
	}

	const up = baseParts.length - shared
	const dir = opts.matchOS ? sepByOS : sep
	const tail = pathParts.slice(shared).join(dir)

	return (up ? `..${dir}`.repeat(up) : opts.explicit ? `.${dir}` : "") + tail
}

export const toNativePath = (path: PathLike, force = true): string =>
	fileURLToPath(__toURL(path), { windows: force ? undefined : false })

// #region Types

export { sep, sepByOS }

export type PathLike = string | URL

export type RelativePathOptions = {
	explicit?: boolean
	matchOS?: boolean
}

// #region Internals

const __toPath = (url: URL): string => decodeURIComponent(url.pathname)

const __toURL = (path: PathLike) =>
	path instanceof URL
		? path
		: path.startsWith("file:")
			? new URL(path)
			: isAbsoluteByOS(path)
				? pathToFileURL(path)
				: pathToFileURL(resolve(path))

const __toDirFromURL = (url: URL) =>
	url.pathname.endsWith("/") ? url : new URL(`${url.pathname}/${url.search}${url.hash}`, url)

const __withPartsFromURL = (url: URL, parts: PathLike[]) => {
	for (const part of parts) {
		url = new URL(part, url)
	}

	return url
}

import { isAbsolute as isAbsoluteByOS, sep as sepByOS } from "node:path"
import { resolve, sep } from "node:path/posix"
import { pathToFileURL } from "node:url"

/** Returns the file path with a trailing slash. */
export const toDirPath = (path: PathLike, ...parts: PathLike[]) => toDirURL(path, ...parts).pathname

/** Returns a resolved URL of a directory from any path. */
export const toDirURL = (path: PathLike, ...parts: PathLike[]) => __toDirURL(toURL(path, ...parts))

/** Returns the parent directory path of the given path. */
export const toParentPath = (path: PathLike) => toParentURL(path).pathname

/** Returns the parent directory URL of the given path. */
export const toParentURL = (path: PathLike) => toURL(path, "./")

/** Returns a resolved, posix path from any path. */
export const toPath = (path: PathLike, ...parts: PathLike[]): string => toURL(path, ...parts).pathname

/** Returns a URL from any path. */
export const toURL = (path: PathLike, ...parts: PathLike[]): URL => __withURLParts(__toURL(path), parts)

/** Returns the given path relative to the base path. */
export const toRelativePath = (base: PathLike, path: PathLike, matchOS = false): string => {
	base = __toURL(base)
	path = __withURLParts(base, [path])

	const baseParts = base.pathname.slice(1).split("/")
	const pathParts = path.pathname.slice(1).split("/") // <-- use path, not base

	// Remove the trailing "" segment if base ends with a slash
	if (base.pathname.endsWith("/")) {
		baseParts.pop()
	}

	let shared = 0
	const max = Math.min(baseParts.length, pathParts.length)

	while (shared < max && baseParts[shared] === pathParts[shared]) {
		++shared
	}

	const up = baseParts.length - shared
	const dir = matchOS ? sepByOS : sep
	const tail = pathParts.slice(shared).join(dir)

	return (up ? `..${dir}`.repeat(up) : `.${dir}`) + tail
}

export const toPathWithoutBase = (path: PathLike, base: PathLike): string => (
	(base = __toDirURL(__toURL(base))),
	(path = __withURLParts(base, [path]).pathname),
	path.startsWith(base.pathname) ? path.slice(base.pathname.length) : path
)

// #region Types

export type PathLike = string | URL

// #region Internals

const __toURL = (path: PathLike) =>
	path instanceof URL
		? path
		: path.startsWith("file:")
			? new URL(path)
			: isAbsoluteByOS(path)
				? pathToFileURL(path)
				: pathToFileURL(resolve(path))

const __toDirURL = (url: URL) =>
	url.pathname.endsWith("/") ? url : new URL(`${url.pathname}/${url.search}${url.hash}`, url)

const __withURLParts = (url: URL, parts: PathLike[]) => {
	for (const part of parts) {
		url = new URL(part, url)
	}

	return url
}

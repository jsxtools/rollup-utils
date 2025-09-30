declare module "typescript" {
	/** Returns the directory of a file path. */
	export function getDirectoryPath(path: string): string;

	/** Normalizes a file path to posix. */
	export function normalizePath(path: string): string;

	/** . */
	export function resolvePath(path: string): string;

	/** . */
	export function combinePaths(path: string, ...paths: string[]): string;

	/** . */
	export function getAnyExtensionFromPath(path: string, extensions?: string[], ignoreCase?: boolean): string;

	/** . */
	export function getRelativePathFromDirectory(directory: string, relativeTo: string, ignoreCase?: boolean): string;

	/** . */
	export function getCommonSourceDirectory(
		options: CompilerOptions,
		emittedFiles: () => readonly string[],
		currentDirectory: string,
		getCanonicalFileName: GetCanonicalFileName,
		checkSourceFilesBelongToPath?: (commonSourceDirectory: string) => void
	): string;

	export type GetCanonicalFileName = (fileName: string) => string;
}

export {};

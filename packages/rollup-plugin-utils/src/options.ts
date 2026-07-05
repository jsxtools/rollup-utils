import * as array from "./array.js";

/** Assigns an input to Rollup input options. */
export const assignInput = <T extends InputOption>(input: T, id: string): T => {
	if (Array.isArray(input)) {
		if (!input.includes(id)) {
			input.push(id);
		}
	} else {
		input[id] = id;
	}

	return input;
};

/** Assigns an input to Rollup options. */
export const assignOptionsInput = (options: RollupOptionsLike, id: string): InputOption => assignInput(normalizeOptionsInput(options), id);

/** Normalizes Rollup input options. */
export const normalizeOptionsInput = (options: RollupOptionsLike): InputOption => {
	options.input = options.input ?? [];
	options.input = typeof options.input === "object" ? options.input : [options.input];

	return options.input;
};

/** Returns the dist and root directories from Rollup output options. */
export const getDirs = (options: RollupOptionsLike): Dirs => {
	const dirs: Dirs = {};

	for (const output of array.from(options.output)) {
		dirs.distDir ??= output.dir;
		dirs.rootDir ??= output.preserveModulesRoot;

		if (dirs.distDir && dirs.rootDir) {
			break;
		}
	}

	return dirs;
};

/** Normalized Rollup input option. */
export type InputOption = Record<string, string> | string[];

/** Rollup-compatible options used by these utilities. */
export interface RollupOptionsLike {
	input?: InputOption | string | null;
	output?: OutputOptionsLike | OutputOptionsLike[] | null;
}

/** Rollup-compatible output options used by these utilities. */
export interface OutputOptionsLike {
	dir?: string;
	preserveModulesRoot?: string;
}

export interface Dirs {
	distDir?: string;
	rootDir?: string;
}

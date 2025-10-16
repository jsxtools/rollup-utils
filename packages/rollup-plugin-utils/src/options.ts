import type { RollupOptions } from "rollup"
import * as array from "./array.js"

/** Assigns an input to Rollup input options. */
export const assignInput = <T extends InputOption>(input: T, id: string): T => {
	if (Array.isArray(input)) {
		if (!input.includes(id)) {
			input.push(id)
		}
	} else {
		input[id] = id
	}

	return input
}

/** Assigns an input to Rollup options. */
export const assignOptionsInput = (options: RollupOptions, id: string): InputOption =>
	assignInput(normalizeOptionsInput(options), id)

/** Normalizes Rollup input options. */
export const normalizeOptionsInput = (options: RollupOptions): InputOption => {
	options.input = options.input ?? []
	options.input = typeof options.input === "object" ? options.input : [options.input]

	return options.input
}

/** Returns the dist and root directories from Rollup output options. */
export const getDirs = (options: RollupOptions) => ({
	distDir: array.from(options.output).find((output) => output.dir)?.dir,
	rootDir: array.from(options.output).find((output) => output.preserveModulesRoot)?.preserveModulesRoot,
})

/** Normalized Rollup input option. */
export type InputOption = Record<string, string> | string[]

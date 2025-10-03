import type { RollupOptions } from "rollup"
import * as array from "./array.js"

export const assignInput = <T extends string[] | Record<string, string>>(input: T, id: string): T => {
	if (Array.isArray(input)) {
		input.push(id)
	} else {
		input[id] = id
	}

	return input
}

export const getDirs = (options: RollupOptions) => ({
	distDir: array.from(options.output).find((output) => output.dir)?.dir,
	rootDir: array.from(options.output).find((output) => output.preserveModulesRoot)?.preserveModulesRoot,
})

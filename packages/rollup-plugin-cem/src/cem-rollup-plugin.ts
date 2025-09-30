import { toArray } from "@jsxtools/rollup-plugin-utils/options"
import type { Plugin, RollupOptions } from "rollup"
import { CemAPI, type CemOptions } from "./cem-api.js"

export const rollupPluginCem = (userOptions?: CemOptions): Plugin => {
	const cem = new CemAPI()

	let firstRun = false

	return {
		name: "rollup-plugin-cem",
		options(options: RollupOptions): void {
			if (!firstRun) {
				cem.init({
					distDir: toArray(options.output).find((output) => output.dir)?.dir,
					rootDir: toArray(options.output).find((output) => output.preserveModulesRoot)?.preserveModulesRoot,
					...userOptions,
				})
			}
		},
		transform: {
			order: "post",
			handler(_code, id): null {
				const sourceFile = this.getModuleInfo(id)?.meta?.tsc?.sourceFile

				if (sourceFile) {
					cem.modules.add(sourceFile)
				}

				return null
			},
		},
		writeBundle(): void {
			firstRun = false

			cem.updateManifest()
		},
	}
}

export type { CemOptions }

export { catalystPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst/catalyst"
export { catalystPlugin2 } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst-major-2/catalyst"
export { fastPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/fast/fast"
export { litPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/lit/lit"
export { stencilPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/stencil/stencil"

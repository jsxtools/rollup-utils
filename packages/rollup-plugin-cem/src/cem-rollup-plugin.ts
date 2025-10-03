import { getDirs } from "@jsxtools/rollup-plugin-utils/options"
import type { Plugin, RollupOptions } from "rollup"
import { CemAPI, type CemOptions } from "./cem-api.js"

export const rollupPluginCem = (pluginOptions?: CemOptions): Plugin => {
	const api = new CemAPI()

	let firstRun = false

	return {
		name: "rollup-plugin-cem",
		options(options: RollupOptions): RollupOptions {
			if (!firstRun) {
				api.init({
					...getDirs(options),
					...pluginOptions,
				})
			}

			return options
		},
		transform: {
			order: "post",
			handler(_code, id): null {
				const sourceFile = this.getModuleInfo(id)?.meta?.tsc?.sourceFile

				if (sourceFile) {
					api.modules.add(sourceFile)
				}

				return null
			},
		},
		writeBundle(): void {
			firstRun = false

			api.updateManifest()
		},
	}
}

export type { CemOptions }

export { catalystPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst/catalyst"
export { catalystPlugin2 } from "@jsxtools/cem-analyzer/features/framework-plugins/catalyst-major-2/catalyst"
export { fastPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/fast/fast"
export { litPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/lit/lit"
export { stencilPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/stencil/stencil"

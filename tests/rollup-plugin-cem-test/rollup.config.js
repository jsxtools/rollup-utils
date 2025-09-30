// @ts-check

import { rollupPluginCem } from "@jsxtools/rollup-plugin-cem"
import { rollupPluginTsc } from "@jsxtools/rollup-plugin-tsc"
import { defineConfig } from "rollup"

export default defineConfig({
	output: {
		dir: "dist",
		format: "es",
		preserveModules: true,
		preserveModulesRoot: "src",
		sourcemap: true,
	},
	context: "globalThis",
	treeshake: false,
	plugins: [
		rollupPluginTsc(),
		rollupPluginCem(),
		{
			name: "report-bundle-files-written",
			writeBundle(_options, bundle) {
				console.log("Files written", Object.keys(bundle).length)
			},
		},
	],
})

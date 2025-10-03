// @ts-check

import { rollupPluginCopy } from "@jsxtools/rollup-plugin-copy"
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
		rollupPluginCopy({
			include: ["src/*.css"],
		}),
		{
			name: "report-bundle-files-written",
			writeBundle(_options, bundle) {
				console.log("Files written", Object.keys(bundle).length)
			},
		},
	],
})

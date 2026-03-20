// @ts-check

import { rollupPluginTsc } from "@jsxtools/rollup-plugin-tsc";
import { rollupPluginTscResolve } from "@jsxtools/rollup-plugin-tsc-resolve";
import { defineConfig } from "rollup";

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
		rollupPluginTscResolve(),
		rollupPluginTsc(),
		{
			name: "report-bundle-files-written",
			writeBundle(_options, bundle) {
				console.log("Files written", Object.keys(bundle).length);
			},
		},
	],
});

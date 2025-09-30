// @ts-check

import { globSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "rollup"

const pathToCreate = import.meta.resolve("@custom-elements-manifest/analyzer/src/create.js")
const pathToSrc = new URL("./", pathToCreate)

export default defineConfig({
	input: {
		create: fileURLToPath(pathToCreate),
	},
	output: {
		dir: "dist",
		format: "es",
		preserveModules: true,
		preserveModulesRoot: pathToSrc.pathname,
		sourcemap: false,
	},
	context: "globalThis",
	treeshake: false,
	external(id) {
		const isExternal =
			!id.startsWith("/") && !id.startsWith(".") && !id.startsWith("@custom-elements-manifest/analyzer")

		return isExternal
	},
	plugins: [
		{
			name: "compile-cem-analyzer",
			generateBundle() {
				for (const file of globSync("**/*.ts", { cwd: "src" })) {
					this.emitFile({
						type: "asset",
						fileName: file.replace(".ts", ".d.ts"),
						source: readFileSync(resolve("src", file), "utf8"),
					})
				}
			},
		},
	],
})

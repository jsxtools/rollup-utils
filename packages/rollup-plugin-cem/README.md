# @jsxtools/rollup-plugin-cem

> Generate Custom Elements Manifests from the TypeScript modules already passing through your build.

`@jsxtools/rollup-plugin-cem` is a Rollup, Rolldown, and Vite-compatible plugin for generating a [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest). It pairs with [`@jsxtools/rollup-plugin-tsc`](../rollup-plugin-tsc), which exposes TypeScript program metadata through module metadata.

## Highlights

- Reads TypeScript AST metadata from `@jsxtools/rollup-plugin-tsc` instead of reparsing files.
- Merges newly analyzed modules into an existing `custom-elements.json` manifest.
- Exposes API state needed by external tools that inspect or validate generated manifests.
- Supports include/exclude patterns for source-level control.
- Re-exports analyzer plugins for Lit, FAST, Stencil, and GitHub Catalyst.
- Works in Rollup-compatible plugin pipelines, including Rolldown and Vite.

## Install

```shell
npm install --save-dev @jsxtools/rollup-plugin-cem @jsxtools/rollup-plugin-tsc typescript
```

## Quick start

```javascript
import { rollupPluginCem } from "@jsxtools/rollup-plugin-cem";
import { rollupPluginTsc } from "@jsxtools/rollup-plugin-tsc";

const tsc = rollupPluginTsc.getOutputOptions();

export default {
	output: {
		dir: tsc.outDir,
		format: "es",
	},
	plugins: [
		rollupPluginTsc(),
		rollupPluginCem({
			manifestFile: "dist/custom-elements.json",
		}),
	],
};
```

Place `rollupPluginCem()` after `rollupPluginTsc()` so the CEM plugin can read TypeScript AST metadata from compiled modules.

## Options

| Option         | Default                           | Description                                                |
| -------------- | --------------------------------- | ---------------------------------------------------------- |
| `workDir`      | `.`                               | Base directory used to resolve paths.                      |
| `rootDir`      | `src`                             | Source root for Rollup-derived directory defaults.         |
| `distDir`      | `dist`                            | Output directory used when `manifestFile` is omitted.      |
| `manifestFile` | `${distDir}/custom-elements.json` | Manifest file to read, merge, and write.                   |
| `include`      | `**`                              | Glob pattern or patterns for source files to analyze.      |
| `exclude`      | none                              | Glob pattern or patterns for source files to skip.         |
| `modules`      | none                              | TypeScript `SourceFile` objects for programmatic analysis. |
| `plugins`      | none                              | Custom Elements Manifest analyzer plugins.                 |

When Rollup output options provide `output.dir` or `output.preserveModulesRoot`, those values are used as `distDir` and `rootDir` unless explicitly overridden.

## Framework plugins

```javascript
import { litPlugin, rollupPluginCem } from "@jsxtools/rollup-plugin-cem";

export default {
	plugins: [
		rollupPluginCem({
			plugins: [litPlugin()],
		}),
	],
};
```

Available re-exports include `litPlugin`, `fastPlugin`, `stencilPlugin`, `catalystPlugin`, and `catalystPlugin2`.

## Building validation tools

This package does not ship validation rules or a validation plugin hook. Instead, it exposes the generated manifest, analyzed source files, and TypeScript compiler objects so separate tools can validate however they want.

Standalone CLIs can compose `TscAPI`, `CemAPI`, and analyzer plugins directly:

```javascript
import { CemAPI, getSourceFileNameFromModulePath, getSourceFilesByFileName } from "@jsxtools/rollup-plugin-cem/api";
import { TscAPI } from "@jsxtools/rollup-plugin-tsc/api";

const tsc = new TscAPI();
tsc.init();

const cem = new CemAPI();
cem.init({ modules: tsc.getSourceFiles(), program: tsc.program, typeChecker: tsc.typeChecker });
await cem.generate();

const issues = await validateManifest({
	manifest: cem.manifest,
	program: cem.program,
	sourceFileNameFromModulePath: getSourceFileNameFromModulePath,
	sourceFilesByFileName: getSourceFilesByFileName(cem.sourceFiles),
	sourceFiles: cem.sourceFiles,
	typeChecker: cem.typeChecker,
});

if (issues.length) {
	console.error(issues.join("\n"));
	process.exit(1);
}
```

Rollup users can also write a separate validation plugin that reads `meta.tsc` metadata from modules and validates after `rollupPluginCem()` writes the manifest.

```javascript
import fs from "node:fs/promises";
import { getSourceFileNameFromModulePath, getSourceFilesByFileName } from "@jsxtools/rollup-plugin-cem/api";

const validateCem = () => {
	const sourceFiles = [];
	let program;
	let typeChecker;

	return {
		name: "validate-cem",
		generateBundle() {
			for (const id of this.getModuleIds()) {
				const tsc = this.getModuleInfo(id)?.meta?.tsc;

				if (tsc?.sourceFile) sourceFiles.push(tsc.sourceFile);
				program ??= tsc?.program;
				typeChecker ??= tsc?.typeChecker;
			}
		},
		async writeBundle() {
			const manifest = JSON.parse(await fs.readFile("dist/custom-elements.json", "utf8"));
			const issues = await validateManifest({ manifest, sourceFiles, sourceFileNameFromModulePath: getSourceFileNameFromModulePath, sourceFilesByFileName: getSourceFilesByFileName(sourceFiles), program, typeChecker });

			if (issues.length) this.error(issues.join("\n"));
		},
	};
};
```

## API

```javascript
import { CemAPI, getSourceFileNameFromModulePath, getSourceFilesByFileName } from "@jsxtools/rollup-plugin-cem/api";

const cem = new CemAPI();

cem.init({
	modules: sourceFiles,
	program,
	plugins: [],
	typeChecker,
});

await cem.updateManifest();
await validateManifest({
	manifest: cem.manifest,
	program: cem.program,
	sourceFileNameFromModulePath: getSourceFileNameFromModulePath,
	sourceFilesByFileName: getSourceFilesByFileName(cem.sourceFiles),
	sourceFiles: cem.sourceFiles,
	typeChecker: cem.typeChecker,
});
```

## Peer dependencies

- `rollup` `^4.59.0` — optional for compatible hosts.

## License

[MIT-0](../../LICENSE.md)

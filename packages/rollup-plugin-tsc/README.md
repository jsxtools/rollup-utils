# @jsxtools/rollup-plugin-tsc

> Compile TypeScript once, then hand real chunks and metadata to your bundler.

`@jsxtools/rollup-plugin-tsc` is a Rollup, Rolldown, and Vite-compatible plugin built on the TypeScript Compiler API. It reads `tsconfig.json`, supports incremental builds, emits JavaScript, declarations, sourcemaps, build artifacts, and exposes TypeScript program metadata to downstream plugins.

## Highlights

- Discovers source files from `tsconfig.json`, so bundler inputs do not need to be redeclared.
- Emits TypeScript-computed JavaScript outputs as real bundler chunks.
- Preserves declaration files, declaration maps, sourcemaps, JSON imports, and build info files.
- Supports project references and custom TypeScript transformers.
- Reports TypeScript diagnostics through the bundler.
- Attaches each module's TypeScript AST, `Program`, and `TypeChecker` at `moduleInfo.meta.tsc`.

## Install

```shell
npm install --save-dev @jsxtools/rollup-plugin-tsc typescript
```

## Quick start

```javascript
import { rollupPluginTsc } from "@jsxtools/rollup-plugin-tsc";

const tsc = rollupPluginTsc.getOutputOptions();

export default {
	output: {
		dir: tsc.outDir,
		format: "es",
	},
	plugins: [rollupPluginTsc()],
};
```

`output.dir` must match TypeScript `compilerOptions.outDir`. Use `rollupPluginTsc.getOutputOptions()` to keep bundler and TypeScript output directories aligned.

## Vite

```javascript
import { rollupPluginTsc } from "@jsxtools/rollup-plugin-tsc";
import { defineConfig } from "vite";

const tsc = rollupPluginTsc.getOutputOptions({
	compilerOptions: {
		outDir: "dist",
		tsBuildInfoFile: "dist/tsconfig.tsbuildinfo",
	},
});

export default defineConfig({
	build: tsc.viteBuild,
	plugins: [
		rollupPluginTsc({
			compilerOptions: tsc.compilerOptions,
		}),
	],
});
```

## Options

| Option               | Default           | Description                                           |
| -------------------- | ----------------- | ----------------------------------------------------- |
| `workDir`            | `.`               | Base directory used to resolve the TypeScript config. |
| `configFile`         | `tsconfig.json`   | TypeScript configuration file to load.                |
| `compilerOptions`    | from config       | Compiler options merged over the loaded config.       |
| `customTransformers` | none              | TypeScript custom transformers passed to emit.        |
| `diagnostics`        | follows `noCheck` | `true`, `false`, `"syntactic"`, or `"semantic"`.      |
| `include`            | from config       | Additional TypeScript include patterns.               |
| `exclude`            | from config       | Additional TypeScript exclude patterns.               |
| `references`         | from config       | Additional TypeScript project references.             |

## TypeScript metadata

Other plugins can read TypeScript compiler objects from Rollup module metadata.

```javascript
const { program, sourceFile, typeChecker } = this.getModuleInfo(id)?.meta?.tsc ?? {};
```

This is how `@jsxtools/rollup-plugin-cem` analyzes TypeScript without reparsing the same files. The `program` and `typeChecker` are useful for downstream analyzers that need symbol-aware template or type analysis.

## API

```javascript
import { TscAPI } from "@jsxtools/rollup-plugin-tsc/api";

const tsc = TscAPI.getOutputOptions();
```

`TscAPI` also exposes `program`, `typeChecker`, `getSourceFile(fileName)`, and `getSourceFiles()`. After `init()`, these lazily create a non-emitting TypeScript program when needed. Calling `emit()` replaces that with the emit builder's program.

`TscAPI.getOutputOptions()` and `rollupPluginTsc.getOutputOptions()` return the same TypeScript-aligned output information, including `outDir`, absolute `outDirPath`, optional `tsBuildInfoFile`, `compilerOptions`, `rollupOutput`, and `viteBuild`.

## Peer dependencies

- `rollup` `^4.59.0` — optional for compatible hosts.
- `typescript` `^5.4.5 || ^6.0.0`.

## License

[MIT-0](../../LICENSE.md)

# @jsxtools/rollup-plugin-copy

> Copy static files only when they change.

`@jsxtools/rollup-plugin-copy` is a Rollup, Rolldown, and Vite-compatible plugin for copying files during a build. It tracks source files with modification times, file sizes, and SHA-256 hashes so repeated builds avoid unnecessary file work.

## Highlights

- Copies matching files while preserving paths relative to `rootDir`.
- Reuses a cache file to skip unchanged files.
- Removes copied outputs when their source files disappear.
- Uses copy-on-write file cloning when the file system supports it.
- Adds copied sources and the cache file to Rollup watch mode.

## Install

```shell
npm install --save-dev @jsxtools/rollup-plugin-copy
```

## Quick start

```javascript
import { rollupPluginCopy } from "@jsxtools/rollup-plugin-copy";

export default {
	input: "src/index.js",
	output: {
		dir: "dist",
		format: "es",
		preserveModulesRoot: "src",
	},
	plugins: [
		rollupPluginCopy({
			include: ["src/**/*.css", "src/**/*.png", "src/**/*.svg"],
			exclude: ["src/**/*.test.*"],
		}),
	],
};
```

The plugin also works in compatible plugin arrays, such as Vite's `plugins` option or Rolldown's Rollup-compatible plugin API.

## Options

| Option      | Default                   | Description                                         |
| ----------- | ------------------------- | --------------------------------------------------- |
| `cacheFile` | `cpconfig.cpbuildinfo`    | File used to persist copy metadata between builds.  |
| `workDir`   | current process directory | Base directory used to resolve paths.               |
| `rootDir`   | `src`                     | Source root used when preserving copied file paths. |
| `distDir`   | `dist`                    | Destination directory for copied files.             |
| `include`   | `**/*`                    | Glob pattern or patterns to copy.                   |
| `exclude`   | `node_modules`            | Glob pattern or patterns to skip.                   |

When Rollup output options provide `output.dir` or `output.preserveModulesRoot`, those values are used as `distDir` and `rootDir` unless explicitly overridden.

## API

```javascript
import { CopyAPI } from "@jsxtools/rollup-plugin-copy/api";

const copy = new CopyAPI();

copy.init({
	rootDir: "src",
	distDir: "dist",
	include: ["src/**/*.css"],
});

await copy.loadCache();
await copy.updateCache();
await copy.saveCache();
```

## Peer dependencies

- `rollup` `^4.59.0` — optional for compatible hosts.

## License

[MIT-0](../../LICENSE.md)

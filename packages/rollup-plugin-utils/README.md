# @jsxtools/rollup-plugin-utils

> Small, typed building blocks for Rollup-compatible plugins.

`@jsxtools/rollup-plugin-utils` is a collection of utility modules used by the packages in this monorepo. Each group is published as a subpath export so plugin authors can import only what they need.

## Highlights

- File helpers for hashing, copying, globbing, JSON reading, and directory creation.
- Path helpers that normalize file URLs and POSIX paths.
- Option helpers for Rollup-compatible input and output options.
- A fast POSIX glob matcher for source filters.
- Small array, JSON, and string helpers for predictable plugin option handling.

## Install

```shell
npm install @jsxtools/rollup-plugin-utils
```

## Exports

| Export                                  | Purpose                                                               |
| --------------------------------------- | --------------------------------------------------------------------- |
| `@jsxtools/rollup-plugin-utils/array`   | Array normalization, merging, and type guards.                        |
| `@jsxtools/rollup-plugin-utils/file`    | File hashing, copying, globbing, JSON reading, and directory helpers. |
| `@jsxtools/rollup-plugin-utils/json`    | Safe JSON parse and stringify helpers.                                |
| `@jsxtools/rollup-plugin-utils/options` | Rollup-compatible input/output option helpers.                        |
| `@jsxtools/rollup-plugin-utils/path`    | POSIX-normalized path and file URL helpers.                           |
| `@jsxtools/rollup-plugin-utils/pattern` | Fast POSIX glob pattern matching.                                     |
| `@jsxtools/rollup-plugin-utils/string`  | String normalization and non-empty string guards.                     |

## Examples

### File utilities

```javascript
import { copyFile, ensureFileDir, glob, hash, readJSON } from "@jsxtools/rollup-plugin-utils/file";

for await (const fileName of glob({
	cwd: new URL(".", import.meta.url),
	include: "src/**/*",
	exclude: ["src/**/*.test.*"],
})) {
	await ensureFileDir(fileName.replace("/src/", "/dist/"));
}

const digest = await hash("src/index.js");
const config = await readJSON("package.json");

await copyFile("src/index.js", "dist/index.js");
```

### Option utilities

```javascript
import { assignOptionsInput, getDirs } from "@jsxtools/rollup-plugin-utils/options";

export default function plugin() {
	return {
		name: "example-plugin",
		options(options) {
			assignOptionsInput(options, "src/generated.js");

			const { distDir, rootDir } = getDirs(options);
		},
	};
}
```

### Pattern utilities

```javascript
import { Pattern, match } from "@jsxtools/rollup-plugin-utils/pattern";

const sourcePattern = new Pattern("src/**/*.ts");

sourcePattern.match("src/components/button.ts");
match("**/*.test.ts", "src/button.test.ts");
```

## API reference

### `array`

- `from(items, predicate?)` — converts a value or array-like option into an array, filtering nullish values by default.
- `merge(a, b)` — concatenates two optional arrays.
- `every(value, predicate)` — checks that a value is an array and every item matches a type guard.
- `isArray(value)` — re-export of `Array.isArray`.

### `file`

- `copyFile(src, dest)` — copies a file, preferring copy-on-write cloning when available.
- `ensureFileDir(...files)` — creates parent directories for one or more file paths.
- `exists(file)` — resolves whether a file exists.
- `glob(options)` — yields matching file paths from Node's `fs.promises.glob`.
- `hash(file)` — returns a SHA-256 digest for a file.
- `mkdir(path)` — creates a directory recursively.
- `readJSON(file)` — reads and parses a JSON file.
- `deleteFile`, `getFileStats`, `readFile`, and `writeFile` — selected `node:fs/promises` helpers.

### `json`

- `from(json, reviver?)` — parses JSON, returning `undefined` when parsing fails.
- `to(value, replacer?, space?)` — stringifies JSON.

### `options`

- `assignInput(input, id)` — adds an id to a normalized Rollup input option.
- `assignOptionsInput(options, id)` — normalizes `options.input` and adds an id.
- `getDirs(options)` — reads `distDir` and `rootDir` from compatible output options.
- `normalizeOptionsInput(options)` — ensures `options.input` is an array or object.

### `path`

- `toDirPath(path, ...parts)` — resolves a directory path with a trailing slash.
- `toDirURL(path, ...parts)` — resolves a directory file URL with a trailing slash.
- `toNativePath(path, force?)` — converts a path or URL to a native file-system path.
- `toParentPath(path)` — resolves a parent directory path.
- `toParentURL(path)` — resolves a parent directory file URL.
- `toPath(path, ...parts)` — resolves a POSIX-normalized file path.
- `toRelativePath(path, base, options?)` — returns a relative path from a base path.
- `toURL(path, ...parts)` — resolves a file URL.

### `pattern`

- `new Pattern(pattern).match(path, includeDot?)` — compiles and matches a POSIX glob pattern.
- `Pattern.match(pattern, path, includeDot?)` — matches with cached compiled patterns.
- `match(pattern, path, includeDot?)` — functional alias for cached matching.

### `string`

- `from(value)` — converts nullish values to an empty string and all other values with `String()`.
- `trim(value)` — converts and trims a value.
- `hasTrimmedValue(value)` — type guard for strings with non-empty trimmed content.

## Peer dependencies

- `rollup` `^4.59.0` — optional for compatible hosts.

## License

[MIT-0](../../LICENSE.md)

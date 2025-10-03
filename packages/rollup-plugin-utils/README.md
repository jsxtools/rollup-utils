# @jsxtools/rollup-plugin-utils

**@jsxtools/rollup-plugin-utils** is a collection of utilities for authoring Rollup plugins.

This package includes utilities for virtual asset management, file operations, path resolution, array/string manipulation, JSON handling, and option processing.

## Installation

```shell
npm install @jsxtools/rollup-plugin-utils
```

## Usage

This package provides several utility modules that can be imported individually:

```javascript
import * as fs from '@jsxtools/rollup-plugin-utils/file'
import * as arr from '@jsxtools/rollup-plugin-utils/array'
import * as json from '@jsxtools/rollup-plugin-utils/json'
import * as str from '@jsxtools/rollup-plugin-utils/string'
import * as path from '@jsxtools/rollup-plugin-utils/path'

import { VirtualAsset } from '@jsxtools/rollup-plugin-utils/virtual-asset'
import { toArray, toMergedArray, assignInput } from '@jsxtools/rollup-plugin-utils/options'
```

## Available Utilities

### VirtualAsset

A utility class for managing virtual assets in Rollup builds. The constructor takes a required `id` string as the first parameter and automatically generates virtual module IDs using Rollup built-ins.

```javascript
import { VirtualAsset } from '@jsxtools/rollup-plugin-utils/virtual-asset'

const virtualAsset = new VirtualAsset("my-virtual-asset", {
  load(context, id) {
    if (id === this.virtualId) {
      return { code: 'export const data = "virtual";' }
    }
  }
})

// Use in a plugin
export default {
  name: 'my-plugin',
  buildStart(options) {
    virtualAsset.buildStart(this, options)
  },
  resolveId(id, importer, options) {
    return virtualAsset.resolveId(this, id, importer, options)
  },
  load(id) {
    return virtualAsset.load(this, id)
  },
  generateBundle(options, bundle) {
    virtualAsset.generateBundle(this, options, bundle)
  }
}
```

### File Utilities

Utilities for file operations including hashing, copying, globbing, and reading.

```javascript
import { hash, copyFile, glob, readJSON, ensureFileDir } from '@jsxtools/rollup-plugin-utils/file'

// Generate SHA-256 hash of a file
const fileHash = await hash('path/to/file.js')
console.log(fileHash) // "a1b2c3d4e5f6..."

// Copy file with CoW optimization when available
await copyFile('src/file.js', 'dist/file.js')

// Glob for files
for await (const filePath of glob({
  include: '**/*.js',
  exclude: '**/*.test.js',
  cwd: new URL('.', import.meta.url)
})) {
  console.log(filePath)
}

// Read and parse JSON file
const config = await readJSON('config.json')

// Ensure directory exists for files
await ensureFileDir('dist/nested/file.js', 'dist/other/file.js')
```

### Array Utilities

Utilities for array manipulation and validation.

```javascript
import { from, merge, every, isArray } from '@jsxtools/rollup-plugin-utils/array'

// Convert to array, filtering nulls
const files = from('file.js') // ['file.js']
const moreFiles = from(['a.js', 'b.js']) // ['a.js', 'b.js']
const noFiles = from(null) // []
const filtered = from([1, null, 2, undefined, 3]) // [1, 2, 3]

// Merge arrays safely
const merged = merge(['a.js'], ['b.js']) // ['a.js', 'b.js']
const withNulls = merge(null, ['b.js']) // ['b.js']

// Check if all items match predicate
const allStrings = every(['a', 'b'], (x): x is string => typeof x === 'string') // true
```

### JSON Utilities

Utilities for JSON parsing and stringification with error handling.

```javascript
import { from, to } from '@jsxtools/rollup-plugin-utils/json'

// Parse JSON safely (returns undefined on error)
const data = from('{"key": "value"}') // { key: 'value' }
const invalid = from('invalid json') // undefined

// Stringify JSON
const json = to({ key: 'value' }) // '{"key":"value"}'
const pretty = to({ key: 'value' }, null, 2) // formatted with 2 spaces
```

### String Utilities

Utilities for string manipulation and validation.

```javascript
import { from, trim, hasTrimmedValue } from '@jsxtools/rollup-plugin-utils/string'

// Convert to string (null/undefined becomes empty string)
const str = from('hello') // 'hello'
const empty = from(null) // ''

// Trim string
const trimmed = trim('  hello  ') // 'hello'

// Check if string has non-empty trimmed value
if (hasTrimmedValue(input)) {
  // TypeScript knows input is a non-empty string
}
```

### Options

Utilities for handling plugin options.

```javascript
import { toArray, toMergedArray, assignInput } from '@jsxtools/rollup-plugin-utils/options'

// Convert single values or arrays to arrays
const files = toArray('file.js') // ['file.js']
const moreFiles = toArray(['a.js', 'b.js']) // ['a.js', 'b.js']
const noFiles = toArray(null) // []

// Merge arrays safely
const merged = toMergedArray(['a.js'], ['b.js']) // ['a.js', 'b.js']
const withNulls = toMergedArray(null, ['b.js']) // ['b.js']

// Add input to Rollup options
const plugin = {
  name: 'my-plugin',
  buildStart(options) {
    assignInput(options.input, "src/another-file.js")
  }
}
```

### Path

Path resolution and manipulation utilities using URL objects.

```javascript
import { toURL, toDirURL, toRelativePath, toParentURL } from '@jsxtools/rollup-plugin-utils/path'

// Convert to URL (absolute path)
const fileUrl = toURL('src', 'index.js') // URL { href: 'file:///absolute/path/to/src/index.js' }

// Convert to directory URL (with trailing slash)
const srcDir = toDirURL('src') // URL { href: 'file:///absolute/path/to/src/' }
const distDir = toDirURL('dist', 'assets') // URL { href: 'file:///absolute/path/to/dist/assets/' }

// Get relative path between URLs
const rel = toRelativePath(
  new URL('file:///project/src/'),
  new URL('file:///project/dist/file.js')
) // '../dist/file.js'

// Get parent directory URL
const parent = toParentURL(new URL('file:///project/src/file.js'))
// URL { href: 'file:///project/src/' }
```

## API Reference

### VirtualAsset

- `constructor(id: string, hooks?: Partial<VirtualAsset.Hooks>)` - Create a virtual asset with required ID and optional hooks
- `id` - Get/set the asset ID
- `virtualId` - Get the virtual module ID (prefixed with `\0` and suffixed with `/`)
- `buildStart(context, options)` - Initialize the virtual asset during build start
- `resolveId(context, id, importer, options)` - Resolve virtual asset IDs
- `load(context, id)` - Load virtual asset content
- `generateBundle(context, options, bundle)` - Clean up virtual assets from bundle

### File Utilities

- `hash(file: PathLike): Promise<string>` - Generate SHA-256 hash of file using streams
- `copyFile(src: PathLike, dest: PathLike): Promise<void>` - Copy file with CoW optimization
- `glob(options?: GlobOptions): AsyncGenerator<string>` - Async generator yielding file paths
- `readJSON<T>(file: PathLike): Promise<T>` - Read and parse JSON file
- `ensureFileDir(...files: PathLike[]): Promise<void>` - Ensure directories exist for files
- `mkdir(path: PathLike): Promise<string | undefined>` - Create directory recursively
- `readFile`, `writeFile`, `deleteFile`, `getFileStats` - Re-exports from `node:fs/promises`

### Array Utilities

- `from<T>(items: T | T[] | null | undefined, predicate?): T[]` - Convert to array, filtering by predicate
- `merge<T>(a?: T[], b?: T[]): T[]` - Merge two arrays safely
- `every<T>(value: unknown, predicate): value is T[]` - Check if value is array and all items match predicate
- `isArray(value: unknown): value is Array` - Check if value is an array

### JSON Utilities

- `from<T>(json: string, reviver?): T | undefined` - Parse JSON safely (returns undefined on error)
- `to(value: unknown, replacer?, space?): string` - Stringify JSON

### String Utilities

- `from(value: unknown): string` - Convert to string (null/undefined becomes empty string)
- `trim(value: unknown): string` - Convert to trimmed string
- `hasTrimmedValue<T>(value: T): value is HasValue<T>` - Check if string has non-empty trimmed value

### Options

- `toArray<T>(items: T | T[] | null | undefined): T[]` - Convert to array, filtering nulls
- `toMergedArray<T>(a?: T[], b?: T[]): T[]` - Merge two arrays safely
- `assignInput<T>(input: T, id: string): T` - Add an ID to Rollup input option

### Path

- `toURL(...paths: string[]): URL` - Resolve paths to file URL
- `toDirURL(...paths: string[]): URL` - Resolve paths to directory URL (with trailing slash)
- `toRelativePath(from: URL, to: URL): string` - Get relative POSIX path between URLs
- `toParentURL(url: URL): URL` - Get parent directory URL
- `PathLike` - Type alias for `string | URL`

## Exports

- `@jsxtools/rollup-plugin-utils/array` - Array manipulation utilities
- `@jsxtools/rollup-plugin-utils/file` - File operation utilities
- `@jsxtools/rollup-plugin-utils/json` - JSON parsing/stringification utilities
- `@jsxtools/rollup-plugin-utils/string` - String manipulation utilities
- `@jsxtools/rollup-plugin-utils/options` - Options handling utilities
- `@jsxtools/rollup-plugin-utils/path` - Path utilities
- `@jsxtools/rollup-plugin-utils/virtual-asset` - Virtual asset management

## Peer Dependencies

- `rollup` ^4.6.0

## License

MIT-0

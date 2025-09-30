# @jsxtools/rollup-plugin-utils

**@jsxtools/rollup-plugin-utils** is a collection of utilities for Rollup plugins.

This package includes utilities for virtual asset management, file hashing, path resolution, and option handling.

## Installation

```shell
npm install @jsxtools/rollup-plugin-utils
```

## Usage

This package provides several utility modules that can be imported individually:

```javascript
import { VirtualAsset } from '@jsxtools/rollup-plugin-utils/virtual-asset'
import { getFileHash, getFileHashAndData } from '@jsxtools/rollup-plugin-utils/get-file-hash'
import { toArray, toMergedArray } from '@jsxtools/rollup-plugin-utils/options'
import { resolve, relative, resolveDir } from '@jsxtools/rollup-plugin-utils/path'
```

## Available Utilities

### VirtualAsset

A utility class for managing virtual assets in Rollup builds.

```javascript
import { VirtualAsset } from '@jsxtools/rollup-plugin-utils/virtual-asset'

const virtualAsset = new VirtualAsset("my-virtual-asset", {
  load(context, id) {
    if (id === this.id) {
      return { code: 'export const data = "virtual";' }
    }

    return null
  }
})

// ... and in a plugin
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

### File Hash

Utilities for generating SHA-1 file hashes.

```javascript
import { getFileHash } from '@jsxtools/rollup-plugin-utils/get-file-hash'

const hash = await getFileHash('path/to/file.js')

console.log(hash) // "a1b2c3d4e5f6..."
```

```javascript
import { getFileHashAndData } from '@jsxtools/rollup-plugin-utils/get-file-hash'

const { hash, data } = await getFileHashAndData('path/to/file.js')

console.log(hash) // "a1b2c3d4e5f6..."
console.log(data) // <Buffer ...>
```

### Options

Utilities for handling plugin options, including array manipulation and merging.

```javascript
import { toArray, toMergedArray } from '@jsxtools/rollup-plugin-utils/options'

// convert single values or arrays to arrays
const files = toArray('file.js') // ['file.js']
const moreFiles = toArray(['a.js', 'b.js']) // ['a.js', 'b.js']
const noFiles = toArray(null) // []

// merge arrays safely
const merged = toMergedArray(['a.js'], ['b.js']) // ['a.js', 'b.js']
const withNulls = toMergedArray(null, ['b.js']) // ['b.js']
```

```javascript
import { assignInput } from '@jsxtools/rollup-plugin-utils/options'

const plugin = {
  name: 'my-plugin',
  buildStart(options) {
    assignInput(options.input, "src/another-file.js")
  }
}
```

### Path

Path resolution and manipulation utilities.

```javascript
import { resolve, relative, resolveDir } from '@jsxtools/rollup-plugin-utils/path'

// Standard Node.js path functions
const absolutePath = resolve('src', 'index.js')
const relativePath = relative('/project', '/project/src/index.js')

// Directory resolution with trailing separator
const srcDir = resolveDir('src') // '/absolute/path/to/src/'
const distDir = resolveDir('dist', 'assets') // '/absolute/path/to/dist/assets/'
```

## API Reference

### VirtualAsset

- `constructor(options?)` - Create a virtual asset with optional configuration
- `buildStart(context, options)` - Initialize the virtual asset during build start
- `resolveId(context, id, importer, options)` - Resolve virtual asset IDs
- `load(context, id)` - Load virtual asset content
- `generateBundle(context, options, bundle)` - Clean up virtual assets from bundle

### File Hash

- `getFileHash(filePath: string): Promise<string | null>` - Generate SHA-1 hash of file
- `getFileHashAndData(filePath: string): Promise<FileHashAndData>` - Generate hash and read file data

### Options

- `toArray<T>(items: T | T[] | null | undefined): T[]` - Convert to array, filtering nulls
- `toMergedArray<T>(a?: T[], b?: T[]): T[]` - Merge two arrays safely
- `assignInput<T extends Record<string, string> | string[]>(input: T, id: string) => T` - Add an ID to an input option

### Path

- `relative(from: string, to: string): string` - Get relative path (re-export from Node.js)
- `resolve(...paths: string[]): string` - Resolve absolute path (re-export from Node.js)
- `resolveDir(...paths: string[]): string` - Resolve directory with trailing separator

## Exports

- `@jsxtools/rollup-plugin-utils/get-file-hash` - File hashing utilities
- `@jsxtools/rollup-plugin-utils/options` - Options handling utilities
- `@jsxtools/rollup-plugin-utils/path` - Path utilities
- `@jsxtools/rollup-plugin-utils/virtual-asset` - Virtual asset management

## Peer Dependencies

- `rollup` ^4.6.0

## License

MIT-0

# @jsxtools/rollup-plugin-copy

**@jsxtools/rollup-plugin-copy** is a [rollup](https://rollupjs.org/) plugin for copying files during the build process.

## Installation

```shell
npm install @jsxtools/rollup-plugin-copy
```

## Usage

```javascript
import { rollupPluginCopy } from '@jsxtools/rollup-plugin-copy';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  plugins: [
    rollupPluginCopy({
      rootDir: 'src',
      distDir: 'dist',
      include: ['src/**/*.css', 'src/**/*.png', 'src/**/*.svg'],
      exclude: ['src/**/*.test.*']
    })
  ]
};
```

## Features

- Copies files from source to destination with glob pattern support.
- Only copies files that have changed using content-based comparison.
- Maintains a cache to avoid unnecessary file operations.
- Handles file changes during development.
- Integrates with Rollup's asset system.

## Configuration Options

- `cacheFile` - Cache file for tracking changes (default: `cpconfig.cpbuildinfo`).
- `include` - Glob patterns for files to include (string or array).
- `exclude` - Glob patterns for files to exclude (string or array).
- `distDir` - Destination directory to copy files to (default: `dist`).
- `workDir` - Current working directory (default: current process directory).
- `rootDir` - Source directory to copy files from (default: `src`)

## Examples

### Copy CSS and Image Files

```javascript
rollupPluginCopy({
  rootDir: 'src',
  distDir: 'dist',
  include: [
    'src/**/*.css',
    'src/**/*.png',
    'src/**/*.jpg',
    'src/**/*.svg'
  ]
})
```

### Copy with Exclusions

```javascript
rollupPluginCopy({
  rootDir: 'assets',
  distDir: 'public',
  include: ['assets/**/*'],
  exclude: [
    'assets/**/*.test.*',
    'assets/**/.*'
  ]
})
```

## Caching

The plugin maintains a cache file (default: `cpconfig.cpbuildinfo`) that tracks file modification times, sizes, and hashes. This enables:

- Only changed files are copied
- Detects content changes even if timestamps are the same
- Minimal file system operations during development

## API

The plugin exports both the main plugin and a separate API:

- `rollupPluginCopy()` - The main Rollup plugin
- `CopyAPI` - Available via `@jsxtools/rollup-plugin-copy/api`

```javascript
import { CopyAPI } from '@jsxtools/rollup-plugin-copy/api';

const copyApi = new CopyAPI();
copyApi.init({
  rootDir: 'src',
  distDir: 'dist',
  include: ['src/**/*.css']
});
```

## Peer Dependencies

- `rollup` ^4.6.0

## License

MIT-0

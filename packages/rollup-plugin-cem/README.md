# @jsxtools/rollup-plugin-cem

**@jsxtools/rollup-plugin-cem** is a [rollup](https://rollupjs.org/) plugin for generating a [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) file from the Rollup module graph.

This plugin is designed to work in conjunction with the [@jsxtools/rollup-plugin-tsc](https://www.npmjs.com/package/@jsxtools/rollup-plugin-tsc) plugin.

## Installation

```shell
npm install @jsxtools/rollup-plugin-cem
```

## Usage

```javascript
import { rollupPluginTsc } from '@jsxtools/rollup-plugin-tsc'
import { rollupPluginCem } from '@jsxtools/rollup-plugin-cem'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  plugins: [
    rollupPluginTsc(),
    rollupPluginCem({
      // optional configuration
      manifestFile: 'dist/custom-elements.json'
    })
  ]
}
```

## Features

- Analyzes TypeScript source files to generate a Custom Elements Manifest file.
- Includes plugins for Lit, FAST, Stencil, and Catalyst frameworks.
- Works with the [rollup-plugin-tsc](https://www.npmjs.com/package/@jsxtools/rollup-plugin-tsc) to de-dupe parsing.
- Only regenerates the manifest when source files change.

## Configuration Options
- `manifestFile` - Output manifest file (default: `${distDir}/custom-elements.json`).
- `plugins` - Additional CEM analyzer plugins.
- `include` - Glob patterns for files to include.
- `exclude` - Glob patterns for files to exclude.
- `distDir` - Distribution directory (default: `dist`).
- `rootDir` - Source directory (default: `src`).
- `workDir` - Current working directory (default: current process directory).

## Framework Plugins

The plugin exports framework-specific plugins:

```javascript
import {
  rollupPluginCem,
  litPlugin,
  fastPlugin,
  stencilPlugin,
  catalystPlugin,
  catalystPlugin2
} from '@jsxtools/rollup-plugin-cem';

export default {
  plugins: [
    rollupPluginCem({
      plugins: [litPlugin()]
    })
  ]
};
```

## API

The plugin also exports a separate API for programmatic use:

```javascript
import { CemAPI } from '@jsxtools/rollup-plugin-cem/api';
```

## Peer Dependencies

- `rollup` ^4.6.0

## License

[MIT-0](../../LICENSE.md)

# @jsxtools/cem-analyzer

**@jsxtools/cem-analyzer** is a forked release of [@custom-elements-manifest/analyzer](https://www.npmjs.com/package/@custom-elements-manifest/analyzer) that includes a typed `create` API, with support for a larger range of TypeScript versions.

## Features

- Support for TypeScript versions 5.4.5 and above.
- TypeScript support for `/create.js` and `/features/framework-plugins/*.js`.
- TypeScript support for Custom Elements Manifest schema types.

## Installation

```shell
npm install @jsxtools/cem-analyzer
```

## Usage

This package is primarily intended as a dependency for other tools like `@jsxtools/rollup-plugin-cem`. However, it can be used directly:

```javascript
import { create } from '@jsxtools/cem-analyzer/create.js';
import { litPlugin } from '@jsxtools/cem-analyzer/features/framework-plugins/lit/lit.js';

const manifest = create({
  modules: sourceFiles, // array of ts.SourceFile objects
  plugins: [
    // optional analyzer plugins, like...
    litPlugin()
  ]
});
```

## Available Exports

- `create.js` - Core analyzer function and types
- `features/framework-plugins/` - Framework-specific plugins:
  - `lit/lit.js` - Lit framework support
  - `fast/fast.js` - FAST framework support
  - `stencil/stencil.js` - Stencil framework support
  - `catalyst/catalyst.js` - GitHub Catalyst support
  - `catalyst-major-2/catalyst.js` - Catalyst v2 support

## License

MIT-0

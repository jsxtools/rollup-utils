# @jsxtools/rollup-plugin-tsc-resolve

**rollup-plugin-tsc-resolve** is a [rollup](https://rollupjs.org/) plugin that resolves TypeScript module paths using TypeScript's [Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API).

This plugin uses `tsconfig.json` to resolve module imports according to TypeScript's path mapping, `baseUrl`, and other resolution settings.

## Installation

```shell
npm install @jsxtools/rollup-plugin-tsc-resolve
```

## Usage

```javascript
import { rollupPluginTscResolve } from "@jsxtools/rollup-plugin-tsc-resolve";

export default {
	plugins: [rollupPluginTscResolve(/* optional configuration */)],
};
```

## Features

- Resolves module paths using TypeScript's module resolution algorithm.
- Supports `paths` mapping from `tsconfig.json`.
- Supports `baseUrl` resolution.
- Works with project references and extended configurations.

## Configuration Options

- `configFile` - TypeScript configuration file (default: `tsconfig.json`).
- `workDir` - Current working directory (default: current process directory).

```js
rollupPluginTscResolve({
	workDir: ".",
	configFile: "tsconfig.json",
});
```

## API

The plugin also exports a separate API for programmatic use:

```javascript
import { TscResolveAPI } from "@jsxtools/rollup-plugin-tsc-resolve/api";

const resolver = new TscResolveAPI();

resolver.init({
	configFile: "tsconfig.json",
});

const resolvedPath = resolver.resolve("@/components/Button", "/path/to/importer.ts");
```

## Peer Dependencies

- `rollup` ^4.6.0
- `typescript` ^5.4.5

## License

MIT-0

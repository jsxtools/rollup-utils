# @jsxtools/rollup-plugin-tsc

**rollup-plugin-tsc** is a [rollup](https://rollupjs.org/) plugin that compiles TypeScript files using TypeScript's [Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API).

Out of the box, this plugin uses `tsconfig.json` to add files to the rollup pipeline, emit `.d.ts` files if enabled, and support incremental updates on subsequent builds.

## Installation

```shell
npm install @jsxtools/rollup-plugin-tsc
```

## Usage

```javascript
import { rollupPluginTsc } from '@jsxtools/rollup-plugin-tsc'

export default {
  plugins: [
    rollupPluginTsc(/* optional configuration */)
  ]
}
```

## Features

- Uses TypeScript's incremental compilation.
- Adds files to the rollup pipeline, allowing other rollup plugins to transform them.
- Supports source map generation and `.d.ts` file emission alongside JavaScript output.
- Handles TypeScript assets and build artifacts (like `.json` imports).
- Supports custom TypeScript configurations and compiler options.
- Supports TypeScript [Custom Transformers](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#customtransformers) for advanced AST transformations.
- Exposes TypeScript `SourceFile` objects for other plugins.
- Supports file watching for development builds.

## Configuration Options

- `configFile` - TypeScript configuration file (default: `tsconfig.json`).
- `include` - Additional files to [include](https://www.typescriptlang.org/tsconfig/#include) in compilation.
- `exclude` - Additional files to [exclude](https://www.typescriptlang.org/tsconfig/#exclude) from compilation.
- `compilerOptions` - Additional TypeScript [compiler options](https://www.typescriptlang.org/tsconfig).
- `customTransformers` - TypeScript [Custom Transformers](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#customtransformers) for AST transformations.
- `references` - TypeScript project [references](https://www.typescriptlang.org/tsconfig/#references).
- `workDir` - Current working directory (default: current process directory).

```js
rollupPluginTsc({
  workDir: ".",
  configFile: "tsconfig.json",
  compilerOptions: {
    declaration: true,
    sourceMap: true,
  },
  customTransformers: {
    before: [myCustomTransformer],
  },
  include: [
    "src/**/*.ts",
  ],
  exclude: [
    "src/**/*.test.ts",
  ],
})
```

## Integration

**rollup-plugin-tsc** exposes TypeScript `SourceFile` objects through Rollup's module metadata, enabling other plugins to access the TypeScript AST:

```javascript
// in the transform hook of another plugin
const sourceFile = this.getModuleInfo(id)?.meta?.tsc?.sourceFile;

if (sourceFile) {
  void sourceFile // access the ts.SourceFile object associated with this module
}
```

## API

The plugin also exports a separate API for programmatic use:

```javascript
import { TscAPI } from '@jsxtools/rollup-plugin-tsc/api';
```

## Peer Dependencies

- `rollup` ^4.6.0
- `typescript` ^5.4.5

## License

MIT-0

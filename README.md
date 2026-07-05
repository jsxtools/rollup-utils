# Rollup Utils

> Small Rollup-compatible tools for TypeScript-first build pipelines.

Rollup Utils is a TypeScript monorepo for projects that want focused plugins instead of a framework. The packages cover TypeScript compilation, TypeScript-aware resolution, Custom Elements Manifest generation, static file copying, and shared plugin utilities for Rollup, Rolldown, and Vite-compatible hosts.

## What's included

| Package                                                                     | Version | Purpose                                                                                        |
| --------------------------------------------------------------------------- | ------: | ---------------------------------------------------------------------------------------------- |
| [@jsxtools/rollup-plugin-cem](./packages/rollup-plugin-cem)                 |   0.7.0 | Generates a Custom Elements Manifest from TypeScript source files already in the module graph. |
| [@jsxtools/rollup-plugin-copy](./packages/rollup-plugin-copy)               |   0.5.0 | Copies static files incrementally, using cached file metadata to avoid unnecessary work.       |
| [@jsxtools/rollup-plugin-tsc](./packages/rollup-plugin-tsc)                 |   0.6.0 | Compiles TypeScript with the Compiler API and emits real bundler chunks, assets, and metadata. |
| [@jsxtools/rollup-plugin-tsc-resolve](./packages/rollup-plugin-tsc-resolve) |   0.2.1 | Resolves imports through TypeScript, including `baseUrl`, `paths`, and `moduleResolution`.     |
| [@jsxtools/rollup-plugin-utils](./packages/rollup-plugin-utils)             |   0.6.0 | Provides small utility modules for authoring Rollup, Rolldown, and Vite-compatible plugins.    |
| [@jsxtools/cem-analyzer](./packages/cem-analyzer)                           |   0.6.1 | Provides typed Custom Elements Manifest analyzer APIs used by `@jsxtools/rollup-plugin-cem`.   |

## Compatibility

The plugin packages use Rollup-compatible hooks and are intended for Rollup, Rolldown, and Vite-compatible plugin pipelines. Rollup is listed as an optional peer dependency where it is only needed for Rollup projects or TypeScript plugin types.

## Development

```shell
npm install
npm run build
npm test
```

Useful targeted checks:

```shell
npm run typecheck
npm run lint
npm run format:check
```

Targeted package tests are available as `npm run test:cem`, `npm run test:copy`, `npm run test:tsc`, `npm run test:tsc-resolve`, and `npm run test:utils`.

Use `npm run check` and `npm run format` to apply supported automatic fixes.

## License

[MIT-0](./LICENSE.md)

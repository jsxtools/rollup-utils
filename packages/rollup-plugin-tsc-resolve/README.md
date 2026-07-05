# @jsxtools/rollup-plugin-tsc-resolve

> Let the bundler resolve imports the same way TypeScript does.

`@jsxtools/rollup-plugin-tsc-resolve` is a Rollup, Rolldown, and Vite-compatible plugin that resolves imports with TypeScript's module resolution algorithm. It reads `tsconfig.json`, including `baseUrl`, `paths`, `moduleResolution`, and extended configuration.

## Highlights

- Resolves imports through TypeScript's `resolveModuleName` API.
- Honors `baseUrl`, `paths`, package conditions, and the active `moduleResolution` mode.
- Follows extended TypeScript configurations.
- Caches resolved ids during a build for fast repeated lookups.

## Install

```shell
npm install --save-dev @jsxtools/rollup-plugin-tsc-resolve typescript
```

## Quick start

```javascript
import { rollupPluginTscResolve } from "@jsxtools/rollup-plugin-tsc-resolve";

export default {
	plugins: [rollupPluginTscResolve()],
};
```

Use this before plugins that load or transform TypeScript modules when those plugins expect already-resolved ids.

## Options

| Option       | Default         | Description                                                    |
| ------------ | --------------- | -------------------------------------------------------------- |
| `workDir`    | `.`             | Base directory used to find and resolve the TypeScript config. |
| `configFile` | `tsconfig.json` | TypeScript configuration file to load.                         |

## API

```javascript
import { TscResolveAPI } from "@jsxtools/rollup-plugin-tsc-resolve/api";

const resolver = new TscResolveAPI();

resolver.init({
	configFile: "tsconfig.json",
});

const resolvedPath = resolver.resolve("@/components/Button", "/project/src/main.ts");
```

## Peer dependencies

- `rollup` `^4.59.0` — optional for compatible hosts.
- `typescript` `^5.4.5 || ^6.0.0`.

## License

[MIT-0](../../LICENSE.md)

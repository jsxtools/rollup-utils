# @jsxtools/cem-analyzer

> Typed Custom Elements Manifest analysis primitives.

`@jsxtools/cem-analyzer` provides typed access to the Custom Elements Manifest analyzer used by `@jsxtools/rollup-plugin-cem`: the `create` API, analyzer plugins, creator helpers, utilities, and shared types.

Use this package directly when you already have TypeScript `SourceFile` objects. Most Rollup users should use `@jsxtools/rollup-plugin-cem`, which wires this up automatically.

## Install

```shell
npm install @jsxtools/cem-analyzer
```

## Quick start

```javascript
import { create } from "@jsxtools/cem-analyzer/create";
import { litPlugin } from "@jsxtools/cem-analyzer/features/framework-plugins/lit/lit";

const manifest = create({
	modules: sourceFiles,
	plugins: [litPlugin()],
});
```

`modules` must be TypeScript `SourceFile` objects.

## Types

Type imports use the same subpaths as runtime imports.

```typescript
import { create } from "@jsxtools/cem-analyzer/create";
import type { CreateOptions } from "@jsxtools/cem-analyzer/create";
import type { Plugin } from "@jsxtools/cem-analyzer/types";
```

```typescript
import type { AnalyzePhaseParams, CEM, Context, TS } from "@jsxtools/cem-analyzer/types";
```

## Exports

| Export                                                                        | Description                                                     |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `@jsxtools/cem-analyzer/create`                                               | Typed `create` API and options.                                 |
| `@jsxtools/cem-analyzer/types`                                                | Shared CEM, TypeScript, plugin, context, and phase types.       |
| `@jsxtools/cem-analyzer/features`                                             | Built-in analyzer plugin pipeline.                              |
| `@jsxtools/cem-analyzer/features/analyse-phase/*`                             | Typed analyzer phase plugins and creator helpers.               |
| `@jsxtools/cem-analyzer/features/collect-phase/*`                             | Typed collect-phase plugins.                                    |
| `@jsxtools/cem-analyzer/features/link-phase/*`                                | Typed module-link-phase plugins.                                |
| `@jsxtools/cem-analyzer/features/post-processing/*`                           | Typed package post-processing plugins.                          |
| `@jsxtools/cem-analyzer/features/framework-plugins/lit/lit`                   | Lit analyzer plugin.                                            |
| `@jsxtools/cem-analyzer/features/framework-plugins/fast/fast`                 | FAST analyzer plugin.                                           |
| `@jsxtools/cem-analyzer/features/framework-plugins/stencil/stencil`           | Stencil analyzer plugin.                                        |
| `@jsxtools/cem-analyzer/features/framework-plugins/catalyst/catalyst`         | GitHub Catalyst analyzer plugin.                                |
| `@jsxtools/cem-analyzer/features/framework-plugins/catalyst-major-2/catalyst` | GitHub Catalyst v2 analyzer plugin.                             |
| `@jsxtools/cem-analyzer/utils`                                                | Shared analyzer utility helpers.                                |
| `@jsxtools/cem-analyzer/utils/*`                                              | Typed AST, import/export, JSDoc, manifest, and mixin utilities. |

## Peer dependencies

- `typescript` `^5.4.5 || ^6.0.0`.

## License

[MIT-0](../../LICENSE.md)

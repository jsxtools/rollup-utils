# Rollup Utils

A collection of Rollup plugins and utilities.

## Packages

This monorepo contains the following packages:

### [@jsxtools/rollup-plugin-cem](./packages/rollup-plugin-cem)

A Rollup plugin for generating Custom Elements Manifest (CEM) files during the build process.

- **Version**: 0.1.0
- **License**: MIT-0

### [@jsxtools/rollup-plugin-copy](./packages/rollup-plugin-copy)

A Rollup plugin for copying files during the build process.

- **Version**: 0.1.0
- **License**: MIT-0

### [@jsxtools/rollup-plugin-tsc](./packages/rollup-plugin-tsc)

A Rollup plugin for TypeScript compilation.

- **Version**: 0.1.0
- **License**: MIT-0

### [@jsxtools/rollup-plugin-utils](./packages/rollup-plugin-utils)

A collection of utilities for Rollup plugins.

- **Version**: 0.1.0
- **License**: MIT-0

### [@jsxtools/cem-analyzer](./packages/cem-analyzer)

A typed release of the Custom Elements Manifest analyzer. This is an internal dependency used by the rollup-plugin-cem.

- **Version**: 0.1.0
- **License**: MIT-0

## Development

This is a TypeScript monorepo using npm workspaces.

### Building

```shell
npm run build
```

### Testing

Run tests for specific plugins:

```shell
# Test copy plugin
npm run test:copy

# Test TypeScript plugin
npm run test:tsc

# Test TypeScript plugin with clean build
npm run clean:test:tsc
```

### Code Quality

```shell
# Format code
npm run format

# Lint code
npm run lint

# Check and fix all issues
npm run check:fix
```

## License

MIT-0

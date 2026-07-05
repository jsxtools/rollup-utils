import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { rollupPluginTsc } from "@jsxtools/rollup-plugin-tsc";
import { TscAPI } from "@jsxtools/rollup-plugin-tsc/api";
import { rollup } from "rollup";
import * as ts from "typescript";

const expectedFiles = [
	"file-imported-by-changed-file.d.ts",
	"file-imported-by-changed-file.js",
	"file-imported-by-changed-file.js.map",
	"file-importing-changed-file.d.ts",
	"file-importing-changed-file.js",
	"file-importing-changed-file.js.map",
	"file-of-enums.d.ts",
	"file-of-enums.js",
	"tsc-test.d.ts",
	"tsc-test.js",
	"tsc-test.js.map",
	"tsconfig.tsbuildinfo",
];

const optionalFiles = ["file-of-enums.js.map"];

describe("rollupPluginTsc output", () => {
	test("matches TypeScript outDir filenames", async () => {
		const files = await readdir("dist");
		const unexpectedFiles = files.filter((file) => !expectedFiles.includes(file) && !optionalFiles.includes(file));

		assert.deepEqual(files.filter((file) => !optionalFiles.includes(file)).sort(), expectedFiles);
		assert.deepEqual(unexpectedFiles, []);
	});

	test("writes build info where TypeScript incremental builds expect it", () => {
		assert.equal(existsSync(join("dist", "tsconfig.tsbuildinfo")), true);
	});

	test("exposes TypeScript-aligned output options", () => {
		const apiOutput = TscAPI.getOutputOptions();
		const pluginOutput = rollupPluginTsc.getOutputOptions();

		assert.deepEqual(pluginOutput, apiOutput);
		assert.equal(pluginOutput.outDir, "dist");
		assert.equal(pluginOutput.tsBuildInfoFile, "dist/tsconfig.tsbuildinfo");
		assert.deepEqual(pluginOutput.rollupOutput, { dir: "dist" });
		assert.deepEqual(pluginOutput.viteBuild, { outDir: "dist" });
	});

	test("honors compiler option output overrides", () => {
		const output = rollupPluginTsc.getOutputOptions({
			compilerOptions: {
				outDir: "helper-dist",
				tsBuildInfoFile: "helper-dist/tsconfig.tsbuildinfo",
			},
		});

		assert.equal(output.outDir, "helper-dist");
		assert.equal(output.tsBuildInfoFile, "helper-dist/tsconfig.tsbuildinfo");
		assert.deepEqual(output.compilerOptions, {
			outDir: "helper-dist",
			tsBuildInfoFile: "helper-dist/tsconfig.tsbuildinfo",
		});
	});

	test("warns without blocking emit for diagnostics by default", async () => {
		const { outputFile, warnings, workDir } = await buildDiagnosticsFixture();

		try {
			assert.equal(existsSync(outputFile), true);
			assert.equal(
				warnings.some((warning) => warning.includes("Type 'number' is not assignable to type 'string'")),
				true,
			);
		} finally {
			await rm(workDir, { recursive: true, force: true });
		}
	});

	test("can skip semantic and syntactic diagnostics", async () => {
		const { outputFile, warnings, workDir } = await buildDiagnosticsFixture({ diagnostics: false });

		try {
			assert.equal(existsSync(outputFile), true);
			assert.deepEqual(warnings, []);
		} finally {
			await rm(workDir, { recursive: true, force: true });
		}
	});

	test("rejects output directories that do not match TypeScript outDir", async () => {
		const bundle = await rollup({
			input: [],
			plugins: [rollupPluginTsc()],
		});

		await assert.rejects(() => bundle.generate({ dir: "other-dist", format: "es" }), /expected output\.dir to match TypeScript outDir/);
		await bundle.close();
	});

	test("preserves exports from TypeScript-discovered chunk entries", async () => {
		const { outputFile, workDir } = await buildDiscoveredEntryFixture();

		try {
			assert.match(await readFile(outputFile, "utf8"), /export \{ discoveredValue \}/);
		} finally {
			await rm(workDir, { recursive: true, force: true });
		}
	});

	test("preserves cached outputs across repeated incremental emits", async () => {
		const { api, sourceDir, workDir } = await buildIncrementalApiFixture();

		try {
			api.emit();
			api.writeEmitableAssets();

			const unchangedFile = join(sourceDir, "unchanged.ts");
			const unchangedOutput = api.getCompiledSource(unchangedFile);

			await writeFile(join(sourceDir, "changed.ts"), "export const changed = 2;\n");
			api.emit();

			assert.match(api.getCompiledSource(join(sourceDir, "changed.ts"))?.js?.code ?? "", /changed = 2/);
			assert.equal(api.getCompiledSource(unchangedFile), unchangedOutput);
		} finally {
			await rm(workDir, { recursive: true, force: true });
		}
	});

	test("skips unchanged build artifact writes", async () => {
		const { api, workDir } = await buildIncrementalApiFixture();
		const writeFile = ts.sys.writeFile;
		const writes = [];

		try {
			ts.sys.writeFile = (fileName, data, writeByteOrderMark) => {
				writes.push(fileName);
				writeFile(fileName, data, writeByteOrderMark);
			};

			api.emit();
			api.writeEmitableAssets();
			writes.length = 0;

			api.emit();
			api.writeEmitableAssets();

			assert.deepEqual(writes, []);
		} finally {
			ts.sys.writeFile = writeFile;
			await rm(workDir, { recursive: true, force: true });
		}
	});

	test("deletes stale outputs for removed source files", async () => {
		const { api, sourceDir, workDir } = await buildIncrementalApiFixture();
		const sourceFile = join(sourceDir, "changed.ts");
		const outputFiles = ["changed.js", "changed.d.ts"].map((fileName) => join(workDir, "dist", fileName));

		try {
			api.emit();
			api.writeEmitableAssets();
			await Promise.all(outputFiles.map((fileName) => writeFile(fileName, "stale output")));

			assert.equal(outputFiles.every(existsSync), true);

			api.deleteOutputsForSource(sourceFile);

			assert.equal(api.hasCompiledSource(sourceFile), false);
			assert.equal(outputFiles.some(existsSync), false);
		} finally {
			await rm(workDir, { recursive: true, force: true });
		}
	});
});

const buildIncrementalApiFixture = async () => {
	const workDir = await mkdtemp(join(tmpdir(), "rollup-plugin-tsc-"));
	const sourceDir = join(workDir, "src");
	const api = new TscAPI();

	await mkdir(sourceDir, { recursive: true });
	await writeFile(
		join(workDir, "tsconfig.json"),
		JSON.stringify({
			compilerOptions: {
				declaration: true,
				incremental: true,
				module: "nodenext",
				moduleResolution: "nodenext",
				outDir: "dist",
				rootDir: "src",
				target: "es2024",
				tsBuildInfoFile: "dist/tsconfig.tsbuildinfo",
			},
			include: ["src/*.ts"],
		}),
	);
	await writeFile(join(sourceDir, "changed.ts"), "export const changed = 1;\n");
	await writeFile(join(sourceDir, "unchanged.ts"), "export const unchanged = 1;\n");

	api.init({ workDir });

	return { api, sourceDir, workDir };
};

const buildDiscoveredEntryFixture = async () => {
	const workDir = await mkdtemp(join(tmpdir(), "rollup-plugin-tsc-"));
	const sourceDir = join(workDir, "src");
	const outputDir = join(workDir, "dist");
	const entryFile = join(sourceDir, "entry.ts");
	const outputFile = join(outputDir, "discovered.js");

	await mkdir(sourceDir, { recursive: true });
	await writeFile(
		join(workDir, "tsconfig.json"),
		JSON.stringify({
			compilerOptions: {
				declaration: true,
				module: "nodenext",
				moduleResolution: "nodenext",
				outDir: "dist",
				rootDir: "src",
				strict: true,
				target: "es2024",
			},
			include: ["src/*.ts"],
		}),
	);
	await writeFile(join(workDir, "package.json"), JSON.stringify({ type: "module" }));
	await writeFile(entryFile, "export const entryValue = 'entry';\n");
	await writeFile(join(sourceDir, "discovered.ts"), "export const discoveredValue = 'discovered';\n");

	const bundle = await rollup({
		input: entryFile,
		plugins: [rollupPluginTsc({ workDir })],
	});

	await bundle.write({ dir: outputDir, format: "es" });
	await bundle.close();

	return { outputFile, workDir };
};

const buildDiagnosticsFixture = async (pluginOptions = {}) => {
	const workDir = await mkdtemp(join(tmpdir(), "rollup-plugin-tsc-"));
	const sourceDir = join(workDir, "src");
	const outputFile = join(workDir, "dist", "index.js");
	const warnings = [];

	await mkdir(sourceDir, { recursive: true });
	await writeFile(
		join(workDir, "tsconfig.json"),
		JSON.stringify({
			compilerOptions: {
				declaration: true,
				module: "nodenext",
				moduleResolution: "nodenext",
				outDir: "dist",
				rootDir: "src",
				strict: true,
				target: "es2024",
			},
			include: ["src/*.ts"],
		}),
	);
	await writeFile(join(sourceDir, "index.ts"), "const value: string = 1;\nexport { value };\n");

	const bundle = await rollup({
		input: [],
		onwarn(warning) {
			warnings.push(warning.message);
		},
		plugins: [rollupPluginTsc({ ...pluginOptions, workDir })],
	});

	await bundle.write({ dir: join(workDir, "dist"), format: "es" });
	await bundle.close();

	return { outputFile, warnings, workDir };
};

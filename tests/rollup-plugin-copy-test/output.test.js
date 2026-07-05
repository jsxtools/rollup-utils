import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat, unlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { CopyAPI } from "@jsxtools/rollup-plugin-copy/api";

describe("rollupPluginCopy output", () => {
	test("copies configured files", async () => {
		assert.equal(await readFile("dist/styles.css", "utf8"), await readFile("src/styles.css", "utf8"));
	});

	test("restores missing outputs from a valid cache", async () => {
		const workDir = await mkdtemp(join(tmpdir(), "rollup-plugin-copy-"));
		const sourceDir = join(workDir, "src");
		const outputFile = join(workDir, "dist", "styles.css");

		try {
			await mkdir(sourceDir, { recursive: true });
			await writeFile(join(sourceDir, "styles.css"), ":host { color: blue; }\n");

			await copyOnce(workDir);
			assert.equal(existsSync(outputFile), true);

			await unlink(outputFile);
			assert.equal(existsSync(outputFile), false);

			await copyOnce(workDir);
			assert.equal(await readFile(outputFile, "utf8"), ":host { color: blue; }\n");
		} finally {
			await rm(workDir, { recursive: true, force: true });
		}
	});

	test("skips unchanged cached copies", async () => {
		const workDir = await mkdtemp(join(tmpdir(), "rollup-plugin-copy-"));
		const sourceDir = join(workDir, "src");
		const outputFile = join(workDir, "dist", "styles.css");
		const oldDate = new Date("2000-01-01T00:00:00.000Z");

		try {
			await mkdir(sourceDir, { recursive: true });
			await writeFile(join(sourceDir, "styles.css"), ":host { color: blue; }\n");
			await copyOnce(workDir);

			await utimes(outputFile, oldDate, oldDate);
			await copyOnce(workDir);

			assert.equal(Math.trunc((await stat(outputFile)).mtimeMs / 1000), Math.trunc(oldDate.getTime() / 1000));
		} finally {
			await rm(workDir, { recursive: true, force: true });
		}
	});

	test("deletes outputs for removed cached sources", async () => {
		const workDir = await mkdtemp(join(tmpdir(), "rollup-plugin-copy-"));
		const sourceDir = join(workDir, "src");
		const sourceFile = join(sourceDir, "styles.css");
		const outputFile = join(workDir, "dist", "styles.css");

		try {
			await mkdir(sourceDir, { recursive: true });
			await writeFile(sourceFile, ":host { color: blue; }\n");

			await copyOnce(workDir);
			assert.equal(existsSync(outputFile), true);

			await unlink(sourceFile);
			await copyOnce(workDir);

			assert.equal(existsSync(outputFile), false);
		} finally {
			await rm(workDir, { recursive: true, force: true });
		}
	});
});

const copyOnce = async (workDir) => {
	const api = new CopyAPI();

	api.init({ include: "src/*.css", workDir });
	await api.loadCache();
	await api.updateCache();
	await api.saveCache();
};

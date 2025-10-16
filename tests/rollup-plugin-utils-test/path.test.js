import assert from "node:assert/strict"
import { describe, test } from "node:test"
import * as path from "@jsxtools/rollup-plugin-utils/path"

describe("path utilities", () => {
	describe("toURL", () => {
		test("should convert relative path to URL", () => {
			const result = path.toURL("src/index.js")
			assert.ok(result instanceof URL)
			assert.ok(result.href.startsWith("file://"))
			assert.ok(result.pathname.endsWith("/src/index.js"))
		})

		test("should convert absolute path to URL", () => {
			const result = path.toURL("/absolute/path/file.js")
			assert.ok(result instanceof URL)
			assert.equal(result.pathname, "/absolute/path/file.js")
		})

		test("should handle URL input", () => {
			const input = new URL("file:///test/path.js")
			const result = path.toURL(input)
			assert.ok(result instanceof URL)
			assert.equal(result.href, "file:///test/path.js")
		})

		test("should handle file: protocol string", () => {
			const result = path.toURL("file:///test/path.js")
			assert.ok(result instanceof URL)
			assert.equal(result.pathname, "/test/path.js")
		})

		test("should resolve multiple path parts", () => {
			const result = path.toURL("src", "components", "Button.js")
			assert.ok(result instanceof URL)
			// Parts are resolved relative to each other using URL resolution
			assert.ok(result.pathname.endsWith("/Button.js"))
		})

		test("should handle empty path parts", () => {
			const result = path.toURL("src", "", "file.js")
			assert.ok(result instanceof URL)
			assert.ok(result.pathname.endsWith("/file.js"))
		})

		test("should handle parent directory references", () => {
			const result = path.toURL("src/components", "../utils/helper.js")
			assert.ok(result instanceof URL)
			assert.ok(result.pathname.endsWith("/utils/helper.js"))
		})

		test("should handle current directory references", () => {
			const result = path.toURL("src", "./index.js")
			assert.ok(result instanceof URL)
			assert.ok(result.pathname.endsWith("/index.js"))
		})
	})

	describe("toPath", () => {
		test("should convert relative path to absolute POSIX path", () => {
			const result = path.toPath("src/index.js")
			assert.equal(typeof result, "string")
			assert.ok(result.startsWith("/"))
			assert.ok(result.endsWith("/src/index.js"))
		})

		test("should convert URL to POSIX path", () => {
			const url = new URL("file:///test/path.js")
			const result = path.toPath(url)
			assert.equal(result, "/test/path.js")
		})

		test("should resolve multiple path parts", () => {
			const result = path.toPath("src", "components", "Button.js")
			// Parts are resolved relative to each other using URL resolution
			assert.ok(result.endsWith("/Button.js"))
		})

		test("should handle absolute paths", () => {
			const result = path.toPath("/absolute/path/file.js")
			assert.equal(result, "/absolute/path/file.js")
		})

		test("should normalize path separators to POSIX", () => {
			const result = path.toPath("src/nested/file.js")
			assert.ok(!result.includes("\\"))
			assert.ok(result.includes("/"))
		})
	})

	describe("toDirURL", () => {
		test("should add trailing slash to directory URL", () => {
			const result = path.toDirURL("src")
			assert.ok(result instanceof URL)
			assert.ok(result.pathname.endsWith("/"))
		})

		test("should preserve existing trailing slash", () => {
			const result = path.toDirURL("src/")
			assert.ok(result.pathname.endsWith("/"))
			assert.equal(result.pathname.match(/\/$/g)?.length, 1)
		})

		test("should handle multiple path parts", () => {
			const result = path.toDirURL("src", "components")
			assert.ok(result.pathname.endsWith("/components/"))
		})

		test("should handle URL input", () => {
			const input = new URL("file:///test/dir")
			const result = path.toDirURL(input)
			assert.ok(result.pathname.endsWith("/"))
		})

		test("should preserve query and hash", () => {
			const result = path.toDirURL("file:///test/dir?query=1#hash")
			assert.ok(result.pathname.endsWith("/"))
			assert.ok(result.href.includes("?query=1"))
			assert.ok(result.href.includes("#hash"))
		})
	})

	describe("toDirPath", () => {
		test("should return directory path with trailing slash", () => {
			const result = path.toDirPath("src")
			assert.equal(typeof result, "string")
			assert.ok(result.endsWith("/"))
		})

		test("should handle multiple path parts", () => {
			const result = path.toDirPath("src", "components")
			assert.ok(result.endsWith("/components/"))
		})

		test("should preserve existing trailing slash", () => {
			const result = path.toDirPath("src/")
			assert.ok(result.endsWith("/"))
		})
	})

	describe("toParentURL", () => {
		test("should return parent directory URL", () => {
			const result = path.toParentURL("src/components/Button.js")
			assert.ok(result instanceof URL)
			assert.ok(result.pathname.endsWith("/src/components/"))
		})

		test("should handle directory paths", () => {
			const result = path.toParentURL("src/components/")
			assert.ok(result.pathname.endsWith("/src/"))
		})

		test("should handle URL input", () => {
			const input = new URL("file:///test/nested/file.js")
			const result = path.toParentURL(input)
			assert.ok(result.pathname.endsWith("/test/nested/"))
		})

		test("should handle root-level paths", () => {
			const result = path.toParentURL("/file.js")
			assert.ok(result instanceof URL)
			assert.ok(result.pathname.endsWith("/"))
		})
	})

	describe("toParentPath", () => {
		test("should return parent directory path as string", () => {
			const result = path.toParentPath("src/components/Button.js")
			assert.equal(typeof result, "string")
			assert.ok(result.endsWith("/src/components/"))
		})

		test("should handle directory paths", () => {
			const result = path.toParentPath("src/components/")
			assert.ok(result.endsWith("/src/"))
		})

		test("should handle URL input", () => {
			const input = new URL("file:///test/nested/file.js")
			const result = path.toParentPath(input)
			assert.ok(result.endsWith("/test/nested/"))
		})
	})

	describe("toRelativePath", () => {
		test("should compute relative path from source to target", () => {
			{
				const use = {
					source: "/path/to/",
					target: "/path/to/file",
					expect: "./file",
				}

				assert.equal(path.toRelativePath(use.target, use.source), use.expect)
			}

			{
				const use = {
					source: "/path/to/",
					target: "/path/to/another/file",
					expect: "./another/file",
				}

				assert.equal(path.toRelativePath(use.target, use.source), use.expect)
			}

			{
				const use = {
					source: "/path/to/file",
					target: "/path/to/another-file",
					expect: "./another-file",
				}

				assert.equal(path.toRelativePath(use.target, use.source), use.expect)
			}

			{
				const use = {
					source: "/path/from/file",
					target: "/path/to/file",
					expect: "../to/file",
				}

				assert.equal(path.toRelativePath(use.target, use.source), use.expect)
			}
		})

		test("should handle nested subdirectories", () => {
			const use = {
				source: "/project/src/",
				target: "/project/src/components/Button.js",
				expect: "./components/Button.js",
			}

			assert.equal(path.toRelativePath(use.target, use.source), use.expect)
		})

		test("should handle multiple levels up", () => {
			const use = {
				source: "/project/src/components/ui/",
				target: "/project/dist/file.js",
				expect: "../../../dist/file.js",
			}

			assert.equal(path.toRelativePath(use.target, use.source), use.expect)
		})

		test("should handle source without trailing slash as a file", () => {
			const use = {
				source: "/project/src",
				target: "/project/dist/file.js",
				expect: "./dist/file.js",
			}

			assert.equal(path.toRelativePath(use.target, use.source), use.expect)
		})

		test("should handle completely different paths", () => {
			const use = {
				source: "/some/kinda/file.js",
				target: "/some/other/file.js",
				expect: "../other/file.js",
			}

			assert.equal(path.toRelativePath(use.target, use.source), use.expect)
		})

		test("should handle root nested path", () => {
			const use = {
				source: "/",
				target: "/project/src/file.js",
				expect: "./project/src/file.js",
			}

			assert.equal(path.toRelativePath(use.target, use.source, false), use.expect)
			assert.ok(path.toRelativePath(use.target, use.source, false).includes("/"))
		})

		test("should handle matchOS parameter for POSIX", () => {
			const use = {
				source: "/some/kinda/file.js",
				target: "/some/other/file.js",
				expect: "../other/file.js",
			}

			assert.equal(path.toRelativePath(use.target, use.source, false), use.expect)
			assert.ok(path.toRelativePath(use.target, use.source, false).includes("/"))
		})

		test("should handle false explicit option", () => {
			{
				const use = {
					source: "/path/to/",
					target: "/path/to/file.js",
					expect: "file.js",
				}

				const result = path.toRelativePath(use.target, use.source, { explicit: false })

				assert.equal(result, use.expect)
			}

			{
				const use = {
					source: "/path/to/file.js",
					target: "/path/to/another-file.js",
					expect: "another-file.js",
				}

				const result = path.toRelativePath(use.target, use.source, { explicit: false })

				assert.equal(result, use.expect)
			}
		})

		test("should handle true matchOS option", () => {
			const source = new URL("file:///project/src/")
			const target = new URL("file:///project/dist/file.js")
			const result = path.toRelativePath(target, source, { matchOS: false })

			assert.ok(result.includes(path.sepByOS))
		})
	})
})

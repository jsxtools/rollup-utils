import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { match } from "@jsxtools/rollup-plugin-utils/pattern"

describe("match", () => {
	describe("literal patterns (no metacharacters)", () => {
		test("should match exact literal paths", () => {
			assert.equal(match("foo/bar/baz.js", "foo/bar/baz.js"), true)
			assert.equal(match("foo/bar/baz.js", "foo/bar/qux.js"), false)
		})

		test("should match single segment literals", () => {
			assert.equal(match("foo", "foo"), true)
			assert.equal(match("foo", "bar"), false)
		})

		test("should match empty pattern with empty path", () => {
			assert.equal(match("", ""), true)
		})

		test("should not match empty pattern with non-empty path", () => {
			assert.equal(match("", "foo"), false)
		})

		test("should not match non-empty pattern with empty path", () => {
			assert.equal(match("foo", ""), false)
		})
	})

	describe("? wildcard (single character)", () => {
		test("should match single character", () => {
			assert.equal(match("f?o", "foo"), true)
			assert.equal(match("f?o", "fao"), true)
			assert.equal(match("f?o", "f1o"), true)
		})

		test("should not match zero characters", () => {
			assert.equal(match("f?o", "fo"), false)
		})

		test("should not match multiple characters", () => {
			assert.equal(match("f?o", "fooo"), false)
		})

		test("should not match slash", () => {
			assert.equal(match("f?o", "f/o"), false)
		})

		test("should work with multiple ? wildcards", () => {
			assert.equal(match("???", "abc"), true)
			assert.equal(match("???", "ab"), false)
			assert.equal(match("???", "abcd"), false)
		})
	})

	describe("* wildcard (zero or more characters in segment)", () => {
		test("should match zero characters", () => {
			assert.equal(match("f*o", "fo"), true)
		})

		test("should match one character", () => {
			assert.equal(match("f*o", "foo"), true)
		})

		test("should match multiple characters", () => {
			assert.equal(match("f*o", "foooo"), true)
			assert.equal(match("f*o", "fabco"), true)
		})

		test("should not match slash", () => {
			assert.equal(match("f*o", "f/o"), false)
			assert.equal(match("f*o", "foo/bar/o"), false)
		})

		test("should match entire segment", () => {
			assert.equal(match("*.js", "file.js"), true)
			assert.equal(match("*.js", "my-file.js"), true)
			assert.equal(match("*.js", ".js"), true)
		})

		test("should work with multiple * wildcards", () => {
			assert.equal(match("*.*", "file.js"), true)
			assert.equal(match("*.*", "file"), false)
			assert.equal(match("a*b*c", "abc"), true)
			assert.equal(match("a*b*c", "aXbYc"), true)
		})
	})

	describe("** globstar (zero or more path segments)", () => {
		test("should match zero segments", () => {
			assert.equal(match("src/**/file.js", "src/file.js"), true)
		})

		test("should match one segment", () => {
			assert.equal(match("src/**/file.js", "src/foo/file.js"), true)
		})

		test("should match multiple segments", () => {
			assert.equal(match("src/**/file.js", "src/foo/bar/file.js"), true)
			assert.equal(match("src/**/file.js", "src/a/b/c/d/file.js"), true)
		})

		test("should work at the beginning", () => {
			assert.equal(match("**/file.js", "file.js"), true)
			assert.equal(match("**/file.js", "foo/file.js"), true)
			assert.equal(match("**/file.js", "foo/bar/file.js"), true)
		})

		test("should work at the end", () => {
			assert.equal(match("src/**", "src/"), true)
			assert.equal(match("src/**", "src/file.js"), true)
			assert.equal(match("src/**", "src/foo/bar.js"), true)
		})

		test("should work with multiple ** patterns", () => {
			assert.equal(match("**/src/**/file.js", "src/file.js"), true)
			assert.equal(match("**/src/**/file.js", "foo/src/bar/file.js"), true)
			assert.equal(match("**/src/**/file.js", "a/b/src/c/d/file.js"), true)
		})

		test("should not match incorrect paths", () => {
			assert.equal(match("src/**/file.js", "other/file.js"), false)
			assert.equal(match("src/**/file.js", "src/file.ts"), false)
		})
	})

	describe("[] character classes", () => {
		test("should match single character from class", () => {
			assert.equal(match("f[aeiou]o", "foo"), true)
			assert.equal(match("f[aeiou]o", "fao"), true)
			assert.equal(match("f[aeiou]o", "feo"), true)
		})

		test("should not match characters outside class", () => {
			assert.equal(match("f[aeiou]o", "fxo"), false)
			assert.equal(match("f[aeiou]o", "f1o"), false)
		})

		test("should work with ranges", () => {
			assert.equal(match("f[a-z]o", "foo"), true)
			assert.equal(match("f[a-z]o", "fao"), true)
			assert.equal(match("f[0-9]o", "f5o"), true)
			assert.equal(match("f[0-9]o", "fao"), false)
		})

		test("should work with negation", () => {
			assert.equal(match("f[^aeiou]o", "fxo"), true)
			assert.equal(match("f[^aeiou]o", "f1o"), true)
			assert.equal(match("f[^aeiou]o", "foo"), false)
		})

		test("should not match slash", () => {
			assert.equal(match("f[a-z/]o", "f/o"), false)
		})
	})

	describe("@() extglob (match one)", () => {
		test("should match one of the alternatives", () => {
			assert.equal(match("file.@(js|ts)", "file.js"), true)
			assert.equal(match("file.@(js|ts)", "file.ts"), true)
			assert.equal(match("file.@(js|ts)", "file.css"), false)
		})

		test("should match exactly once", () => {
			assert.equal(match("@(foo|bar)", "foo"), true)
			assert.equal(match("@(foo|bar)", "bar"), true)
			assert.equal(match("@(foo|bar)", "foofoo"), false)
		})

		test("should work with wildcards inside", () => {
			assert.equal(match("@(*.js|*.ts)", "file.js"), true)
			assert.equal(match("@(*.js|*.ts)", "file.ts"), true)
		})
	})

	describe("?() extglob (match zero or one)", () => {
		test("should match zero occurrences", () => {
			assert.equal(match("file?(s).js", "file.js"), true)
		})

		test("should match one occurrence", () => {
			assert.equal(match("file?(s).js", "files.js"), true)
		})

		test("should not match multiple occurrences", () => {
			assert.equal(match("file?(s).js", "filess.js"), false)
		})

		test("should work with alternatives", () => {
			assert.equal(match("file?(.min).js", "file.js"), true)
			assert.equal(match("file?(.min).js", "file.min.js"), true)
			assert.equal(match("file?(.min).js", "file.min.min.js"), false)
		})
	})

	describe("+() extglob (match one or more)", () => {
		test("should match one occurrence", () => {
			assert.equal(match("file+(s).js", "files.js"), true)
		})

		test("should match multiple occurrences", () => {
			assert.equal(match("file+(s).js", "filess.js"), true)
			assert.equal(match("file+(s).js", "filesss.js"), true)
		})

		test("should not match zero occurrences", () => {
			assert.equal(match("file+(s).js", "file.js"), false)
		})

		test("should work with alternatives", () => {
			assert.equal(match("+(foo|bar)", "foo"), true)
			assert.equal(match("+(foo|bar)", "foobar"), true)
			assert.equal(match("+(foo|bar)", "foofoo"), true)
		})
	})

	describe("*() extglob (match zero or more)", () => {
		test("should match zero occurrences", () => {
			assert.equal(match("file*(s).js", "file.js"), true)
		})

		test("should match one occurrence", () => {
			assert.equal(match("file*(s).js", "files.js"), true)
		})

		test("should match multiple occurrences", () => {
			assert.equal(match("file*(s).js", "filess.js"), true)
			assert.equal(match("file*(s).js", "filesss.js"), true)
		})

		test("should work with alternatives", () => {
			assert.equal(match("*(foo|bar)", ""), true)
			assert.equal(match("*(foo|bar)", "foo"), true)
			assert.equal(match("*(foo|bar)", "foobar"), true)
		})
	})

	describe("!() extglob (match anything except)", () => {
		test("should match anything except the pattern", () => {
			assert.equal(match("file.!(js)", "file.ts"), true)
			assert.equal(match("file.!(js)", "file.css"), true)
			assert.equal(match("file.!(js)", "file.js"), false)
		})

		test("should work with alternatives", () => {
			assert.equal(match("file.!(js|ts)", "file.css"), true)
			assert.equal(match("file.!(js|ts)", "file.js"), false)
			assert.equal(match("file.!(js|ts)", "file.ts"), false)
		})

		test("should require at least one character", () => {
			assert.equal(match("file.!(js)", "file."), false)
		})
	})

	describe("backslash escaping", () => {
		test("should escape special characters", () => {
			assert.equal(match("file\\*.js", "file*.js"), true)
			assert.equal(match("file\\*.js", "file.js"), false)
			assert.equal(match("file\\*.js", "fileX.js"), false)
		})

		test("should escape question mark", () => {
			assert.equal(match("file\\?.js", "file?.js"), true)
			assert.equal(match("file\\?.js", "fileX.js"), false)
		})

		test("should escape brackets", () => {
			assert.equal(match("file\\[0\\].js", "file[0].js"), true)
			assert.equal(match("file\\[0\\].js", "file0.js"), false)
		})

		test("should handle backslash at end", () => {
			assert.equal(match("file\\", "file\\"), true)
		})

		test("should escape dot", () => {
			assert.equal(match("file\\.js", "file.js"), true)
		})
	})

	describe("dotfile handling (leading dot rule)", () => {
		test("should not match dotfiles by default with *", () => {
			assert.equal(match("*", ".hidden"), false)
			assert.equal(match("*", "visible"), true)
		})

		test("should not match dotfiles by default with ?", () => {
			assert.equal(match("?????", ".test"), false)
			assert.equal(match("????", "test"), true)
		})

		test("should not match dotfiles with ** and wildcards", () => {
			assert.equal(match("**/*", "foo/.hidden"), false)
			assert.equal(match("**/*", "foo/visible"), true)
			assert.equal(match("src/**/*.js", "src/.hidden/file.js"), false)
		})

		test("should match dotfiles when explicitly in pattern with **", () => {
			assert.equal(match("**/.hidden", "foo/.hidden"), true)
			assert.equal(match("**/.git/config", "foo/.git/config"), true)
		})

		test("should match dotfiles when explicitly specified", () => {
			assert.equal(match(".*", ".hidden"), true)
			assert.equal(match(".git/*", ".git/config"), true)
		})

		test("should match dotfiles when includeDot is true", () => {
			assert.equal(match("*", ".hidden", true), true)
			assert.equal(match("src/*", "src/.hidden", true), true)
			assert.equal(match("**/.*", "foo/.hidden", true), true)
		})

		test("should handle escaped dot as explicit", () => {
			assert.equal(match("\\.*", ".hidden"), true)
		})

		test("should handle dot in character class as explicit", () => {
			assert.equal(match("[.]hidden", ".hidden"), true)
		})
	})

	describe("complex patterns", () => {
		test("should handle combination of wildcards", () => {
			assert.equal(match("src/**/*.@(js|ts)", "src/file.js"), true)
			assert.equal(match("src/**/*.@(js|ts)", "src/foo/bar.ts"), true)
			assert.equal(match("src/**/*.@(js|ts)", "src/a/b/c.js"), true)
			assert.equal(match("src/**/*.@(js|ts)", "src/file.css"), false)
		})

		test("should handle nested extglobs", () => {
			assert.equal(match("@(foo|bar@(1|2))", "foo"), true)
			assert.equal(match("@(foo|bar@(1|2))", "bar1"), true)
			assert.equal(match("@(foo|bar@(1|2))", "bar2"), true)
			assert.equal(match("@(foo|bar@(1|2))", "bar3"), false)
		})

		test("should handle multiple path segments with wildcards", () => {
			assert.equal(match("*/*/file.js", "a/b/file.js"), true)
			assert.equal(match("*/*/file.js", "a/file.js"), false)
			assert.equal(match("*/*/file.js", "a/b/c/file.js"), false)
		})

		test("should handle realistic file patterns", () => {
			assert.equal(match("**/*.test.@(js|ts)", "src/foo.test.js"), true)
			assert.equal(match("**/*.test.@(js|ts)", "tests/bar.test.ts"), true)
			assert.equal(match("**/*.test.@(js|ts)", "src/foo.js"), false)
		})

		test("should handle build output patterns", () => {
			assert.equal(match("dist/**/*.min.js", "dist/bundle.min.js"), true)
			assert.equal(match("dist/**/*.min.js", "dist/js/app.min.js"), true)
			assert.equal(match("dist/**/*.min.js", "dist/bundle.js"), false)
		})
	})

	describe("edge cases", () => {
		test("should handle patterns with only **", () => {
			assert.equal(match("**", "anything"), true)
			assert.equal(match("**", "foo/bar/baz"), true)
			assert.equal(match("**", ""), true)
		})

		test("should handle multiple consecutive slashes in path", () => {
			// Paths are split by /, so consecutive slashes create empty segments
			assert.equal(match("foo/bar", "foo//bar"), false)
		})

		test("should handle special regex characters in literals", () => {
			assert.equal(match("file.js", "file.js"), true)
			assert.equal(match("file(1).js", "file(1).js"), true)
			assert.equal(match("file[1].js", "file[1].js"), false) // [ is special
		})

		test("should handle very long paths", () => {
			const longPath = `${"a/".repeat(100)}file.js`
			assert.equal(match("**/file.js", longPath), true)
		})

		test("should handle patterns with trailing slash", () => {
			assert.equal(match("src/", "src/"), true)
			assert.equal(match("src/", "src"), false)
		})

		test("should handle empty segments", () => {
			assert.equal(match("//", "//"), true)
			assert.equal(match("/", "/"), true)
		})
	})

	describe("performance and memoization", () => {
		test("should handle complex globstar patterns efficiently", () => {
			// This tests the DP memoization path
			const pattern = "**/a/**/b/**/c"
			assert.equal(match(pattern, "a/b/c"), true)
			assert.equal(match(pattern, "x/a/y/b/z/c"), true)
			assert.equal(match(pattern, "a/x/b/y/c"), true)
		})

		test("should handle multiple globstars with dotfiles", () => {
			assert.equal(match("**/src/**/*.js", "foo/src/bar/file.js"), true)
			assert.equal(match("**/src/**/*.js", "foo/.hidden/src/bar/file.js"), false)
			assert.equal(match("**/src/**/*.js", "foo/.hidden/src/bar/file.js", true), true)
		})
	})

	describe("alternation in extglobs", () => {
		test("should handle empty alternatives", () => {
			assert.equal(match("file@(|.min).js", "file.js"), true)
			assert.equal(match("file@(|.min).js", "file.min.js"), true)
		})

		test("should handle multiple alternatives", () => {
			assert.equal(match("@(a|b|c|d)", "a"), true)
			assert.equal(match("@(a|b|c|d)", "b"), true)
			assert.equal(match("@(a|b|c|d)", "c"), true)
			assert.equal(match("@(a|b|c|d)", "d"), true)
			assert.equal(match("@(a|b|c|d)", "e"), false)
		})

		test("should handle wildcards in alternatives", () => {
			assert.equal(match("@(*.js|*.ts|*.css)", "file.js"), true)
			assert.equal(match("@(*.js|*.ts|*.css)", "file.ts"), true)
			assert.equal(match("@(*.js|*.ts|*.css)", "file.css"), true)
			assert.equal(match("@(*.js|*.ts|*.css)", "file.html"), false)
		})
	})

	describe("segment boundary behavior", () => {
		test("should respect segment boundaries with *", () => {
			assert.equal(match("src/*/file.js", "src/foo/file.js"), true)
			assert.equal(match("src/*/file.js", "src/foo/bar/file.js"), false)
		})

		test("should respect segment boundaries with ?", () => {
			assert.equal(match("src/?/file.js", "src/a/file.js"), true)
			assert.equal(match("src/?/file.js", "src/ab/file.js"), false)
		})

		test("should handle ** crossing multiple boundaries", () => {
			assert.equal(match("src/**/test/**/*.js", "src/a/test/b/c/file.js"), true)
			assert.equal(match("src/**/test/**/*.js", "src/test/file.js"), true)
		})
	})

	describe("advanced edge cases for full coverage", () => {
		test("should handle escaped characters in extglobs", () => {
			assert.equal(match("@(foo\\*|bar)", "foo*"), true)
			assert.equal(match("@(foo\\*|bar)", "fooX"), false)
		})

		test("should handle character classes in extglobs", () => {
			assert.equal(match("@([a-z]|[0-9])", "a"), true)
			assert.equal(match("@([a-z]|[0-9])", "5"), true)
			assert.equal(match("@([a-z]|[0-9])", "A"), false)
		})

		test("should handle nested extglobs with character classes", () => {
			assert.equal(match("@(foo|@([a-z][0-9]))", "foo"), true)
			assert.equal(match("@(foo|@([a-z][0-9]))", "a1"), true)
			assert.equal(match("@(foo|@([a-z][0-9]))", "ab"), false)
		})

		test("should handle wildcards in nested extglobs", () => {
			assert.equal(match("@(foo|@(*bar|baz*))", "foo"), true)
			assert.equal(match("@(foo|@(*bar|baz*))", "xbar"), true)
			assert.equal(match("@(foo|@(*bar|baz*))", "bazx"), true)
		})

		test("should handle question mark in nested extglobs", () => {
			assert.equal(match("@(foo|@(?ar|ba?))", "foo"), true)
			assert.equal(match("@(foo|@(?ar|ba?))", "bar"), true)
			assert.equal(match("@(foo|@(?ar|ba?))", "baz"), true)
			assert.equal(match("@(foo|@(?ar|ba?))", "car"), true)
		})

		test("should handle escaped backslash in character class", () => {
			assert.equal(match("file[\\\\].js", "file\\.js"), true)
		})

		test("should handle extglobs with escaped parentheses", () => {
			assert.equal(match("file\\(1\\).js", "file(1).js"), true)
			assert.equal(match("file\\(1\\).js", "file1.js"), false)
		})

		test("should handle multiple levels of nested extglobs", () => {
			assert.equal(match("@(@(@(a|b)|c)|d)", "a"), true)
			assert.equal(match("@(@(@(a|b)|c)|d)", "b"), true)
			assert.equal(match("@(@(@(a|b)|c)|d)", "c"), true)
			assert.equal(match("@(@(@(a|b)|c)|d)", "d"), true)
			assert.equal(match("@(@(@(a|b)|c)|d)", "e"), false)
		})

		test("should handle extglobs with brackets inside", () => {
			assert.equal(match("@([a-z]*|[0-9]*)", "abc"), true)
			assert.equal(match("@([a-z]*|[0-9]*)", "123"), true)
			// @() requires at least one match, so empty string doesn't match
			assert.equal(match("@([a-z]*|[0-9]*)", ""), false)
			// But *() can match empty
			assert.equal(match("*([a-z]|[0-9])", ""), true)
		})

		test("should handle complex alternation with escapes", () => {
			assert.equal(match("@(foo\\.js|bar\\.ts)", "foo.js"), true)
			assert.equal(match("@(foo\\.js|bar\\.ts)", "bar.ts"), true)
			assert.equal(match("@(foo\\.js|bar\\.ts)", "fooXjs"), false)
		})

		test("should handle patterns with only extglobs", () => {
			assert.equal(match("@(a|b)", "a"), true)
			assert.equal(match("?(a|b)", ""), true)
			assert.equal(match("+(a|b)", "a"), true)
			assert.equal(match("*(a|b)", ""), true)
			assert.equal(match("!(a|b)", "c"), true)
		})

		test("should handle extglobs at different positions", () => {
			assert.equal(match("prefix-@(a|b)-suffix", "prefix-a-suffix"), true)
			assert.equal(match("prefix-@(a|b)-suffix", "prefix-b-suffix"), true)
			assert.equal(match("prefix-@(a|b)-suffix", "prefix-c-suffix"), false)
		})

		test("should handle character class with multiple chars", () => {
			assert.equal(match("file[._-].js", "file..js"), true)
			assert.equal(match("file[._-].js", "file_.js"), true)
			assert.equal(match("file[._-].js", "file-.js"), true)
		})

		test("should handle negated character class with ranges", () => {
			assert.equal(match("file[^a-z].js", "file1.js"), true)
			assert.equal(match("file[^a-z].js", "fileA.js"), true)
			assert.equal(match("file[^a-z].js", "filea.js"), false)
		})

		test("should handle patterns with closing bracket without opening", () => {
			// ] without [ is treated as literal
			assert.equal(match("file].js", "file].js"), true)
		})

		test("should handle patterns with opening paren without extglob operator", () => {
			// ( without extglob operator is treated as literal
			assert.equal(match("file(.js", "file(.js"), true)
		})

		test("should handle patterns with closing paren without opening", () => {
			// ) without ( is treated as literal
			assert.equal(match("file).js", "file).js"), true)
		})

		test("should handle extglobs with single alternative", () => {
			assert.equal(match("@(single)", "single"), true)
			assert.equal(match("?(single)", "single"), true)
			assert.equal(match("+(single)", "single"), true)
			assert.equal(match("*(single)", "single"), true)
		})

		test("should handle deeply nested character classes in extglobs", () => {
			assert.equal(match("@(@([a-c]|[x-z])|[0-9])", "a"), true)
			assert.equal(match("@(@([a-c]|[x-z])|[0-9])", "z"), true)
			assert.equal(match("@(@([a-c]|[x-z])|[0-9])", "5"), true)
			assert.equal(match("@(@([a-c]|[x-z])|[0-9])", "m"), false)
		})

		test("should handle extglobs with all operator types combined", () => {
			assert.equal(match("@(a)?(b)+(c)*(d)!(e)", "acccdd"), true)
			assert.equal(match("@(a)?(b)+(c)*(d)!(e)", "abcccdd"), true)
			assert.equal(match("@(a)?(b)+(c)*(d)!(e)", "acccdf"), true)
			// !(e) matches any non-empty string that's not "e", so "e" itself matches
			assert.equal(match("@(a)?(b)+(c)*(d)!(e)", "accce"), true)
		})

		test("should handle patterns with escaped extglob operators", () => {
			assert.equal(match("\\@(test)", "@(test)"), true)
			assert.equal(match("\\?(test)", "?(test)"), true)
			assert.equal(match("\\+(test)", "+(test)"), true)
			assert.equal(match("\\*(test)", "*(test)"), true)
			assert.equal(match("\\!(test)", "!(test)"), true)
		})

		test("should handle mixed wildcards and character classes", () => {
			assert.equal(match("*[0-9]*.js", "file123test.js"), true)
			assert.equal(match("*[0-9]*.js", "file1.js"), true)
			assert.equal(match("*[0-9]*.js", "file.js"), false)
		})

		test("should handle globstar with literal segments before and after", () => {
			assert.equal(match("prefix/**/suffix", "prefix/suffix"), true)
			assert.equal(match("prefix/**/suffix", "prefix/middle/suffix"), true)
			assert.equal(match("prefix/**/suffix", "prefix/a/b/c/suffix"), true)
			assert.equal(match("prefix/**/suffix", "other/suffix"), false)
		})
	})
})

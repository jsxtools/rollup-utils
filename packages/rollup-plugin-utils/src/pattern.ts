// Highly opinionated, high-performance POSIX glob matcher.
// Features: ?, *, **, [], extglobs @() ?() +() *() !(), leading-dot rule (POSIX), no brace expansion.
// Two segment kinds: GlobStar or an anchored RegExp per segment.
//
// Usage:
//   const glob = new Glob("src/**/*.ts")
//   glob.match("src/a/b/x.ts") // true

export class Pattern {
	constructor(pattern: string) {
		// quick scan: bail to literal-fast-path if there are no meta chars
		let hasMeta = false

		for (let scanIndex = 0, n = pattern.length; scanIndex < n; ++scanIndex) {
			const ch = pattern[scanIndex]

			if (
				ch === "\\" ||
				ch === "[" ||
				ch === "]" ||
				ch === "?" ||
				ch === "*" ||
				ch === "@" ||
				ch === "!" ||
				ch === "+" ||
				ch === "(" ||
				ch === ")"
			) {
				hasMeta = true
				break
			}
		}

		let segments: Segment[]

		if (!hasMeta) {
			// literal fast-path: just split + anchor as exact literals
			const parts = pattern.split("/")

			segments = new Array(parts.length)

			for (let index = 0; index < parts.length; ++index) {
				const literal = parts[index]

				segments[index] = {
					kind: SegmentKind.LiteralRegex,
					re: new RegExp(`^${escapeRegex(literal)}$`),
					explicitLeadingDot: literal.length > 0 && literal[0] === ".",
				}
			}
		} else {
			segments = parseAndPrecompile(pattern)
		}

		this.#internals.segments = segments
	}

	match(path: string, includeDot = false): boolean {
		return matchPathAgainstCompiled(this.#internals.segments, path, includeDot)
	}

	static match(pattern: string, path: string, includeDot = false): boolean {
		return new this(pattern).match(path, includeDot)
	}

	#internals = {
		segments: [] as Segment[],
	}
}

export const match = Pattern.match.bind(Pattern)

// #region Internals

const isDotfile = (part: string, includeDot: boolean, explicitLeadingDot?: boolean): boolean =>
	!includeDot && part.length > 0 && part[0] === "." && !explicitLeadingDot

const matchPathAgainstCompiled = (segments: Segment[], path: string, includeDot: boolean): boolean => {
	const parts = path.split("/")

	// detect globstar presence
	let containsGlobStar = false
	for (let index = 0; index < segments.length; ++index) {
		if (segments[index].kind === SegmentKind.GlobStar) {
			containsGlobStar = true
			break
		}
	}

	// no-globstar fast path: segment lengths must match, then straight tests
	if (!containsGlobStar) {
		if (parts.length !== segments.length) return false
		for (let index = 0; index < parts.length; ++index) {
			const segment = segments[index]
			const part = parts[index]
			if (isDotfile(part, includeDot, segment.explicitLeadingDot)) return false
			if (!segment.re!.test(part)) return false
		}
		return true
	}

	// general DP path with ** support
	return matchWithGlobStarDP(segments, parts, includeDot)
}

const matchWithGlobStarDP = (segments: Segment[], parts: string[], includeDot: boolean): boolean => {
	const m = segments.length
	const n = parts.length
	const memo = new Map<number, boolean>()

	const recur = (i: number, j: number): boolean => {
		const k = i * 1000 + j
		const cached = memo.get(k)
		if (cached !== undefined) return cached

		let result = false

		if (i === m) {
			result = j === n
		} else {
			const segment = segments[i]
			if (segment.kind === SegmentKind.GlobStar) {
				// ** matches zero segments
				if (recur(i + 1, j)) {
					result = true
				} else {
					// ** matches one or more segments, but cannot start by consuming a dotfile (unless includeDot)
					for (let nextJ = j; nextJ < n; ++nextJ) {
						const part = parts[nextJ]
						if (isDotfile(part, includeDot)) {
							++nextJ
							continue
						}
						if (recur(i + 1, nextJ + 1)) {
							result = true
							break
						}
					}
				}
			} else {
				if (j < n) {
					const part = parts[j]
					result =
						!isDotfile(part, includeDot, segment.explicitLeadingDot) &&
						segment.re!.test(part) &&
						recur(i + 1, j + 1)
				}
			}
		}

		memo.set(k, result)
		return result
	}

	return recur(0, 0)
}

const handleEscape = (pattern: string, index: number, end: number): [string, number] =>
	index + 1 < end ? [escapeRegex(pattern[index + 1]), index + 2] : ["\\\\", index + 1]

const parseAndPrecompile = (pattern: string): Segment[] => {
	const segments: Segment[] = []
	const length = pattern.length
	let index = 0

	let currentSegmentRegexSource = ""
	let sawFirstUnit = false
	let explicitLeadingDot = false

	const flushCurrentSegment = () => {
		if (currentSegmentRegexSource === "") {
			return
		}

		segments.push({
			kind: SegmentKind.LiteralRegex,
			re: new RegExp(`^${currentSegmentRegexSource}$`),
			explicitLeadingDot,
		})

		currentSegmentRegexSource = ""
		sawFirstUnit = false
		explicitLeadingDot = false
	}

	while (index < length) {
		const ch = pattern[index]

		// Backslash escape → literal
		if (ch === "\\") {
			const [escaped, nextIndex] = handleEscape(pattern, index, length)

			if (!sawFirstUnit && index + 1 < length) {
				if (pattern[index + 1] === ".") explicitLeadingDot = true
				sawFirstUnit = true
			}

			currentSegmentRegexSource += escaped
			index = nextIndex

			continue
		}

		// Slash → boundary
		if (ch === "/") {
			flushCurrentSegment()

			++index

			continue
		}

		// Bracket class '[ ... ]' (best-effort, still does not match '/')
		if (ch === "[") {
			const [s, e] = readBalancedRange(pattern, index, "[", "]")

			// If first unit of segment is a literal '.' inside a class like [.] set explicit flag.
			if (!sawFirstUnit && pattern[s + 1] === "." && pattern[s + 2] === "]") {
				explicitLeadingDot = true
			}

			currentSegmentRegexSource += pattern.slice(s, e)
			index = e

			continue
		}

		// Extglob at segment level
		if (isExtglobOperator(ch) && pattern[index + 1] === "(") {
			// First unit is wildcard (not a literal dot) → do not mark explicitLeadingDot
			const { regexSource, nextIndex } = parseExtglob(pattern, index)

			currentSegmentRegexSource += regexSource
			index = nextIndex

			continue
		}

		// Star(s)
		if (ch === "*") {
			let runEnd = index + 1

			while (runEnd < length && pattern[runEnd] === "*") ++runEnd

			if (runEnd - index >= 2) {
				flushCurrentSegment()

				segments.push({ kind: SegmentKind.GlobStar })
			} else {
				// '*' within a segment is wildcard → does not set explicitLeadingDot
				currentSegmentRegexSource += "[^/]*"
			}

			index = runEnd

			continue
		}

		// Single '?'
		if (ch === "?") {
			currentSegmentRegexSource += "[^/]"

			++index

			continue
		}

		// Plain text run
		const start = index

		while (index < length) {
			const c = pattern[index]

			if (c === "\\" || c === "/" || c === "[" || c === "*" || c === "?" || isExtglobOperator(c)) {
				break
			}

			++index
		}

		if (start < index) {
			if (!sawFirstUnit) {
				if (pattern[start] === ".") explicitLeadingDot = true
				sawFirstUnit = true
			}

			currentSegmentRegexSource += escapeRegex(pattern.slice(start, index))
		}
	}

	flushCurrentSegment()

	return segments
}

const isExtglobOperator = (c: string) => c === "@" || c === "!" || c === "?" || c === "+" || c === "*"

// Balanced read starting on opener at position `pos`
const readBalancedRange = (s: string, pos: number, open: string, close: string): [number, number] => {
	const start = pos
	const n = s.length

	let depth = 0

	while (pos < n) {
		const ch = s[pos]

		++pos

		if (ch === "\\") {
			if (pos < n) {
				++pos
			}

			continue
		}

		if (ch === open) {
			++depth

			continue
		}

		if (ch === close) {
			--depth

			if (depth === 0) {
				break
			}
		}
	}

	return [start, pos]
}

const parseExtglob = (pattern: string, opIndex: number): { regexSource: string; nextIndex: number } => {
	const kind = pattern[opIndex] as "@" | "!" | "?" | "+" | "*"
	const [parenStart, parenEnd] = readBalancedRange(pattern, opIndex + 1, "(", ")") // start on '('
	const innerStart = parenStart + 1
	const innerEnd = parenEnd - 1

	const alternates = splitAlternatesTopLevel(pattern, innerStart, innerEnd)
		.map(([s, e]) => compileSubpatternToRegexSource(pattern, s, e))
		.join("|")

	const extglobSuffix: Record<string, string> = { "@": "", "?": "?", "+": "+", "*": "*" }
	const source = kind === "!" ? `(?:(?!${alternates})[^/]+)` : `(?:${alternates})${extglobSuffix[kind]}`

	return { regexSource: source, nextIndex: parenEnd }
}

const splitAlternatesTopLevel = (pattern: string, start: number, end: number): Array<[number, number]> => {
	const parts: Array<[number, number]> = []

	let parenDepth = 0
	let bracketDepth = 0
	let pieceStart = start

	for (let index = start; index < end; ++index) {
		const ch = pattern[index]

		if (ch === "\\") {
			++index

			continue
		}

		if (ch === "[" && parenDepth >= 0) {
			++bracketDepth

			continue
		}

		if (ch === "]" && bracketDepth > 0) {
			--bracketDepth

			continue
		}

		if (bracketDepth === 0) {
			if (ch === "(") {
				++parenDepth

				continue
			}

			if (ch === ")") {
				if (parenDepth > 0) --parenDepth

				continue
			}
		}

		if (ch === "|" && parenDepth === 0 && bracketDepth === 0) {
			parts.push([pieceStart, index])

			pieceStart = index + 1
		}
	}

	parts.push([pieceStart, end])

	return parts
}

/** Compile a subpattern that lives within a single segment into regex source. */
const compileSubpatternToRegexSource = (pattern: string, start: number, end: number): string => {
	let source = ""
	let index = start

	while (index < end) {
		const ch = pattern[index]

		if (ch === "\\") {
			const [escaped, nextIndex] = handleEscape(pattern, index, end)
			source += escaped
			index = nextIndex

			continue
		}

		if (ch === "[") {
			const [s, e] = readBalancedRange(pattern, index, "[", "]")

			source += pattern.slice(s, e)
			index = e

			continue
		}

		if (isExtglobOperator(ch) && pattern[index + 1] === "(") {
			const { regexSource, nextIndex } = parseExtglob(pattern, index)

			source += regexSource
			index = nextIndex

			continue
		}

		if (ch === "?") {
			source += "[^/]"

			++index

			continue
		}

		if (ch === "*") {
			source += "[^/]*"

			++index

			continue
		}

		// plain text run
		const runStart = index

		while (index < end) {
			const c = pattern[index]

			if (c === "\\" || c === "[" || c === "?" || c === "*" || isExtglobOperator(c)) {
				break
			}

			++index
		}

		if (runStart < index) {
			source += escapeRegex(pattern.slice(runStart, index))
		}
	}

	return source
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// #region Types

interface Segment {
	kind: SegmentKind
	re?: RegExp
	explicitLeadingDot?: boolean
}

const enum SegmentKind {
	LiteralRegex = 0, // a single path segment matched by an anchored RegExp
	GlobStar = 1, // ** spanning 0..n segments
}

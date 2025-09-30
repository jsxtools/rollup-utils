export const toMergedArray = <T>(a?: T[] | null, b?: T[] | null): T[] => [...(a ?? []), ...(b ?? [])]

export const toArray = <T>(items: T | T[] | null | undefined): NonNullable<T>[] =>
	([] as T[]).concat(items ?? []).filter((item) => item != null)

export const assignInput = <T extends string[] | Record<string, string>>(input: T, id: string): T => {
	if (Array.isArray(input)) {
		input.push(id)
	} else {
		input[id] = id
	}

	return input
}

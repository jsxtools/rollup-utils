export const every = <T>(value: unknown, predicate: Predicate<T>): value is T[] =>
	isArray(value) && value.every(predicate)

export const from = <T, R extends T = NonNullable<T>>(items: From<T>, predicate = __isNotNull as Predicate<R>): R[] =>
	(items == null ? [] : isArray(items) ? items : [items]).filter(predicate)

export const isArray = Array.isArray

export const merge = <T>(a?: T[] | null, b?: T[] | null): T[] => [...(a ?? []), ...(b ?? [])]

// #region Types

export type From<T> = T | T[] | (T | null | undefined)[] | null | undefined

export type Predicate<R> = (value: unknown) => value is R

// #region Internals

const __isNotNull = <T>(value: T): value is NonNullable<T> => value != null

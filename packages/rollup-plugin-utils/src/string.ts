/** Returns the value as a string. */
export const from = (value: unknown): string => String(value ?? "")

/** Returns the value as a trimmed string. */
export const trim = (value: unknown): string => from(value).trim()

/** Returns whether the value is a non-empty string. */
export const hasTrimmedValue = <T>(value: T): value is HasValue<T> => trim(value) !== ""

export type HasValue<T> = T extends string ? (T extends "" ? never : T) : never

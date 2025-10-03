export const to = (value: unknown, replacer?: Replacer, space?: Space): string => JSON.stringify(value, replacer, space)

export const from = <T>(json: string, reviver?: Reviver): T | undefined => {
	try {
		return JSON.parse(json, reviver)
	} catch {
		// do nothing and return undefined
	}
}

export type Reviver = (this: any, key: string, value: any) => any
export type Replacer = (this: any, key: string, value: any) => any
export type Space = string | number

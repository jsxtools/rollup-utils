import { relative, resolve, sep } from "node:path"

export { relative, resolve }

export const resolveDir = (...paths: string[]): string => resolve(...paths) + sep

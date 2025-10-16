import type * as Rollup from "rollup"
import { assignOptionsInput } from "./options.js"

export class VirtualAsset {
	#id = ""

	constructor(id: string) {
		this.id = id
	}

	get id(): string {
		return this.#id
	}

	set id(id: string) {
		id = id.replace(/^\0/, "").replace(/\/$/, "") || "virtual-entry"

		this.#id = id
	}

	get virtualId() {
		return `\0${this.id}/`
	}

	options(options: Rollup.RollupOptions): void {
		assignOptionsInput(options, this.virtualId)
	}

	generateBundle(options: Rollup.NormalizedOutputOptions, bundle: Rollup.OutputBundle): void {
		// with sanitization
		let bundleId = options.sanitizeFileName(this.virtualId)

		// without a trailing slash
		bundleId = bundleId.replace(/\/$/, "")

		// without an extension
		bundleId = bundleId.replace(/\.[^/.]+$/, "")

		// with virtualDirname
		bundleId = `${options.virtualDirname}/${bundleId}.js`

		// safely delete the bundle id
		for (const id of [bundleId, `${bundleId}.map`]) {
			delete bundle[id]
		}
	}
}

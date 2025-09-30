import type * as Rollup from "rollup"
import { assignInput } from "./options.js"

export class VirtualAsset {
	#id = ""
	#hooks = Object.create(null) as Partial<VirtualAsset.Hooks>

	constructor(id: string, hooks?: Partial<VirtualAsset.Hooks>) {
		this.id = id

		Object.assign(this.#hooks, hooks)
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

	buildStart(context: Rollup.PluginContext, options: Rollup.NormalizedInputOptions): void {
		if (typeof this.#hooks.buildStart === "function") {
			this.#hooks.buildStart.call(this, context, options)
		}

		assignInput(options.input, this.virtualId)
	}

	resolveId(
		context: Rollup.PluginContext,
		id: string,
		importer: string | undefined,
		options: VirtualAsset.ResolveIdOptions,
	): Rollup.ResolveIdResult {
		if (id === this.virtualId) {
			return this.#hooks.resolveId?.call(this, context, id, importer, options) || { id }
		}
	}

	load(context: Rollup.PluginContext, id: string): Rollup.LoadResult {
		if (id === this.virtualId) {
			return (
				this.#hooks.load?.call(this, context, id) || {
					code: "export let _",
				}
			)
		}
	}

	generateBundle(
		context: Rollup.PluginContext,
		options: Rollup.NormalizedOutputOptions,
		bundle: Rollup.OutputBundle,
	): void {
		if (typeof this.#hooks.generateBundle === "function") {
			this.#hooks.generateBundle.call(this, context, options, bundle)
		}

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

export namespace VirtualAsset {
	export interface Hooks {
		buildStart(this: VirtualAsset, context: Rollup.PluginContext, options: Rollup.NormalizedInputOptions): void
		resolveId(
			this: VirtualAsset,
			context: Rollup.PluginContext,
			id: string,
			importer: string | undefined,
			options: ResolveIdOptions,
		): Rollup.ResolveIdResult
		load(this: VirtualAsset, context: Rollup.PluginContext, id: string): Rollup.LoadResult
		generateBundle(
			this: VirtualAsset,
			context: Rollup.PluginContext,
			options: Rollup.NormalizedOutputOptions,
			bundle: Rollup.OutputBundle,
		): void
	}

	export interface ResolveIdOptions {
		attributes: Record<string, string>
		custom?: Rollup.CustomPluginOptions
		isEntry: boolean
	}
}

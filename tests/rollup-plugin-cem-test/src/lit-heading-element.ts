import { LitElement } from "lit"
import { customElement, property } from "lit/decorators.js"

@customElement("lit-heading")
export class AHeadingElement extends LitElement {
	/** The heading level. */
	@property({ type: Number })
	level = 1

	internals = Object.assign(this.attachInternals(), {
		role: "heading",
	})
}

declare global {
	interface HTMLElementTagNameMap {
		"lit-heading": AHeadingElement
	}
}

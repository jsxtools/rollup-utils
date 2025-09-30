export class HeadingElement extends HTMLElement {
	internals: ElementInternals = Object.assign(this.attachInternals(), {
		role: "heading",
	})
}

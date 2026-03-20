import { formatMessage } from "@utils/format.js";

export class Button {
	label: string;

	constructor(label: string) {
		this.label = label;
	}

	render(): string {
		return formatMessage(`<button>${this.label}</button>`);
	}
}

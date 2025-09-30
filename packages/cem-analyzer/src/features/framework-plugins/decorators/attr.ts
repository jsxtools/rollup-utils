import type { Attribute } from "custom-elements-manifest/schema.d.ts"
import type { AnalyzePhaseParams } from "../../../create.js"

export declare function attrDecoratorPlugin(converter: AttributeConverter): {
	name: string
	analyzePhase(params: AnalyzePhaseParams): void
}

export type AttributeConverter = (attribute: Attribute) => Attribute

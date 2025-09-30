import type { AnalyzePhaseParams } from "../../../create.js"

export declare function customElementDecoratorPlugin(): {
	name: string
	analyzePhase(params: AnalyzePhaseParams): void
}

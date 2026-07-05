import type { AnalyzePhaseParams, Plugin } from "../../../types.js";

/** Decorator plugin for custom elements. */
export declare function customElementDecoratorPlugin(): Plugin & {
	analyzePhase(params: AnalyzePhaseParams): void;
};

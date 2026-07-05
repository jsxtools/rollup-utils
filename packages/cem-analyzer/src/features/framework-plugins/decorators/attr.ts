import type { AnalyzePhaseParams, CEM, Plugin } from "../../../types.js";

/** Decorator plugin for @attr fields. */
export declare function attrDecoratorPlugin(converter?: AttributeConverter): Plugin & {
	analyzePhase(params: AnalyzePhaseParams): void;
};

/** Attribute declaration converter hook. */
export type AttributeConverter = (attribute: CEM.Attribute) => CEM.Attribute;

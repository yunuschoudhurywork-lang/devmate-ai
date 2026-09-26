import type { AnalysisInput, Finding } from "../types/analysis";

/** Base contract for all code analyzers, including future security and performance analyzers. */
export interface Analyzer {
  analyze(input: AnalysisInput): Promise<Finding[]>;
}

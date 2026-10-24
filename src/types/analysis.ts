export type FindingType = "error" | "security" | "performance";
export type Severity = "low" | "medium" | "high" | "critical";

export interface AnalysisInput {
  code: string;
  language: string;
  filename?: string;
}

export interface Finding {
  type: FindingType;
  severity: Severity;
  line: number;
  message: string;
  ruleId: string;
  suggestion?: string;
}

export interface ExplanationInput {
  language: string;
  filename?: string;
  sourceContext: string;
  finding: Finding;
}

export interface FindingExplanation {
  explanation: string;
  suggestedFix: string;
  caveats: string;
}

export interface QualityScore {
  overall: number;
  categories: {
    correctness: number;
    security: number;
    performance: number;
  };
}

export interface AnalysisResult {
  language: string;
  findings: Finding[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    security: number;
    performance: number;
  };
  quality: QualityScore;
}

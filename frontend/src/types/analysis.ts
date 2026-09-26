export type FindingType = "error" | "security" | "performance";
export type Severity = "low" | "medium" | "high" | "critical";
export type AnalysisLanguage = "javascript" | "typescript";

export interface Finding {
  type: FindingType;
  severity: Severity;
  line: number;
  message: string;
  ruleId: string;
  suggestion?: string;
}

export interface AnalysisInput {
  language: AnalysisLanguage;
  filename?: string;
  code: string;
}

export interface AnalysisResult {
  language: AnalysisLanguage;
  findings: Finding[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    security: number;
    performance: number;
  };
  quality: {
    overall: number;
    categories: {
      correctness: number;
      security: number;
      performance: number;
    };
  };
}

export interface AnalyzeSuccessResponse {
  success: true;
  analysis: AnalysisResult;
}

export interface AnalyzeErrorResponse {
  success: false;
  error: string;
}

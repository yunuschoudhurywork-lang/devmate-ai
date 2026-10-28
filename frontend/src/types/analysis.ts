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
  reportId?: string;
}

export interface AnalyzeErrorResponse {
  success: false;
  error: string;
}

export interface ExplanationInput {
  language: AnalysisLanguage;
  filename?: string;
  sourceContext: string;
  finding: Finding;
  reportId?: string;
}

export interface FindingExplanation {
  explanation: string;
  suggestedFix: string;
  caveats: string;
}

export interface ExplainSuccessResponse {
  success: true;
  explanation: FindingExplanation;
}

export interface ReviewSummaryInput {
  language: AnalysisLanguage;
  filename?: string;
  analysisResult: AnalysisResult;
  reportId?: string;
}

export interface ReviewSummary {
  summary: string;
  keyRisks: string[];
  priorities: string[];
  caveats: string;
}

export interface ReviewSummarySuccessResponse {
  success: true;
  summary: ReviewSummary;
}

export interface ReportListItem {
  id: string;
  language: string;
  filename: string | null;
  createdAt: string;
  totalFindings: number;
  overallScore: number;
  hasReviewSummary: boolean;
}

export interface ReportsListSuccessResponse {
  success: true;
  reports: ReportListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SavedReport {
  id: string;
  language: string;
  filename: string | null;
  createdAt: string;
  analysis: AnalysisResult;
  reviewSummary: ReviewSummary | null;
  explanations: Record<string, FindingExplanation>;
}

export interface ReportSuccessResponse {
  success: true;
  report: SavedReport;
}

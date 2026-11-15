export type FindingType = "error" | "security" | "performance";
export type Severity = "low" | "medium" | "high" | "critical";
export type AnalysisLanguage = "javascript" | "typescript" | "python" | "java";

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
  projectId?: string;
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
  projectId: string | null;
  projectName: string | null;
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
  projectId?: string | null;
  projectName?: string | null;
  analysis: AnalysisResult;
  reviewSummary: ReviewSummary | null;
  explanations: Record<string, FindingExplanation>;
}

export interface ReportSuccessResponse {
  success: true;
  report: SavedReport;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: "local" | "github" | string;
  githubLogin: string | null;
  hasPassword?: boolean;
  createdAt?: string;
}

export interface AuthSuccessResponse {
  success: true;
  user: User;
  token: string;
}

export interface AuthConfig {
  success: true;
  passwordAuth: boolean;
  githubEnabled: boolean;
  ai: {
    configured: boolean;
    provider: string | null;
    model: string | null;
  };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  repoFullName: string | null;
  provider: string;
  defaultBranch: string;
  language: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  reportCount: number;
  averageScore: number | null;
  lastAnalyzedAt: string | null;
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  repoFullName?: string | null;
  defaultBranch?: string;
  language?: string | null;
  visibility?: string;
  provider?: string;
}

export interface ProjectsSuccessResponse {
  success: true;
  projects: Project[];
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardData {
  success: true;
  stats: {
    reports: number;
    projects: number;
    artifacts: number;
    findings: number;
    securityFindings: number;
    performanceFindings: number;
    errorFindings: number;
    averageScore: number;
    categoryAverages: {
      correctness: number;
      security: number;
      performance: number;
    };
  };
  scoreTrend: Array<{ date: string; reports: number; averageScore: number | null }>;
  recentReports: Array<{
    id: string;
    filename: string | null;
    language: string;
    overallScore: number;
    totalFindings: number;
    createdAt: string;
    project: { id: string; name: string } | null;
  }>;
  recentArtifacts: AiArtifactSummary[];
}

// ---------------------------------------------------------------------------
// AI review engine
// ---------------------------------------------------------------------------

export type AiTaskKind = "review" | "pr-comments" | "security-fixes" | "refactor" | "bug-explanations";

export interface AiTaskInput {
  language: string;
  filename?: string;
  code: string;
  findings?: Finding[];
  reportId?: string;
}

export interface AiReviewResult {
  summary: string;
  verdict: string;
  strengths: string[];
  concerns: Array<{ title: string; severity: string; detail: string; line?: number }>;
  nextSteps: string[];
}

export interface AiPrCommentsResult {
  comments: Array<{ path: string; line: number; severity: string; body: string }>;
}

export interface AiSecurityResult {
  summary: string;
  fixes: Array<{
    title: string;
    severity: string;
    category?: string;
    explanation: string;
    remediation: string;
    codeExample?: string;
  }>;
}

export interface AiRefactorResult {
  summary: string;
  recommendations: Array<{
    title: string;
    rationale: string;
    impact?: string;
    effort?: string;
    steps: string[];
  }>;
}

export interface AiBugResult {
  explanations: Array<{
    title: string;
    line?: number;
    rootCause: string;
    explanation: string;
    fix: string;
    testSuggestion: string;
  }>;
}

export interface AiTaskResponse {
  success: true;
  kind: AiTaskKind;
  provider: string;
  model: string;
  result: unknown;
  artifactId: string;
}

export interface AiArtifactSummary {
  id: string;
  kind: AiTaskKind | string;
  title: string;
  provider: string;
  model: string;
  reportId: string | null;
  createdAt: string;
  content: unknown;
}

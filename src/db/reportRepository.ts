import { prisma } from "./prisma";
import type { Finding, AnalysisResult, ReviewSummary, FindingExplanation } from "../types/analysis";

export interface SavedReport {
  id: string;
  language: string;
  filename: string | null;
  createdAt: Date;
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  securityCount: number;
  performanceCount: number;
  overallScore: number;
  correctnessScore: number;
  securityScore: number;
  performanceScore: number;
}

export interface FullReport extends SavedReport {
  findings: Finding[];
  reviewSummary: ReviewSummary | null;
  explanations: Map<string, FindingExplanation>;
}

export interface ReportListItem {
  id: string;
  language: string;
  filename: string | null;
  createdAt: Date;
  totalFindings: number;
  overallScore: number;
  hasReviewSummary: boolean;
}

/** Save a complete analysis report with all findings */
export async function saveAnalysisReport(
  input: { language: string; filename?: string },
  result: AnalysisResult
): Promise<string> {
  const report = await prisma.report.create({
    data: {
      language: input.language,
      filename: input.filename || null,
      totalFindings: result.summary.total,
      errorCount: result.summary.errors,
      warningCount: result.summary.warnings,
      securityCount: result.summary.security,
      performanceCount: result.summary.performance,
      overallScore: result.quality.overall,
      correctnessScore: result.quality.categories.correctness,
      securityScore: result.quality.categories.security,
      performanceScore: result.quality.categories.performance,
      findings: {
        create: result.findings.map((finding) => ({
          type: finding.type,
          severity: finding.severity,
          line: finding.line,
          message: finding.message,
          ruleId: finding.ruleId,
          suggestion: finding.suggestion || null,
        })),
      },
    },
  });

  return report.id;
}

/** Get paginated list of reports */
export async function getReportsList(page = 1, pageSize = 20): Promise<{ reports: ReportListItem[]; total: number }> {
  const skip = (page - 1) * pageSize;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        language: true,
        filename: true,
        createdAt: true,
        totalFindings: true,
        overallScore: true,
        reviewSummary: { select: { id: true } },
      },
    }),
    prisma.report.count(),
  ]);

  return {
    reports: reports.map((r) => ({
      id: r.id,
      language: r.language,
      filename: r.filename,
      createdAt: r.createdAt,
      totalFindings: r.totalFindings,
      overallScore: r.overallScore,
      hasReviewSummary: Boolean(r.reviewSummary),
    })),
    total,
  };
}

/** Get a complete report by ID */
export async function getReportById(reportId: string): Promise<FullReport | null> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      findings: true,
      reviewSummary: true,
      explanations: { include: { finding: true } },
    },
  });

  if (!report) return null;

  // Convert database records to application types
  const findings: Finding[] = report.findings.map((f) => ({
    type: f.type as Finding["type"],
    severity: f.severity as Finding["severity"],
    line: f.line,
    message: f.message,
    ruleId: f.ruleId,
    suggestion: f.suggestion || undefined,
  }));

  const reviewSummary: ReviewSummary | null = report.reviewSummary
    ? {
        summary: report.reviewSummary.summary,
        keyRisks: report.reviewSummary.keyRisks,
        priorities: report.reviewSummary.priorities,
        caveats: report.reviewSummary.caveats,
      }
    : null;

  // Build explanations map keyed by finding ruleId-line-type
  const explanations = new Map<string, FindingExplanation>();
  for (const exp of report.explanations) {
    const finding = report.findings.find((f) => f.id === exp.findingId);
    if (finding) {
      const key = `${finding.ruleId}-${finding.line}-${finding.type}`;
      explanations.set(key, {
        explanation: exp.explanation,
        suggestedFix: exp.suggestedFix,
        caveats: exp.caveats,
      });
    }
  }

  return {
    id: report.id,
    language: report.language,
    filename: report.filename,
    createdAt: report.createdAt,
    totalFindings: report.totalFindings,
    errorCount: report.errorCount,
    warningCount: report.warningCount,
    securityCount: report.securityCount,
    performanceCount: report.performanceCount,
    overallScore: report.overallScore,
    correctnessScore: report.correctnessScore,
    securityScore: report.securityScore,
    performanceScore: report.performanceScore,
    findings,
    reviewSummary,
    explanations,
  };
}

/** Delete a report and all associated data */
export async function deleteReport(reportId: string): Promise<boolean> {
  try {
    await prisma.report.delete({
      where: { id: reportId },
    });
    return true;
  } catch {
    return false;
  }
}

/** Save or update a review summary for a report */
export async function saveReviewSummary(reportId: string, summary: ReviewSummary): Promise<void> {
  await prisma.reviewSummary.upsert({
    where: { reportId },
    update: {
      summary: summary.summary,
      keyRisks: summary.keyRisks,
      priorities: summary.priorities,
      caveats: summary.caveats,
    },
    create: {
      reportId,
      summary: summary.summary,
      keyRisks: summary.keyRisks,
      priorities: summary.priorities,
      caveats: summary.caveats,
    },
  });
}

/** Save an explanation for a specific finding */
export async function saveExplanation(
  reportId: string,
  finding: Finding,
  explanation: FindingExplanation
): Promise<void> {
  // Find the persisted finding that matches this finding's characteristics
  const persistedFinding = await prisma.finding.findFirst({
    where: {
      reportId,
      type: finding.type,
      severity: finding.severity,
      line: finding.line,
      ruleId: finding.ruleId,
      message: finding.message,
    },
  });

  if (!persistedFinding) {
    throw new Error("Finding not found in report");
  }

  // Upsert explanation (replace if exists)
  await prisma.explanation.upsert({
    where: {
      reportId_findingId: {
        reportId,
        findingId: persistedFinding.id,
      },
    },
    update: {
      explanation: explanation.explanation,
      suggestedFix: explanation.suggestedFix,
      caveats: explanation.caveats,
    },
    create: {
      reportId,
      findingId: persistedFinding.id,
      explanation: explanation.explanation,
      suggestedFix: explanation.suggestedFix,
      caveats: explanation.caveats,
    },
  });
}

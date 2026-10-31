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
  input: { language: string; filename?: string; userId?: string },
  result: AnalysisResult
): Promise<string> {
  const report = await prisma.report.create({
    data: {
      language: input.language,
      filename: input.filename || null,
      userId: input.userId || null,
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

/** Get paginated list of reports for a specific user */
export async function getReportsList(
  page = 1,
  pageSize = 20,
  userId?: string
): Promise<{ reports: ReportListItem[]; total: number }> {
  const skip = (page - 1) * pageSize;

  const where = userId ? { userId } : { userId: null };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
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
    prisma.report.count({ where }),
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

/** Get a complete report by ID with ownership validation */
export async function getReportById(reportId: string, userId?: string): Promise<FullReport | null> {
  const where = userId ? { id: reportId, userId } : { id: reportId, userId: null };

  const report = await prisma.report.findFirst({
    where,
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

/** Delete a report with ownership validation */
export async function deleteReport(reportId: string, userId?: string): Promise<boolean> {
  try {
    const where = userId ? { id: reportId, userId } : { id: reportId, userId: null };

    await prisma.report.delete({
      where,
    });
    return true;
  } catch {
    return false;
  }
}

/** Save or update a review summary for a report with ownership validation */
export async function saveReviewSummary(reportId: string, summary: ReviewSummary, userId?: string): Promise<void> {
  // Verify ownership
  if (userId) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });
    if (!report) {
      throw new Error("Report not found or access denied");
    }
  }

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

/** Save an explanation for a specific finding with ownership validation */
export async function saveExplanation(
  reportId: string,
  finding: Finding,
  explanation: FindingExplanation,
  userId?: string
): Promise<void> {
  // Verify ownership
  if (userId) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });
    if (!report) {
      throw new Error("Report not found or access denied");
    }
  }

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

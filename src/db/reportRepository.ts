import { prisma } from "./prisma";
import type { Finding, AnalysisResult, ReviewSummary, FindingExplanation } from "../types/analysis";

export interface SavedReport {
  id: string;
  language: string;
  filename: string | null;
  createdAt: Date;
  projectId: string | null;
  projectName: string | null;
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
  projectId: string | null;
  projectName: string | null;
}

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

/** Save a complete analysis report with all findings. */
export async function saveAnalysisReport(
  input: { language: string; filename?: string; userId?: string; projectId?: string },
  result: AnalysisResult
): Promise<string> {
  let projectId: string | null = null;

  if (input.projectId && input.userId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId: input.userId },
      select: { id: true }
    });
    projectId = project?.id ?? null;
  }

  const report = await prisma.report.create({
    data: {
      language: input.language,
      filename: input.filename || null,
      userId: input.userId || null,
      projectId,
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
          suggestion: finding.suggestion || null
        }))
      }
    }
  });

  return report.id;
}

/** Get a paginated list of reports for a user, optionally scoped to a project. */
export async function getReportsList(
  page = 1,
  pageSize = 20,
  userId?: string,
  projectId?: string
): Promise<{ reports: ReportListItem[]; total: number }> {
  const skip = (page - 1) * pageSize;
  const where = {
    ...(userId ? { userId } : { userId: null }),
    ...(projectId ? { projectId } : {})
  };

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
        projectId: true,
        project: { select: { name: true } },
        reviewSummary: { select: { id: true } }
      }
    }),
    prisma.report.count({ where })
  ]);

  return {
    reports: reports.map((report) => ({
      id: report.id,
      language: report.language,
      filename: report.filename,
      createdAt: report.createdAt,
      totalFindings: report.totalFindings,
      overallScore: report.overallScore,
      hasReviewSummary: Boolean(report.reviewSummary),
      projectId: report.projectId,
      projectName: report.project?.name ?? null
    })),
    total
  };
}

/** Get a complete report by ID with ownership validation. */
export async function getReportById(reportId: string, userId?: string): Promise<FullReport | null> {
  const where = userId ? { id: reportId, userId } : { id: reportId, userId: null };

  const report = await prisma.report.findFirst({
    where,
    include: {
      findings: true,
      project: { select: { name: true } },
      reviewSummary: true,
      explanations: true
    }
  });

  if (!report) return null;

  const findings: Finding[] = report.findings.map((finding) => ({
    type: finding.type as Finding["type"],
    severity: finding.severity as Finding["severity"],
    line: finding.line,
    message: finding.message,
    ruleId: finding.ruleId,
    suggestion: finding.suggestion || undefined
  }));

  const reviewSummary: ReviewSummary | null = report.reviewSummary
    ? {
        summary: report.reviewSummary.summary,
        keyRisks: parseStringArray(report.reviewSummary.keyRisks),
        priorities: parseStringArray(report.reviewSummary.priorities),
        caveats: report.reviewSummary.caveats
      }
    : null;

  const explanations = new Map<string, FindingExplanation>();
  for (const explanation of report.explanations) {
    const finding = report.findings.find((entry) => entry.id === explanation.findingId);
    if (finding) {
      const key = `${finding.ruleId}-${finding.line}-${finding.type}`;
      explanations.set(key, {
        explanation: explanation.explanation,
        suggestedFix: explanation.suggestedFix,
        caveats: explanation.caveats
      });
    }
  }

  return {
    id: report.id,
    language: report.language,
    filename: report.filename,
    createdAt: report.createdAt,
    projectId: report.projectId,
    projectName: report.project?.name ?? null,
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
    explanations
  };
}

/** Delete a report with ownership validation. */
export async function deleteReport(reportId: string, userId?: string): Promise<boolean> {
  const where = userId ? { id: reportId, userId } : { id: reportId, userId: null };
  const existing = await prisma.report.findFirst({ where, select: { id: true } });
  if (!existing) return false;

  await prisma.report.delete({ where: { id: existing.id } });
  return true;
}

/** Save or update a review summary for a report with ownership validation. */
export async function saveReviewSummary(reportId: string, summary: ReviewSummary, userId?: string): Promise<void> {
  const report = await prisma.report.findFirst({
    where: { id: reportId, ...(userId ? { userId } : {}) },
    select: { id: true }
  });
  if (!report) {
    throw new Error("Report not found or access denied");
  }

  const data = {
    summary: summary.summary,
    keyRisks: JSON.stringify(summary.keyRisks),
    priorities: JSON.stringify(summary.priorities),
    caveats: summary.caveats
  };

  await prisma.reviewSummary.upsert({
    where: { reportId },
    update: data,
    create: { reportId, ...data }
  });
}

/** Save an explanation for a specific finding with ownership validation. */
export async function saveExplanation(
  reportId: string,
  finding: Finding,
  explanation: FindingExplanation,
  userId?: string
): Promise<void> {
  const report = await prisma.report.findFirst({
    where: { id: reportId, ...(userId ? { userId } : {}) },
    select: { id: true }
  });
  if (!report) {
    throw new Error("Report not found or access denied");
  }

  const persistedFinding = await prisma.finding.findFirst({
    where: {
      reportId,
      type: finding.type,
      severity: finding.severity,
      line: finding.line,
      ruleId: finding.ruleId,
      message: finding.message
    }
  });

  if (!persistedFinding) {
    throw new Error("Finding not found in report");
  }

  await prisma.explanation.upsert({
    where: { reportId_findingId: { reportId, findingId: persistedFinding.id } },
    update: {
      explanation: explanation.explanation,
      suggestedFix: explanation.suggestedFix,
      caveats: explanation.caveats
    },
    create: {
      reportId,
      findingId: persistedFinding.id,
      explanation: explanation.explanation,
      suggestedFix: explanation.suggestedFix,
      caveats: explanation.caveats
    }
  });
}

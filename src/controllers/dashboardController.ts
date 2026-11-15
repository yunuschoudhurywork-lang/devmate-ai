import type { Request, Response } from "express";
import { prisma } from "../db/prisma";

const TREND_DAYS = 14;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** GET /api/dashboard - aggregated statistics for the signed-in user. */
export async function getDashboard(request: Request, response: Response): Promise<void> {
  const userId = request.user!.id;

  try {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (TREND_DAYS - 1));

    const [reports, projectCount, artifactCount, recentArtifacts, recentReports] = await Promise.all([
      prisma.report.findMany({
        where: { userId, createdAt: { gte: since } },
        select: {
          createdAt: true,
          overallScore: true,
          correctnessScore: true,
          securityScore: true,
          performanceScore: true,
          totalFindings: true
        },
        orderBy: { createdAt: "asc" }
      }),
      prisma.project.count({ where: { userId } }),
      prisma.aiArtifact.count({ where: { userId } }),
      prisma.aiArtifact.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, kind: true, title: true, provider: true, model: true, createdAt: true, reportId: true }
      }),
      prisma.report.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          filename: true,
          language: true,
          overallScore: true,
          totalFindings: true,
          createdAt: true,
          project: { select: { id: true, name: true } }
        }
      })
    ]);

    const [totalReports, totalFindings] = await Promise.all([
      prisma.report.count({ where: { userId } }),
      prisma.report.aggregate({
        where: { userId },
        _sum: { totalFindings: true, securityCount: true, performanceCount: true, errorCount: true }
      })
    ]);

    const [allTimeAverages] = await Promise.all([
      prisma.report.aggregate({
        where: { userId },
        _avg: { overallScore: true, correctnessScore: true, securityScore: true, performanceScore: true }
      })
    ]);

    // Build a per-day trend including days with no activity.
    const buckets = new Map<string, { totalScore: number; count: number }>();
    for (let index = 0; index < TREND_DAYS; index += 1) {
      const date = new Date(since);
      date.setUTCDate(since.getUTCDate() + index);
      buckets.set(dayKey(date), { totalScore: 0, count: 0 });
    }
    for (const report of reports) {
      const bucket = buckets.get(dayKey(report.createdAt));
      if (!bucket) continue;
      bucket.totalScore += report.overallScore;
      bucket.count += 1;
    }

    const scoreTrend = [...buckets.entries()].map(([date, bucket]) => ({
      date,
      reports: bucket.count,
      averageScore: bucket.count > 0 ? Math.round(bucket.totalScore / bucket.count) : null
    }));

    response.status(200).json({
      success: true,
      stats: {
        reports: totalReports,
        projects: projectCount,
        artifacts: artifactCount,
        findings: totalFindings._sum.totalFindings ?? 0,
        securityFindings: totalFindings._sum.securityCount ?? 0,
        performanceFindings: totalFindings._sum.performanceCount ?? 0,
        errorFindings: totalFindings._sum.errorCount ?? 0,
        averageScore: Math.round(allTimeAverages._avg.overallScore ?? 0),
        categoryAverages: {
          correctness: Math.round(allTimeAverages._avg.correctnessScore ?? 0),
          security: Math.round(allTimeAverages._avg.securityScore ?? 0),
          performance: Math.round(allTimeAverages._avg.performanceScore ?? 0)
        }
      },
      scoreTrend,
      recentReports,
      recentArtifacts
    });
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    response.status(500).json({ success: false, error: "Failed to load dashboard data." });
  }
}

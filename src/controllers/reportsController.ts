import type { Request, Response } from "express";
import { getReportsList, getReportById, deleteReport } from "../db/reportRepository";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** GET /api/reports - List saved reports with pagination */
export async function listReports(request: Request, response: Response): Promise<void> {
  const page = parseInt(String(request.query.page || "1"), 10);
  const pageSize = Math.min(
    parseInt(String(request.query.pageSize || String(DEFAULT_PAGE_SIZE)), 10),
    MAX_PAGE_SIZE
  );

  if (isNaN(page) || page < 1) {
    response.status(400).json({ success: false, error: "Invalid page number." });
    return;
  }

  if (isNaN(pageSize) || pageSize < 1) {
    response.status(400).json({ success: false, error: "Invalid page size." });
    return;
  }

  try {
    const { reports, total } = await getReportsList(page, pageSize);
    response.status(200).json({
      success: true,
      reports,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Failed to list reports:", error);
    response.status(500).json({ success: false, error: "Failed to retrieve reports." });
  }
}

/** GET /api/reports/:reportId - Get a complete report by ID */
export async function getReport(request: Request, response: Response): Promise<void> {
  const { reportId } = request.params;

  if (!reportId || typeof reportId !== "string") {
    response.status(400).json({ success: false, error: "Report ID is required." });
    return;
  }

  try {
    const report = await getReportById(reportId);

    if (!report) {
      response.status(404).json({ success: false, error: "Report not found." });
      return;
    }

    // Convert to API response format
    const apiResponse = {
      success: true,
      report: {
        id: report.id,
        language: report.language,
        filename: report.filename,
        createdAt: report.createdAt,
        analysis: {
          language: report.language,
          findings: report.findings,
          summary: {
            total: report.totalFindings,
            errors: report.errorCount,
            warnings: report.warningCount,
            security: report.securityCount,
            performance: report.performanceCount,
          },
          quality: {
            overall: report.overallScore,
            categories: {
              correctness: report.correctnessScore,
              security: report.securityScore,
              performance: report.performanceScore,
            },
          },
        },
        reviewSummary: report.reviewSummary,
        explanations: Object.fromEntries(report.explanations),
      },
    };

    response.status(200).json(apiResponse);
  } catch (error) {
    console.error("Failed to get report:", error);
    response.status(500).json({ success: false, error: "Failed to retrieve report." });
  }
}

/** DELETE /api/reports/:reportId - Delete a report */
export async function removeReport(request: Request, response: Response): Promise<void> {
  const { reportId } = request.params;

  if (!reportId || typeof reportId !== "string") {
    response.status(400).json({ success: false, error: "Report ID is required." });
    return;
  }

  try {
    const deleted = await deleteReport(reportId);

    if (!deleted) {
      response.status(404).json({ success: false, error: "Report not found." });
      return;
    }

    response.status(200).json({ success: true, message: "Report deleted successfully." });
  } catch (error) {
    console.error("Failed to delete report:", error);
    response.status(500).json({ success: false, error: "Failed to delete report." });
  }
}

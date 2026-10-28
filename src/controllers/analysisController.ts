import type { Request, Response } from "express";
import { AnalysisService } from "../services/analysisService";
import { saveAnalysisReport } from "../db/reportRepository";
import type { AnalysisInput } from "../types/analysis";

const SUPPORTED_LANGUAGES = new Set(["javascript", "typescript"]);
const analysisService = new AnalysisService();

export async function analyzeCode(request: Request, response: Response): Promise<void> {
  const body = request.body as Partial<AnalysisInput> | undefined;
  const language = typeof body?.language === "string" ? body.language.toLowerCase() : undefined;

  if (!language || !SUPPORTED_LANGUAGES.has(language)) {
    response.status(400).json({
      success: false,
      error: "Unsupported language. Supported languages: javascript, typescript."
    });
    return;
  }

  if (typeof body?.code !== "string" || body.code.trim().length === 0) {
    response.status(400).json({ success: false, error: "'code' is required and must be a non-empty string." });
    return;
  }

  if (body.filename !== undefined && typeof body.filename !== "string") {
    response.status(400).json({ success: false, error: "'filename' must be a string when provided." });
    return;
  }

  const analysis = await analysisService.analyze({ code: body.code, language, filename: body.filename });

  // Persist the analysis report
  let reportId: string | undefined;
  try {
    reportId = await saveAnalysisReport({ language, filename: body.filename }, analysis);
  } catch (error) {
    // Log but don't fail the request if persistence fails
    console.error("Failed to persist analysis report:", error);
  }

  response.status(200).json({ success: true, analysis, reportId });
}

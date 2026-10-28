import type { Request, Response } from "express";
import { ExplanationNotConfiguredError, ExplanationProviderError } from "../services/explanationService";
import { ReviewSummaryService, InvalidSummaryError } from "../services/reviewSummaryService";
import { saveReviewSummary } from "../db/reportRepository";
import type { ReviewSummaryInput, AnalysisResult } from "../types/analysis";

const SUPPORTED_LANGUAGES = new Set(["javascript", "typescript"]);
const MAX_FILENAME_LENGTH = 255;
const MAX_FINDINGS_COUNT = 200;
const MAX_FINDING_MESSAGE_LENGTH = 2_000;

interface ReviewSummaryRequestBody extends ReviewSummaryInput {
  reportId?: string;
}

export function createReviewSummaryController(summaryService: ReviewSummaryService) {
  return async (request: Request, response: Response): Promise<void> => {
    const input = validateInput(request.body);
    if (input instanceof Error) {
      response.status(400).json({ success: false, error: input.message });
      return;
    }

    try {
      const summary = await summaryService.generateSummary(input);

      // Persist summary if reportId is provided
      const body = request.body as ReviewSummaryRequestBody;
      if (body.reportId && typeof body.reportId === "string") {
        try {
          await saveReviewSummary(body.reportId, summary);
        } catch (error) {
          console.error("Failed to persist review summary:", error);
          // Don't fail the request if persistence fails
        }
      }

      response.status(200).json({ success: true, summary });
    } catch (error) {
      if (error instanceof ExplanationNotConfiguredError) {
        response.status(503).json({ success: false, error: "AI review summaries are not configured. Set GEMINI_API_KEY on the backend." });
        return;
      }
      if (error instanceof ExplanationProviderError) {
        response.status(503).json({ success: false, error: "AI review summary service is currently unavailable. Please try again later." });
        return;
      }
      if (error instanceof InvalidSummaryError) {
        response.status(502).json({ success: false, error: "AI review summary service returned an invalid response." });
        return;
      }
      response.status(500).json({ success: false, error: "Unable to generate an AI review summary." });
    }
  };
}

function validateInput(body: unknown): ReviewSummaryInput | Error {
  if (typeof body !== "object" || body === null) return new Error("A JSON review summary request is required.");

  const value = body as Partial<ReviewSummaryInput>;
  const language = typeof value.language === "string" ? value.language.toLowerCase() : "";

  if (!SUPPORTED_LANGUAGES.has(language)) {
    return new Error("Unsupported language. Supported languages: javascript, typescript.");
  }

  if (value.filename !== undefined && (typeof value.filename !== "string" || value.filename.length > MAX_FILENAME_LENGTH)) {
    return new Error("'filename' must be a string up to 255 characters.");
  }

  if (!isAnalysisResult(value.analysisResult)) {
    return new Error("'analysisResult' must be a valid analysis result object.");
  }

  if (value.analysisResult.findings.length > MAX_FINDINGS_COUNT) {
    return new Error(`'analysisResult.findings' exceeds the maximum count of ${MAX_FINDINGS_COUNT}.`);
  }

  // Validate finding message lengths
  for (const finding of value.analysisResult.findings) {
    if (finding.message.length > MAX_FINDING_MESSAGE_LENGTH) {
      return new Error("One or more finding messages exceed the 2000 character limit.");
    }
  }

  return { language, filename: value.filename, analysisResult: value.analysisResult };
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  return typeof value === "object" && value !== null &&
    "language" in value && typeof value.language === "string" &&
    "findings" in value && Array.isArray(value.findings) &&
    "summary" in value && typeof value.summary === "object" && value.summary !== null &&
    "quality" in value && typeof value.quality === "object" && value.quality !== null;
}

import type { Request, Response } from "express";
import { ExplanationNotConfiguredError, ExplanationProviderError, ExplanationService, InvalidExplanationError } from "../services/explanationService";
import type { ExplanationInput, Finding, FindingType, Severity } from "../types/analysis";

const SUPPORTED_LANGUAGES = new Set(["javascript", "typescript"]);
const FINDING_TYPES = new Set<FindingType>(["error", "security", "performance"]);
const SEVERITIES = new Set<Severity>(["low", "medium", "high", "critical"]);
const MAX_SOURCE_CONTEXT_LENGTH = 8_000;
const MAX_FILENAME_LENGTH = 255;
const MAX_FINDING_MESSAGE_LENGTH = 2_000;
const MAX_RULE_ID_LENGTH = 200;
const MAX_SUGGESTION_LENGTH = 2_000;

export function createExplainController(explanationService: ExplanationService) {
  return async (request: Request, response: Response): Promise<void> => {
    const input = validateInput(request.body);
    if (input instanceof Error) {
      response.status(400).json({ success: false, error: input.message });
      return;
    }

    try {
      const explanation = await explanationService.explain(input);
      response.status(200).json({ success: true, explanation });
    } catch (error) {
      if (error instanceof ExplanationNotConfiguredError) {
        response.status(503).json({ success: false, error: "AI explanations are not configured. Set GEMINI_API_KEY on the backend." });
        return;
      }
      if (error instanceof ExplanationProviderError) {
        response.status(503).json({ success: false, error: "AI explanation service is currently unavailable. Please try again later." });
        return;
      }
      if (error instanceof InvalidExplanationError) {
        response.status(502).json({ success: false, error: "AI explanation service returned an invalid response." });
        return;
      }
      response.status(500).json({ success: false, error: "Unable to generate an AI explanation." });
    }
  };
}

function validateInput(body: unknown): ExplanationInput | Error {
  if (typeof body !== "object" || body === null) return new Error("A JSON explanation request is required.");
  const value = body as Partial<ExplanationInput>;
  const language = typeof value.language === "string" ? value.language.toLowerCase() : "";
  if (!SUPPORTED_LANGUAGES.has(language)) return new Error("Unsupported language. Supported languages: javascript, typescript.");
  if (typeof value.sourceContext !== "string" || value.sourceContext.trim().length === 0) return new Error("'sourceContext' is required and must be a non-empty string.");
  if (value.sourceContext.length > MAX_SOURCE_CONTEXT_LENGTH) return new Error("'sourceContext' exceeds the 8000 character limit.");
  if (value.filename !== undefined && (typeof value.filename !== "string" || value.filename.length > MAX_FILENAME_LENGTH)) return new Error("'filename' must be a string up to 255 characters.");
  if (!isFinding(value.finding)) return new Error("'finding' must contain valid type, severity, line, message, and ruleId fields.");

  return { language, filename: value.filename, sourceContext: value.sourceContext, finding: value.finding };
}

function isFinding(value: unknown): value is Finding {
  return typeof value === "object" && value !== null &&
    "type" in value && typeof value.type === "string" && FINDING_TYPES.has(value.type as FindingType) &&
    "severity" in value && typeof value.severity === "string" && SEVERITIES.has(value.severity as Severity) &&
    "line" in value && typeof value.line === "number" && Number.isInteger(value.line) && value.line > 0 &&
    "message" in value && typeof value.message === "string" && value.message.trim().length > 0 && value.message.length <= MAX_FINDING_MESSAGE_LENGTH &&
    "ruleId" in value && typeof value.ruleId === "string" && value.ruleId.trim().length > 0 && value.ruleId.length <= MAX_RULE_ID_LENGTH &&
    (!("suggestion" in value) || value.suggestion === undefined || (typeof value.suggestion === "string" && value.suggestion.length <= MAX_SUGGESTION_LENGTH));
}

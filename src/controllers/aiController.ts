import type { Request, Response } from "express";
import { AiInvalidResponseError, AiNotConfiguredError, AiProviderError } from "../services/llm/provider";
import { AiReviewEngine } from "../services/ai/reviewEngine";
import { AI_TASKS, isAiTaskKind, type AiTaskContext, type AiTaskKind } from "../services/ai/tasks";
import { createAiArtifact, deleteAiArtifact, getAiArtifact, listAiArtifacts } from "../db/aiArtifactRepository";
import { getReportById } from "../db/reportRepository";
import type { Finding, FindingType, Severity } from "../types/analysis";

const MAX_CODE_LENGTH = 20_000;
const MAX_FILENAME_LENGTH = 255;
const MAX_LANGUAGE_LENGTH = 40;
const MAX_FINDINGS = 200;
const FINDING_TYPES = new Set<FindingType>(["error", "security", "performance"]);
const SEVERITIES = new Set<Severity>(["low", "medium", "high", "critical"]);

function validateFindings(value: unknown): Finding[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_FINDINGS) return null;

  const findings: Finding[] = [];
  for (const entry of value) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("type" in entry) ||
      typeof entry.type !== "string" ||
      !FINDING_TYPES.has(entry.type as FindingType) ||
      !("severity" in entry) ||
      typeof entry.severity !== "string" ||
      !SEVERITIES.has(entry.severity as Severity) ||
      !("line" in entry) ||
      typeof entry.line !== "number" ||
      !Number.isInteger(entry.line) ||
      entry.line < 1 ||
      !("message" in entry) ||
      typeof entry.message !== "string" ||
      entry.message.trim().length === 0 ||
      !("ruleId" in entry) ||
      typeof entry.ruleId !== "string"
    ) {
      return null;
    }

    findings.push({
      type: entry.type as FindingType,
      severity: entry.severity as Severity,
      line: entry.line,
      message: entry.message,
      ruleId: entry.ruleId,
      suggestion: "suggestion" in entry && typeof entry.suggestion === "string" ? entry.suggestion : undefined
    });
  }

  return findings;
}

interface ValidatedBody {
  language: string;
  filename?: string;
  code: string;
  findings: Finding[];
  reportId?: string;
}

function validateBody(body: unknown): ValidatedBody | Error {
  if (typeof body !== "object" || body === null) return new Error("A JSON request body is required.");
  const value = body as Record<string, unknown>;

  if (typeof value.code !== "string" || value.code.trim().length === 0) {
    return new Error("'code' is required and must be a non-empty string.");
  }
  if (value.code.length > MAX_CODE_LENGTH) {
    return new Error(`'code' exceeds the ${MAX_CODE_LENGTH} character limit.`);
  }
  if (value.filename !== undefined && (typeof value.filename !== "string" || value.filename.length > MAX_FILENAME_LENGTH)) {
    return new Error(`'filename' must be a string up to ${MAX_FILENAME_LENGTH} characters.`);
  }
  if (value.language !== undefined && (typeof value.language !== "string" || value.language.length > MAX_LANGUAGE_LENGTH)) {
    return new Error(`'language' must be a string up to ${MAX_LANGUAGE_LENGTH} characters.`);
  }
  if (value.reportId !== undefined && typeof value.reportId !== "string") {
    return new Error("'reportId' must be a string when provided.");
  }

  const findings = validateFindings(value.findings);
  if (findings === null) {
    return new Error("'findings' must be an array of valid finding objects.");
  }

  return {
    language: typeof value.language === "string" && value.language.trim().length > 0 ? value.language.trim().toLowerCase() : "javascript",
    filename: typeof value.filename === "string" && value.filename.trim().length > 0 ? value.filename.trim() : undefined,
    code: value.code,
    findings,
    reportId: typeof value.reportId === "string" && value.reportId.length > 0 ? value.reportId : undefined
  };
}

function sendAiError(response: Response, error: unknown): void {
  if (error instanceof AiNotConfiguredError) {
    response.status(503).json({
      success: false,
      error: "AI features are not configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY or Azure OpenAI variables on the backend."
    });
    return;
  }
  if (error instanceof AiProviderError) {
    response.status(503).json({ success: false, error: "The AI provider is currently unavailable. Please try again later." });
    return;
  }
  if (error instanceof AiInvalidResponseError) {
    response.status(502).json({ success: false, error: "The AI provider returned an invalid response." });
    return;
  }
  console.error("AI request failed:", error);
  response.status(500).json({ success: false, error: "Unable to complete the AI request." });
}

export function createAiTaskHandler(kind: AiTaskKind, engine = new AiReviewEngine()) {
  return async (request: Request, response: Response): Promise<void> => {
    const body = validateBody(request.body);
    if (body instanceof Error) {
      response.status(400).json({ success: false, error: body.message });
      return;
    }

    const user = request.user!;

    try {
      if (body.reportId) {
        const report = await getReportById(body.reportId, user.id);
        if (!report) {
          response.status(404).json({ success: false, error: "Report not found." });
          return;
        }
      }

      const context: AiTaskContext = {
        language: body.language,
        filename: body.filename,
        code: body.code,
        findings: body.findings
      };

      const result = await engine.run(kind, context);

      const artifact = await createAiArtifact({
        userId: user.id,
        reportId: body.reportId ?? null,
        kind,
        title: body.filename ? `${AI_TASKS[kind].title} — ${body.filename}` : AI_TASKS[kind].title,
        provider: result.provider,
        model: result.model,
        content: result.data
      });

      response.status(200).json({
        success: true,
        kind,
        provider: result.provider,
        model: result.model,
        result: result.data,
        artifactId: artifact.id
      });
    } catch (error) {
      sendAiError(response, error);
    }
  };
}

/** GET /api/ai/artifacts */
export async function listArtifactsHandler(request: Request, response: Response): Promise<void> {
  const kindParam = typeof request.query.kind === "string" ? request.query.kind : undefined;
  if (kindParam !== undefined && !isAiTaskKind(kindParam)) {
    response.status(400).json({ success: false, error: "Unknown AI artifact kind." });
    return;
  }

  const limit = Number(request.query.limit ?? 20);

  try {
    const artifacts = await listAiArtifacts(request.user!.id, {
      kind: kindParam,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20
    });
    response.status(200).json({ success: true, artifacts });
  } catch (error) {
    console.error("Failed to list AI artifacts:", error);
    response.status(500).json({ success: false, error: "Failed to retrieve AI artifacts." });
  }
}

/** GET /api/ai/artifacts/:artifactId */
export async function getArtifactHandler(request: Request, response: Response): Promise<void> {
  try {
    const artifact = await getAiArtifact(request.user!.id, String(request.params.artifactId));
    if (!artifact) {
      response.status(404).json({ success: false, error: "AI artifact not found." });
      return;
    }
    response.status(200).json({ success: true, artifact });
  } catch (error) {
    console.error("Failed to get AI artifact:", error);
    response.status(500).json({ success: false, error: "Failed to retrieve the AI artifact." });
  }
}

/** DELETE /api/ai/artifacts/:artifactId */
export async function deleteArtifactHandler(request: Request, response: Response): Promise<void> {
  try {
    const deleted = await deleteAiArtifact(request.user!.id, String(request.params.artifactId));
    if (!deleted) {
      response.status(404).json({ success: false, error: "AI artifact not found." });
      return;
    }
    response.status(200).json({ success: true, message: "AI artifact deleted." });
  } catch (error) {
    console.error("Failed to delete AI artifact:", error);
    response.status(500).json({ success: false, error: "Failed to delete the AI artifact." });
  }
}

export { AI_TASKS };

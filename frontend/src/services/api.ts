import type { AnalysisInput, AnalyzeErrorResponse, AnalyzeSuccessResponse, ExplainSuccessResponse, ExplanationInput } from "@/types/analysis";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {}

export async function analyzeCode(input: AnalysisInput): Promise<AnalyzeSuccessResponse> {
  return postJson<AnalyzeSuccessResponse>("/api/analyze", input, isSuccessResponse, "The analysis request failed.");
}

export async function explainFinding(input: ExplanationInput): Promise<ExplainSuccessResponse> {
  return postJson<ExplainSuccessResponse>("/api/explain", input, isExplainSuccessResponse, "The explanation request failed.");
}

async function postJson<T>(path: string, input: AnalysisInput | ExplanationInput, isSuccess: (payload: unknown) => payload is T, fallbackError: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
  } catch {
    throw new ApiError("Unable to reach the DevMate backend. Confirm it is running on port 3000.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isSuccess(payload)) {
    const message = isErrorResponse(payload) ? payload.error : fallbackError;
    throw new ApiError(message);
  }

  return payload;
}

function isSuccessResponse(payload: unknown): payload is AnalyzeSuccessResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === true && "analysis" in payload;
}

function isExplainSuccessResponse(payload: unknown): payload is ExplainSuccessResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === true && "explanation" in payload;
}

function isErrorResponse(payload: unknown): payload is AnalyzeErrorResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === false && "error" in payload && typeof payload.error === "string";
}

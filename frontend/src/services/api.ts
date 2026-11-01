import type { AnalysisInput, AnalyzeErrorResponse, AnalyzeSuccessResponse, ExplainSuccessResponse, ExplanationInput, ReviewSummaryInput, ReviewSummarySuccessResponse, ReportsListSuccessResponse, ReportSuccessResponse } from "@/types/analysis";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {}

// Authentication types
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
}

export interface AuthSuccessResponse {
  success: true;
  user: User;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

export interface LogoutSuccessResponse {
  success: true;
  message: string;
}

// Authentication API
export function getLoginUrl(): string {
  return `${API_BASE_URL}/auth/login`;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include", // Include cookies
    });

    if (response.status === 401) {
      return null; // Not authenticated
    }

    const payload: unknown = await response.json().catch(() => null);
    
    if (!response.ok || !isAuthSuccessResponse(payload)) {
      return null;
    }

    return payload.user;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include", // Include cookies
    });

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const message = isErrorResponse(payload) ? payload.error : "Failed to log out.";
      throw new ApiError(message);
    }
  } catch (error) {
    throw new ApiError("Failed to log out. Please try again.");
  }
}

export async function analyzeCode(input: AnalysisInput): Promise<AnalyzeSuccessResponse> {
  return postJson<AnalyzeSuccessResponse>("/api/analyze", input, isSuccessResponse, "The analysis request failed.");
}

export async function explainFinding(input: ExplanationInput): Promise<ExplainSuccessResponse> {
  return postJson<ExplainSuccessResponse>("/api/explain", input, isExplainSuccessResponse, "The explanation request failed.");
}

export async function generateReviewSummary(input: ReviewSummaryInput): Promise<ReviewSummarySuccessResponse> {
  return postJson<ReviewSummarySuccessResponse>("/api/review-summary", input, isReviewSummarySuccessResponse, "The review summary request failed.");
}

export async function getReportsList(page = 1, pageSize = 20): Promise<ReportsListSuccessResponse> {
  return getJson<ReportsListSuccessResponse>(
    `/api/reports?page=${page}&pageSize=${pageSize}`,
    isReportsListSuccessResponse,
    "Failed to fetch reports list."
  );
}

export async function getReport(reportId: string): Promise<ReportSuccessResponse> {
  return getJson<ReportSuccessResponse>(
    `/api/reports/${encodeURIComponent(reportId)}`,
    isReportSuccessResponse,
    "Failed to fetch report."
  );
}

export async function deleteReport(reportId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/reports/${encodeURIComponent(reportId)}`, {
    method: "DELETE",
    credentials: "include", // Include cookies for authentication
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message = isErrorResponse(payload) ? payload.error : "Failed to delete report.";
    throw new ApiError(message);
  }
}

async function getJson<T>(path: string, isSuccess: (payload: unknown) => payload is T, fallbackError: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include", // Include cookies for authentication
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

async function postJson<T>(path: string, input: AnalysisInput | ExplanationInput | ReviewSummaryInput, isSuccess: (payload: unknown) => payload is T, fallbackError: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "include", // Include cookies for authentication
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

function isAuthSuccessResponse(payload: unknown): payload is AuthSuccessResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === true && "user" in payload;
}

function isSuccessResponse(payload: unknown): payload is AnalyzeSuccessResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === true && "analysis" in payload;
}

function isExplainSuccessResponse(payload: unknown): payload is ExplainSuccessResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === true && "explanation" in payload;
}

function isReviewSummarySuccessResponse(payload: unknown): payload is ReviewSummarySuccessResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === true && "summary" in payload;
}

function isReportsListSuccessResponse(payload: unknown): payload is ReportsListSuccessResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === true && "reports" in payload && Array.isArray((payload as any).reports);
}

function isReportSuccessResponse(payload: unknown): payload is ReportSuccessResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === true && "report" in payload;
}

function isErrorResponse(payload: unknown): payload is AnalyzeErrorResponse {
  return typeof payload === "object" && payload !== null && "success" in payload && payload.success === false && "error" in payload && typeof payload.error === "string";
}

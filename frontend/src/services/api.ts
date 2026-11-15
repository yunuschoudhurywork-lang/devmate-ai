import type {
  AiArtifactSummary,
  AiTaskInput,
  AiTaskKind,
  AiTaskResponse,
  AnalysisInput,
  AnalyzeErrorResponse,
  AnalyzeSuccessResponse,
  AuthConfig,
  AuthSuccessResponse,
  DashboardData,
  ExplainSuccessResponse,
  ExplanationInput,
  Project,
  ProjectInput,
  ProjectsSuccessResponse,
  ReportSuccessResponse,
  ReportsListSuccessResponse,
  ReviewSummaryInput,
  ReviewSummarySuccessResponse,
  User
} from "@/types/analysis";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN_STORAGE_KEY = "devmate_token";

export class ApiError extends Error {}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); cookie sessions still work.
  }
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}, fallbackError = "The request failed."): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...authHeaders(), ...(init.headers ?? {}) }
    });
  } catch {
    throw new ApiError("Unable to reach the DevMate backend. Confirm it is running on port 3000.");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = isErrorResponse(payload) ? payload.error : fallbackError;
    throw new ApiError(message);
  }

  return payload as T;
}

function isErrorResponse(payload: unknown): payload is AnalyzeErrorResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    payload.success === false &&
    "error" in payload &&
    typeof payload.error === "string"
  );
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export function getLoginUrl(): string {
  return `${API_BASE_URL}/auth/github`;
}

export function getGithubLoginUrl(): string {
  return `${API_BASE_URL}/auth/github`;
}

export async function getAuthConfig(): Promise<AuthConfig> {
  return request<AuthConfig>("/auth/config", {}, "Failed to load authentication configuration.");
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const payload = await request<{ success: true; user: User }>("/auth/me", {}, "Failed to load the session.");
    return payload.user;
  } catch (error) {
    if (error instanceof ApiError && error.message.toLowerCase().includes("authentication")) return null;
    return null;
  }
}

export async function login(input: { email: string; password: string }): Promise<AuthSuccessResponse> {
  const payload = await request<AuthSuccessResponse>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(input) },
    "Unable to sign in."
  );
  setStoredToken(payload.token);
  return payload;
}

export async function signup(input: { name?: string; email: string; password: string }): Promise<AuthSuccessResponse> {
  const payload = await request<AuthSuccessResponse>(
    "/auth/signup",
    { method: "POST", body: JSON.stringify(input) },
    "Unable to create the account."
  );
  setStoredToken(payload.token);
  return payload;
}

export async function logout(): Promise<void> {
  try {
    await request<{ success: true }>("/auth/logout", { method: "POST" }, "Failed to log out.");
  } finally {
    setStoredToken(null);
  }
}

export async function updateProfile(input: { name?: string | null; avatarUrl?: string | null }): Promise<User> {
  const payload = await request<{ success: true; user: User }>(
    "/auth/me",
    { method: "PATCH", body: JSON.stringify(input) },
    "Unable to update the profile."
  );
  return payload.user;
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await request<{ success: true }>(
    "/auth/password",
    { method: "POST", body: JSON.stringify(input) },
    "Unable to update the password."
  );
}

export async function deleteAccount(): Promise<void> {
  try {
    await request<{ success: true }>("/auth/me", { method: "DELETE" }, "Unable to delete the account.");
  } finally {
    setStoredToken(null);
  }
}

// ---------------------------------------------------------------------------
// Analysis API
// ---------------------------------------------------------------------------

export async function analyzeCode(input: AnalysisInput): Promise<AnalyzeSuccessResponse> {
  return request<AnalyzeSuccessResponse>(
    "/api/analyze",
    { method: "POST", body: JSON.stringify(input) },
    "The analysis request failed."
  );
}

export async function explainFinding(input: ExplanationInput): Promise<ExplainSuccessResponse> {
  return request<ExplainSuccessResponse>(
    "/api/explain",
    { method: "POST", body: JSON.stringify(input) },
    "The explanation request failed."
  );
}

export async function generateReviewSummary(input: ReviewSummaryInput): Promise<ReviewSummarySuccessResponse> {
  return request<ReviewSummarySuccessResponse>(
    "/api/review-summary",
    { method: "POST", body: JSON.stringify(input) },
    "The review summary request failed."
  );
}

// ---------------------------------------------------------------------------
// Reports API
// ---------------------------------------------------------------------------

export async function getReportsList(page = 1, pageSize = 20, projectId?: string): Promise<ReportsListSuccessResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (projectId) params.set("projectId", projectId);
  return request<ReportsListSuccessResponse>(`/api/reports?${params.toString()}`, {}, "Failed to fetch reports list.");
}

export async function getReport(reportId: string): Promise<ReportSuccessResponse> {
  return request<ReportSuccessResponse>(
    `/api/reports/${encodeURIComponent(reportId)}`,
    {},
    "Failed to fetch report."
  );
}

export async function deleteReport(reportId: string): Promise<void> {
  await request<{ success: true }>(
    `/api/reports/${encodeURIComponent(reportId)}`,
    { method: "DELETE" },
    "Failed to delete report."
  );
}

// ---------------------------------------------------------------------------
// Projects API
// ---------------------------------------------------------------------------

export async function getProjects(): Promise<Project[]> {
  const payload = await request<ProjectsSuccessResponse>("/api/projects", {}, "Failed to load projects.");
  return payload.projects;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const payload = await request<{ success: true; project: Project }>(
    "/api/projects",
    { method: "POST", body: JSON.stringify(input) },
    "Failed to create the project."
  );
  return payload.project;
}

export async function updateProject(projectId: string, input: Partial<ProjectInput>): Promise<Project> {
  const payload = await request<{ success: true; project: Project }>(
    `/api/projects/${encodeURIComponent(projectId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    "Failed to update the project."
  );
  return payload.project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await request<{ success: true }>(
    `/api/projects/${encodeURIComponent(projectId)}`,
    { method: "DELETE" },
    "Failed to delete the project."
  );
}

// ---------------------------------------------------------------------------
// Dashboard API
// ---------------------------------------------------------------------------

export async function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>("/api/dashboard", {}, "Failed to load dashboard data.");
}

// ---------------------------------------------------------------------------
// AI review engine API
// ---------------------------------------------------------------------------

const AI_PATHS: Record<AiTaskKind, string> = {
  review: "/api/ai/review",
  "pr-comments": "/api/ai/pr-comments",
  "security-fixes": "/api/ai/security-fixes",
  refactor: "/api/ai/refactor",
  "bug-explanations": "/api/ai/bug-explanations"
};

export async function runAiTask(kind: AiTaskKind, input: AiTaskInput): Promise<AiTaskResponse> {
  return request<AiTaskResponse>(
    AI_PATHS[kind],
    { method: "POST", body: JSON.stringify(input) },
    "The AI request failed."
  );
}

export async function getAiArtifacts(limit = 20): Promise<AiArtifactSummary[]> {
  const payload = await request<{ success: true; artifacts: AiArtifactSummary[] }>(
    `/api/ai/artifacts?limit=${limit}`,
    {},
    "Failed to load AI artifacts."
  );
  return payload.artifacts;
}

export async function deleteAiArtifact(artifactId: string): Promise<void> {
  await request<{ success: true }>(
    `/api/ai/artifacts/${encodeURIComponent(artifactId)}`,
    { method: "DELETE" },
    "Failed to delete the AI artifact."
  );
}

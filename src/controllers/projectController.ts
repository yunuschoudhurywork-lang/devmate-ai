import type { Request, Response } from "express";
import {
  ProjectConflictError,
  ProjectNotFoundError,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
  type ProjectInput
} from "../services/projectService";

const MAX_NAME_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_URL_LENGTH = 2_048;

function validateProjectInput(body: unknown, partial: boolean): ProjectInput | Error {
  if (typeof body !== "object" || body === null) return new Error("A JSON request body is required.");
  const value = body as Record<string, unknown>;

  if (!partial || value.name !== undefined) {
    if (typeof value.name !== "string" || value.name.trim().length === 0 || value.name.length > MAX_NAME_LENGTH) {
      return new Error(`'name' is required and must be up to ${MAX_NAME_LENGTH} characters.`);
    }
  }

  for (const field of ["description", "repoUrl", "repoFullName", "language", "defaultBranch", "visibility", "provider"]) {
    if (value[field] !== undefined && value[field] !== null && typeof value[field] !== "string") {
      return new Error(`'${field}' must be a string.`);
    }
  }

  if (typeof value.description === "string" && value.description.length > MAX_DESCRIPTION_LENGTH) {
    return new Error(`'description' must be up to ${MAX_DESCRIPTION_LENGTH} characters.`);
  }
  if (typeof value.repoUrl === "string" && value.repoUrl.length > MAX_URL_LENGTH) {
    return new Error(`'repoUrl' must be up to ${MAX_URL_LENGTH} characters.`);
  }
  if (typeof value.repoUrl === "string" && value.repoUrl.trim().length > 0 && !/^https?:\/\//i.test(value.repoUrl)) {
    return new Error("'repoUrl' must start with http:// or https://.");
  }

  return {
    name: typeof value.name === "string" ? value.name : "",
    description: typeof value.description === "string" ? value.description : null,
    repoUrl: typeof value.repoUrl === "string" ? value.repoUrl : null,
    repoFullName: typeof value.repoFullName === "string" ? value.repoFullName : null,
    provider: typeof value.provider === "string" ? value.provider : undefined,
    defaultBranch: typeof value.defaultBranch === "string" ? value.defaultBranch : undefined,
    language: typeof value.language === "string" ? value.language : null,
    visibility: typeof value.visibility === "string" ? value.visibility : undefined
  };
}

/** GET /api/projects */
export async function listProjectsHandler(request: Request, response: Response): Promise<void> {
  try {
    const projects = await listProjects(request.user!.id);
    response.status(200).json({ success: true, projects });
  } catch (error) {
    console.error("Failed to list projects:", error);
    response.status(500).json({ success: false, error: "Failed to retrieve projects." });
  }
}

/** POST /api/projects */
export async function createProjectHandler(request: Request, response: Response): Promise<void> {
  const input = validateProjectInput(request.body, false);
  if (input instanceof Error) {
    response.status(400).json({ success: false, error: input.message });
    return;
  }

  try {
    const project = await createProject(request.user!.id, input);
    response.status(201).json({ success: true, project });
  } catch (error) {
    if (error instanceof ProjectConflictError) {
      response.status(409).json({ success: false, error: error.message });
      return;
    }
    console.error("Failed to create project:", error);
    response.status(500).json({ success: false, error: "Failed to create the project." });
  }
}

/** GET /api/projects/:projectId */
export async function getProjectHandler(request: Request, response: Response): Promise<void> {
  try {
    const project = await getProject(request.user!.id, String(request.params.projectId));
    response.status(200).json({ success: true, project });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      response.status(404).json({ success: false, error: error.message });
      return;
    }
    console.error("Failed to get project:", error);
    response.status(500).json({ success: false, error: "Failed to retrieve the project." });
  }
}

/** PATCH /api/projects/:projectId */
export async function updateProjectHandler(request: Request, response: Response): Promise<void> {
  const input = validateProjectInput(request.body, true);
  if (input instanceof Error) {
    response.status(400).json({ success: false, error: input.message });
    return;
  }

  try {
    const project = await updateProject(request.user!.id, String(request.params.projectId), input);
    response.status(200).json({ success: true, project });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      response.status(404).json({ success: false, error: error.message });
      return;
    }
    if (error instanceof ProjectConflictError) {
      response.status(409).json({ success: false, error: error.message });
      return;
    }
    console.error("Failed to update project:", error);
    response.status(500).json({ success: false, error: "Failed to update the project." });
  }
}

/** DELETE /api/projects/:projectId */
export async function deleteProjectHandler(request: Request, response: Response): Promise<void> {
  try {
    await deleteProject(request.user!.id, String(request.params.projectId));
    response.status(200).json({ success: true, message: "Project deleted." });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      response.status(404).json({ success: false, error: error.message });
      return;
    }
    console.error("Failed to delete project:", error);
    response.status(500).json({ success: false, error: "Failed to delete the project." });
  }
}

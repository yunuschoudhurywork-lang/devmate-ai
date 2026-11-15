import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

export class ProjectConflictError extends Error {}
export class ProjectNotFoundError extends Error {}

export interface ProjectInput {
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  repoFullName?: string | null;
  provider?: string;
  defaultBranch?: string;
  language?: string | null;
  visibility?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  repoFullName: string | null;
  provider: string;
  defaultBranch: string;
  language: string | null;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  reportCount: number;
  averageScore: number | null;
  lastAnalyzedAt: Date | null;
}

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { reports: { select: { overallScore: true, createdAt: true }, orderBy: { createdAt: "desc" } } }
  });

  return projects.map((project) => {
    const scores = project.reports.map((report) => report.overallScore);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      repoUrl: project.repoUrl,
      repoFullName: project.repoFullName,
      provider: project.provider,
      defaultBranch: project.defaultBranch,
      language: project.language,
      visibility: project.visibility,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      reportCount: project.reports.length,
      averageScore: scores.length > 0 ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : null,
      lastAnalyzedAt: project.reports[0]?.createdAt ?? null
    };
  });
}

export async function createProject(userId: string, input: ProjectInput): Promise<ProjectSummary> {
  try {
    const project = await prisma.project.create({
      data: {
        userId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        repoUrl: input.repoUrl?.trim() || null,
        repoFullName: input.repoFullName?.trim() || null,
        provider: input.provider === "github" ? "github" : "manual",
        defaultBranch: input.defaultBranch?.trim() || "main",
        language: input.language?.trim() || null,
        visibility: input.visibility === "public" ? "public" : "private"
      }
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      repoUrl: project.repoUrl,
      repoFullName: project.repoFullName,
      provider: project.provider,
      defaultBranch: project.defaultBranch,
      language: project.language,
      visibility: project.visibility,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      reportCount: 0,
      averageScore: null,
      lastAnalyzedAt: null
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ProjectConflictError("A project for this repository already exists.");
    }
    throw error;
  }
}

export async function getProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { reports: { orderBy: { createdAt: "desc" }, take: 20 } }
  });

  if (!project) throw new ProjectNotFoundError("Project not found.");
  return project;
}

export async function updateProject(userId: string, projectId: string, input: Partial<ProjectInput>) {
  const existing = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!existing) throw new ProjectNotFoundError("Project not found.");

  const data: Prisma.ProjectUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.repoUrl !== undefined) data.repoUrl = input.repoUrl?.trim() || null;
  if (input.repoFullName !== undefined) data.repoFullName = input.repoFullName?.trim() || null;
  if (input.defaultBranch !== undefined) data.defaultBranch = input.defaultBranch.trim() || "main";
  if (input.language !== undefined) data.language = input.language?.trim() || null;
  if (input.visibility !== undefined) data.visibility = input.visibility === "public" ? "public" : "private";
  if (input.provider !== undefined) data.provider = input.provider === "github" ? "github" : "manual";

  try {
    return await prisma.project.update({ where: { id: projectId }, data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ProjectConflictError("Another project already uses this repository.");
    }
    throw error;
  }
}

export async function deleteProject(userId: string, projectId: string): Promise<void> {
  const existing = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!existing) throw new ProjectNotFoundError("Project not found.");

  await prisma.project.delete({ where: { id: projectId } });
}

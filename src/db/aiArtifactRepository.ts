import { prisma } from "../db/prisma";

export interface AiArtifactInput {
  userId: string;
  reportId?: string | null;
  kind: string;
  title: string;
  provider: string;
  model: string;
  content: unknown;
}

export interface AiArtifactSummary {
  id: string;
  kind: string;
  title: string;
  provider: string;
  model: string;
  reportId: string | null;
  createdAt: Date;
  content: unknown;
}

export async function createAiArtifact(input: AiArtifactInput) {
  return prisma.aiArtifact.create({
    data: {
      userId: input.userId,
      reportId: input.reportId ?? null,
      kind: input.kind,
      title: input.title,
      provider: input.provider,
      model: input.model,
      content: JSON.stringify(input.content)
    }
  });
}

export async function listAiArtifacts(userId: string, options: { limit?: number; kind?: string } = {}) {
  const artifacts = await prisma.aiArtifact.findMany({
    where: { userId, ...(options.kind ? { kind: options.kind } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(options.limit ?? 20, 100),
    select: {
      id: true,
      kind: true,
      title: true,
      provider: true,
      model: true,
      reportId: true,
      createdAt: true,
      content: true
    }
  });

  return artifacts.map((artifact) => ({
    ...artifact,
    content: safeParse(artifact.content)
  }));
}

export async function getAiArtifact(userId: string, artifactId: string): Promise<AiArtifactSummary | null> {
  const artifact = await prisma.aiArtifact.findFirst({ where: { id: artifactId, userId } });
  if (!artifact) return null;

  return {
    id: artifact.id,
    kind: artifact.kind,
    title: artifact.title,
    provider: artifact.provider,
    model: artifact.model,
    reportId: artifact.reportId,
    createdAt: artifact.createdAt,
    content: safeParse(artifact.content)
  };
}

export async function deleteAiArtifact(userId: string, artifactId: string): Promise<boolean> {
  const artifact = await prisma.aiArtifact.findFirst({ where: { id: artifactId, userId }, select: { id: true } });
  if (!artifact) return false;

  await prisma.aiArtifact.delete({ where: { id: artifactId } });
  return true;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

import { db as prisma } from "@/lib/db";

export type LatexProjectRole = "OWNER" | "EDIT" | "VIEW";

/**
 * Check if user can access project (owner or collaborator).
 * Returns role or null if no access.
 */
export async function getProjectAccess(
  projectId: string,
  userId: string
): Promise<LatexProjectRole | null> {
  const project = await prisma.latexProject.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project) return null;
  if (project.userId === userId) return "OWNER";

  const collab = await prisma.latexProjectCollaborator.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!collab) return null;
  return collab.role === "EDIT" ? "EDIT" : "VIEW";
}

export async function canEditProject(projectId: string, userId: string): Promise<boolean> {
  const role = await getProjectAccess(projectId, userId);
  return role === "OWNER" || role === "EDIT";
}

export async function canViewProject(projectId: string, userId: string): Promise<boolean> {
  const role = await getProjectAccess(projectId, userId);
  return role !== null;
}

const MAX_VERSIONS_PER_PROJECT = 50;

/**
 * Create a version snapshot and prune old versions.
 */
export async function createVersion(
  projectId: string,
  data: { mainContent: string; titleSnapshot?: string; trigger?: "save" | "compile" }
): Promise<void> {
  await prisma.latexProjectVersion.create({
    data: {
      projectId,
      mainContent: data.mainContent,
      titleSnapshot: data.titleSnapshot ?? null,
      trigger: data.trigger ?? "save",
    },
  });

  const versions = await prisma.latexProjectVersion.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (versions.length > MAX_VERSIONS_PER_PROJECT) {
    const toDelete = versions.slice(MAX_VERSIONS_PER_PROJECT);
    await prisma.latexProjectVersion.deleteMany({
      where: { id: { in: toDelete.map((v) => v.id) } },
    });
  }
}

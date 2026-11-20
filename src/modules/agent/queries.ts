import "server-only";
import { prisma } from "@/shared/db";
import { agentOnline, type JobKind, type JobStatus } from "./domain/job";

export async function getAgent() {
  const [jobs, s] = await Promise.all([
    prisma.agentJob.findMany({ orderBy: { updatedAt: "desc" }, take: 40 }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { agentSeenAt: true } }),
  ]);
  const now = new Date();
  return {
    configured: (process.env.AGENT_TOKEN?.length ?? 0) >= 24,
    online: agentOnline(s?.agentSeenAt ?? null, now),
    seenAt: s?.agentSeenAt ?? null,
    jobs: jobs.map((j) => ({ ...j, kind: j.kind as JobKind, status: j.status as JobStatus })),
  };
}
export type AgentView = Awaited<ReturnType<typeof getAgent>>;
export type JobView = AgentView["jobs"][number];

export const pendingApprovals = () => prisma.agentJob.count({ where: { status: "NEEDS_APPROVAL" } });

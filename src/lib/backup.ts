import { prisma } from "./db";

// ترتيب الجداول حسب الاعتماد (للتصدير والاسترجاع)
export async function dumpAll() {
  return {
    app: "life-planner",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: await prisma.settings.findMany(),
    cycles: await prisma.cycle.findMany(),
    pillars: await prisma.pillar.findMany(),
    goals: await prisma.goal.findMany(),
    kpiReadings: await prisma.kpiReading.findMany(),
    goalSupports: await prisma.goalSupport.findMany(),
    planTasks: await prisma.planTask.findMany(),
    planSubtasks: await prisma.planSubtask.findMany(),
    planSteps: await prisma.planStep.findMany(),
    recurrences: await prisma.recurrence.findMany(),
    weeklyTasks: await prisma.weeklyTask.findMany({ orderBy: { createdAt: "asc" } }),
    weeklyTaskSteps: await prisma.weeklyTaskStep.findMany(),
    weekReviews: await prisma.weekReview.findMany(),
    notifications: await prisma.notification.findMany(),
  };
}

type Dump = Awaited<ReturnType<typeof dumpAll>>;

export async function restoreAll(d: Dump) {
  if (d?.app !== "life-planner") throw new Error("ملف مش صحيح");
  // المهام المنقولة بتشير لبعض: منحطّها أول شي بدون الربط وبعدين منرجّعه
  const tasks = d.weeklyTasks.map((t) => ({ ...t, carriedFromId: null }));
  await prisma.$transaction(
    async (tx) => {
      await tx.weeklyTaskStep.deleteMany();
      await tx.weeklyTask.deleteMany();
      await tx.recurrence.deleteMany();
      await tx.weekReview.deleteMany();
      await tx.notification.deleteMany();
      await tx.cycle.deleteMany(); // بيمسح الأهداف والخطة معها
      await tx.pillar.deleteMany();
      await tx.settings.deleteMany();
      await tx.settings.createMany({ data: d.settings });
      await tx.cycle.createMany({ data: d.cycles.map((c) => ({ ...c, snapshot: c.snapshot ?? undefined })) });
      await tx.pillar.createMany({ data: d.pillars });
      await tx.goal.createMany({ data: d.goals });
      await tx.kpiReading.createMany({ data: d.kpiReadings });
      await tx.goalSupport.createMany({ data: d.goalSupports });
      await tx.planTask.createMany({ data: d.planTasks });
      await tx.planSubtask.createMany({ data: d.planSubtasks });
      await tx.planStep.createMany({ data: d.planSteps });
      await tx.recurrence.createMany({ data: d.recurrences.map((r) => ({ ...r, steps: r.steps ?? undefined })) });
      await tx.weeklyTask.createMany({ data: tasks });
      for (const t of d.weeklyTasks.filter((t) => t.carriedFromId)) {
        await tx.weeklyTask.update({ where: { id: t.id }, data: { carriedFromId: t.carriedFromId } });
      }
      await tx.weeklyTaskStep.createMany({ data: d.weeklyTaskSteps });
      await tx.weekReview.createMany({ data: d.weekReviews.map((r) => ({ ...r, top3: r.top3 ?? undefined })) });
      await tx.notification.createMany({ data: d.notifications });
    },
    { timeout: 60000 }
  );
}

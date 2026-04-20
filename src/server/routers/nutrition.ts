import { z } from "zod";
import { createTRPCRouter, staffProcedure, clientProcedure } from "../trpc";

/**
 * Nutrition router — admin-side CRUD for plans + meals, + log browsing.
 * (Portal-side log create/delete live in the portal router so they're scoped to the authed client.)
 */
export const nutritionRouter = createTRPCRouter({
  // ── Admin: Plans ─────────────────────────
  listPlansForClient: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify org ownership
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!client) throw new Error("Client not found");

      return ctx.db.nutritionPlan.findMany({
        where: { clientId: input.clientId },
        orderBy: { createdAt: "desc" },
        include: {
          meals: { orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }] },
        },
      });
    }),

  createPlan: staffProcedure
    .input(z.object({
      clientId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!client) throw new Error("Client not found");

      return ctx.db.nutritionPlan.create({
        data: {
          ...input,
          createdById: ctx.staff.id,
        },
      });
    }),

  updatePlan: staffProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().nullish(),
      startDate: z.date().nullish(),
      endDate: z.date().nullish(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // Verify org ownership through client
      const plan = await ctx.db.nutritionPlan.findFirst({
        where: { id, client: { organizationId: ctx.organizationId } },
        select: { id: true },
      });
      if (!plan) throw new Error("Plan not found");

      return ctx.db.nutritionPlan.update({ where: { id }, data });
    }),

  deletePlan: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.nutritionPlan.findFirst({
        where: { id: input.id, client: { organizationId: ctx.organizationId } },
        select: { id: true },
      });
      if (!plan) throw new Error("Plan not found");

      return ctx.db.nutritionPlan.delete({ where: { id: input.id } });
    }),

  // ── Admin: Meals ─────────────────────────
  addMeal: staffProcedure
    .input(z.object({
      planId: z.string(),
      name: z.string().min(1),
      dayNumber: z.number().int().min(1).default(1),
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fat: z.number().optional(),
      notes: z.string().optional(),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify plan belongs to org
      const plan = await ctx.db.nutritionPlan.findFirst({
        where: { id: input.planId, client: { organizationId: ctx.organizationId } },
        select: { id: true },
      });
      if (!plan) throw new Error("Plan not found");

      return ctx.db.nutritionMeal.create({ data: input });
    }),

  updateMeal: staffProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      dayNumber: z.number().int().min(1).optional(),
      calories: z.number().nullish(),
      protein: z.number().nullish(),
      carbs: z.number().nullish(),
      fat: z.number().nullish(),
      notes: z.string().nullish(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const meal = await ctx.db.nutritionMeal.findFirst({
        where: { id, plan: { client: { organizationId: ctx.organizationId } } },
        select: { id: true },
      });
      if (!meal) throw new Error("Meal not found");

      return ctx.db.nutritionMeal.update({ where: { id }, data });
    }),

  deleteMeal: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const meal = await ctx.db.nutritionMeal.findFirst({
        where: { id: input.id, plan: { client: { organizationId: ctx.organizationId } } },
        select: { id: true },
      });
      if (!meal) throw new Error("Meal not found");

      return ctx.db.nutritionMeal.delete({ where: { id: input.id } });
    }),

  // ── Nutrition Goals ──────────────────────
  getGoals: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.nutritionGoals.findMany({
        where: { clientId: input.clientId },
      });
      const training = rows.find((r) => r.dayType === "training") ?? null;
      const rest = rows.find((r) => r.dayType === "rest") ?? null;
      return { training, rest };
    }),

  upsertGoals: staffProcedure
    .input(z.object({
      clientId: z.string(),
      dayType: z.enum(["training", "rest"]),
      carbs: z.number().nullish(),
      fat: z.number().nullish(),
      protein: z.number().nullish(),
      fiber: z.number().nullish(),
      kcalPerGramCarbs: z.number().optional(),
      kcalPerGramFat: z.number().optional(),
      kcalPerGramProtein: z.number().optional(),
      kcalPerGramFiber: z.number().optional(),
      autoCalculateCalories: z.boolean().optional(),
      totalCalories: z.number().nullish(),
      notes: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { clientId, dayType, ...data } = input;
      return ctx.db.nutritionGoals.upsert({
        where: { clientId_dayType: { clientId, dayType } },
        create: { clientId, dayType, ...data },
        update: data,
      });
    }),

  // ── Nutrition Files ───────────────────────
  listFiles: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.nutritionFile.findMany({
        where: { clientId: input.clientId },
        orderBy: { createdAt: "asc" },
      });
    }),

  addFile: staffProcedure
    .input(z.object({
      clientId: z.string(),
      name: z.string().min(1),
      url: z.string().url(),
      mimeType: z.string().optional(),
      size: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.nutritionFile.create({ data: input });
    }),

  deleteFile: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.nutritionFile.delete({ where: { id: input.id } });
    }),

  // ── Admin: Logs (read) ───────────────────
  listLogs: staffProcedure
    .input(z.object({
      clientId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!client) throw new Error("Client not found");

      return ctx.db.nutritionLog.findMany({
        where: {
          clientId: input.clientId,
          ...((input.startDate || input.endDate) && {
            date: {
              ...(input.startDate && { gte: input.startDate }),
              ...(input.endDate && { lte: input.endDate }),
            },
          }),
        },
        orderBy: { date: "desc" },
        take: input.limit,
      });
    }),
});

/**
 * Client-portal nutrition procedures — exposed separately so they can hang off the portal router.
 */
export const portalNutritionProcedures = {
  myPlan: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.nutritionPlan.findFirst({
      where: { clientId: ctx.client.id, isActive: true },
      include: { meals: { orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }] } },
      orderBy: { createdAt: "desc" },
    });
  }),

  logsByDate: clientProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ ctx, input }) => {
      const start = new Date(input.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return ctx.db.nutritionLog.findMany({
        where: { clientId: ctx.client.id, date: { gte: start, lt: end } },
        orderBy: { createdAt: "asc" },
      });
    }),

  addLog: clientProcedure
    .input(z.object({
      date: z.date(),
      mealName: z.string().optional(),
      description: z.string().optional(),
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fat: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.nutritionLog.create({
        data: { ...input, clientId: ctx.client.id },
      });
    }),

  deleteLog: clientProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const log = await ctx.db.nutritionLog.findFirst({
        where: { id: input.id, clientId: ctx.client.id },
        select: { id: true },
      });
      if (!log) throw new Error("Log not found");

      return ctx.db.nutritionLog.delete({ where: { id: input.id } });
    }),
};

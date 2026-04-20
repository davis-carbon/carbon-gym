import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const measurementsRouter = createTRPCRouter({
  listByClient: staffProcedure
    .input(z.object({
      clientId: z.string(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.measurement.findMany({
        where: {
          clientId: input.clientId,
          ...(input.dateFrom || input.dateTo ? {
            date: {
              ...(input.dateFrom ? { gte: input.dateFrom } : {}),
              ...(input.dateTo ? { lte: input.dateTo } : {}),
            },
          } : {}),
        },
        orderBy: { date: "desc" },
        take: 200,
        include: { takenBy: { select: { firstName: true, lastName: true } } },
      });
    }),

  create: staffProcedure
    .input(z.object({
      clientId: z.string(),
      date: z.date(),
      weight: z.number().optional(),
      bodyFatPercent: z.number().optional(),
      chest: z.number().optional(),
      waist: z.number().optional(),
      hips: z.number().optional(),
      leftArm: z.number().optional(),
      rightArm: z.number().optional(),
      leftThigh: z.number().optional(),
      rightThigh: z.number().optional(),
      neck: z.number().optional(),
      sleepHours: z.number().optional(),
      energyLevel: z.number().optional(),
      waterOunces: z.number().optional(),
      stepsPerDay: z.number().optional(),
      effort: z.number().optional(),
      hunger: z.number().optional(),
      cravings: z.number().optional(),
      stress: z.number().optional(),
      hrv: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.measurement.create({
        data: { ...input, takenById: ctx.staff.id },
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.measurement.delete({ where: { id: input.id } });
    }),
});

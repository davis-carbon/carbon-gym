import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const measurementsRouter = createTRPCRouter({
  listByClient: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.measurement.findMany({
        where: { clientId: input.clientId },
        orderBy: { date: "desc" },
        take: 50,
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
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.measurement.create({
        data: { ...input, takenById: ctx.staff.id },
      });
    }),
});

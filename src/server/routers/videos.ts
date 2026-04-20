import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const videosRouter = createTRPCRouter({
  // ── Org video library ─────────────────────────────────────────────────────

  list: staffProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.video.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.search && { name: { contains: input.search, mode: "insensitive" } }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { assignments: true } },
        },
      });
    }),

  create: staffProcedure
    .input(z.object({
      name: z.string().min(1),
      videoUrl: z.string().url(),
      fileType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.video.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
          createdById: ctx.staff.id,
        },
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.video.delete({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
    }),

  // ── Client assignments ────────────────────────────────────────────────────

  listAssignmentsForClient: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!client) throw new Error("Client not found");

      return ctx.db.videoAssignment.findMany({
        where: { clientId: input.clientId },
        orderBy: { assignedAt: "desc" },
        include: { video: true },
      });
    }),

  assign: staffProcedure
    .input(z.object({ videoId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [video, client] = await Promise.all([
        ctx.db.video.findFirst({ where: { id: input.videoId, organizationId: ctx.organizationId }, select: { id: true } }),
        ctx.db.client.findFirst({ where: { id: input.clientId, organizationId: ctx.organizationId }, select: { id: true } }),
      ]);
      if (!video || !client) throw new Error("Video or client not found");

      const existing = await ctx.db.videoAssignment.findFirst({
        where: { videoId: input.videoId, clientId: input.clientId },
      });
      if (existing) return existing;

      return ctx.db.videoAssignment.create({
        data: { videoId: input.videoId, clientId: input.clientId },
      });
    }),

  unassign: staffProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.videoAssignment.findFirst({
        where: {
          id: input.assignmentId,
          video: { organizationId: ctx.organizationId },
        },
        select: { id: true },
      });
      if (!assignment) throw new Error("Assignment not found");

      return ctx.db.videoAssignment.delete({ where: { id: input.assignmentId } });
    }),
});

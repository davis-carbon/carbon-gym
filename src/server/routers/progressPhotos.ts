import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const progressPhotosRouter = createTRPCRouter({
  listForClient: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!client) throw new Error("Client not found");

      return ctx.db.progressPhoto.findMany({
        where: { clientId: input.clientId },
        orderBy: { takenAt: "desc" },
        include: {
          uploadedBy: { select: { firstName: true, lastName: true } },
        },
      });
    }),

  create: staffProcedure
    .input(z.object({
      clientId: z.string(),
      fileUrl: z.string().url().optional(),
      videoUrl: z.string().url().optional(),
      caption: z.string().optional(),
      takenAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.fileUrl && !input.videoUrl) throw new Error("Either fileUrl or videoUrl is required");

      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!client) throw new Error("Client not found");

      return ctx.db.progressPhoto.create({
        data: {
          clientId: input.clientId,
          fileUrl: input.fileUrl,
          videoUrl: input.videoUrl,
          caption: input.caption,
          takenAt: input.takenAt ?? new Date(),
          uploadedById: ctx.staff.id,
        },
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through client → org
      const photo = await ctx.db.progressPhoto.findFirst({
        where: { id: input.id, client: { organizationId: ctx.organizationId } },
        select: { id: true },
      });
      if (!photo) throw new Error("Photo not found");

      return ctx.db.progressPhoto.delete({ where: { id: input.id } });
    }),
});

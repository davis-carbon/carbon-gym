import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const lifecycleRouter = createTRPCRouter({
  listForClient: staffProcedure
    .input(z.object({ clientId: z.string(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!client) throw new Error("Client not found");

      return ctx.db.clientLifecycleEvent.findMany({
        where: { clientId: input.clientId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),
});

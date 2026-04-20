import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const auditLogRouter = createTRPCRouter({
  list: staffProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        entityType: z.string().optional(),
        action: z.string().optional(),
        entityId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, entityType, action, entityId, dateFrom, dateTo } = input;
      const skip = (page - 1) * limit;

      const where = {
        organizationId: ctx.organizationId,
        ...(entityType ? { entityType } : {}),
        ...(action ? { action } : {}),
        ...(entityId ? { entityId } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      };

      const [rows, total] = await Promise.all([
        ctx.db.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        ctx.db.auditLog.count({ where }),
      ]);

      // Resolve display names for known entity types
      const clientIds = new Set<string>();
      const staffIds = new Set<string>();
      const automationIds = new Set<string>();

      for (const row of rows) {
        const meta = (row.metadata as Record<string, unknown>) ?? {};
        if (row.entityType === "Client" && row.entityId) clientIds.add(row.entityId);
        if (typeof meta.clientId === "string") clientIds.add(meta.clientId);
        if (row.userId) staffIds.add(row.userId);
        if (row.entityType === "Automation" && row.entityId) automationIds.add(row.entityId);
      }

      const [clients, staff, automations] = await Promise.all([
        clientIds.size > 0
          ? ctx.db.client.findMany({
              where: { id: { in: [...clientIds] } },
              select: { id: true, firstName: true, lastName: true },
            })
          : [],
        staffIds.size > 0
          ? ctx.db.staffMember.findMany({
              where: { id: { in: [...staffIds] } },
              select: { id: true, firstName: true, lastName: true },
            })
          : [],
        automationIds.size > 0
          ? ctx.db.automation.findMany({
              where: { id: { in: [...automationIds] } },
              select: { id: true, name: true },
            })
          : [],
      ]);

      const clientMap = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
      const staffMap = new Map(staff.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));
      const automationMap = new Map(automations.map((a) => [a.id, a.name]));

      const enriched = rows.map((row) => {
        const meta = (row.metadata as Record<string, unknown>) ?? {};
        let entityLabel: string | null = null;

        if (row.entityType === "Client" && row.entityId) {
          entityLabel = clientMap.get(row.entityId) ?? row.entityId;
        } else if (row.entityType === "Automation" && row.entityId) {
          entityLabel = automationMap.get(row.entityId) ?? row.entityId;
        } else if (row.entityId) {
          entityLabel = row.entityId;
        }

        const actorName = row.userId ? (staffMap.get(row.userId) ?? "System") : "System";
        const metaClientId = typeof meta.clientId === "string" ? meta.clientId : null;
        const metaClientName = metaClientId ? (clientMap.get(metaClientId) ?? metaClientId) : null;

        return {
          id: row.id,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          entityLabel,
          actorName,
          metaClientName,
          metadata: meta,
          ipAddress: row.ipAddress,
          createdAt: row.createdAt,
        };
      });

      return {
        rows: enriched,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /** Distinct action values seen in this org — for filter dropdown. */
  actions: staffProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.auditLog.findMany({
      where: { organizationId: ctx.organizationId },
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    });
    return rows.map((r) => r.action);
  }),

  /** Distinct entityType values — for filter dropdown. */
  entityTypes: staffProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.auditLog.findMany({
      where: { organizationId: ctx.organizationId },
      select: { entityType: true },
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
    });
    return rows.map((r) => r.entityType);
  }),
});

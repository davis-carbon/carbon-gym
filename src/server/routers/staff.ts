import { createTRPCRouter, staffProcedure } from "../trpc";

export const staffRouter = createTRPCRouter({
  list: staffProcedure.query(async ({ ctx }) => {
    return ctx.db.staffMember.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
    });
  }),

  me: staffProcedure.query(async ({ ctx }) => {
    return ctx.staff;
  }),
});

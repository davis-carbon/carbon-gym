import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "./db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    ...opts,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/**
 * Authenticated procedure — requires a valid Supabase session.
 * Adds `user` to context.
 */
export const authProcedure = t.procedure.use(async ({ ctx, next }) => {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({ ctx: { ...ctx, user } });
});

/**
 * Staff procedure — requires authenticated user to be a staff member.
 * Adds `staff` and `organizationId` to context.
 */
export const staffProcedure = authProcedure.use(async ({ ctx, next }) => {
  const staff = await ctx.db.staffMember.findUnique({
    where: { userId: ctx.user.id },
  });
  if (!staff || !staff.isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return next({ ctx: { ...ctx, staff, organizationId: staff.organizationId } });
});

/**
 * Client procedure — requires authenticated user to be a client.
 * Adds `client` to context.
 */
export const clientProcedure = authProcedure.use(async ({ ctx, next }) => {
  const client = await ctx.db.client.findUnique({
    where: { userId: ctx.user.id },
  });
  if (!client) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Client access required" });
  }
  return next({ ctx: { ...ctx, client } });
});

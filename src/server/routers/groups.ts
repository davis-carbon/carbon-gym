import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const groupsRouter = createTRPCRouter({
  list: staffProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.group.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.search && { name: { contains: input.search, mode: "insensitive" as const } }),
        },
        orderBy: { name: "asc" },
        include: { _count: { select: { members: true, posts: true } } },
      });
    }),

  byId: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.group.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          members: {
            include: { client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, profileImageUrl: true, lifecycleStage: true } } },
            orderBy: { joinedAt: "desc" },
          },
          _count: { select: { members: true, posts: true } },
        },
      });
    }),

  create: staffProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      imageUrl: z.string().url().optional(),
      isPublic: z.boolean().default(false),
      maxMembers: z.number().int().positive().optional(),
      lifecycleOnJoin: z.string().optional(),
      allowClientPosts: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Auto-generate publicSlug if public
      const publicSlug = input.isPublic
        ? input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6)
        : null;
      return ctx.db.group.create({
        data: { ...input, publicSlug, organizationId: ctx.organizationId },
      });
    }),

  update: staffProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().nullish(),
      imageUrl: z.string().url().nullish(),
      isPublic: z.boolean().optional(),
      maxMembers: z.number().int().positive().nullish(),
      lifecycleOnJoin: z.string().nullish(),
      allowClientPosts: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, isPublic, ...rest } = input;

      // If making public, ensure there's a slug
      let publicSlugUpdate: { publicSlug?: string } = {};
      if (isPublic === true) {
        const existing = await ctx.db.group.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { publicSlug: true, name: true } });
        if (existing && !existing.publicSlug) {
          publicSlugUpdate.publicSlug = existing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
        }
      }

      return ctx.db.group.update({
        where: { id, organizationId: ctx.organizationId },
        data: { ...rest, ...(isPublic !== undefined ? { isPublic } : {}), ...publicSlugUpdate },
      });
    }),

  listMembershipsForClient: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      return ctx.db.clientGroup.findMany({
        where: { clientId: input.clientId },
        orderBy: { joinedAt: "desc" },
        include: {
          group: { select: { id: true, name: true, imageUrl: true, isPublic: true } },
        },
      });
    }),

  addMember: staffProcedure
    .input(z.object({ groupId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findFirst({
        where: { id: input.groupId, organizationId: ctx.organizationId },
        include: { _count: { select: { members: true } } },
      });
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

      if (group.maxMembers && group._count.members >= group.maxMembers) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Group is full (max ${group.maxMembers} members)` });
      }

      const result = await ctx.db.clientGroup.create({ data: input });

      // Apply lifecycle stage if configured
      if (group.lifecycleOnJoin) {
        await ctx.db.client.updateMany({
          where: { id: input.clientId },
          data: { lifecycleStage: group.lifecycleOnJoin as never },
        });
      }

      return result;
    }),

  removeMember: staffProcedure
    .input(z.object({ groupId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientGroup.delete({
        where: { clientId_groupId: { clientId: input.clientId, groupId: input.groupId } },
      });
    }),

  listMemberSubscriptions: staffProcedure
    .input(z.object({ groupId: z.string(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.group.findFirst({ where: { id: input.groupId, organizationId: ctx.organizationId }, select: { id: true } });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const memberships = await ctx.db.clientGroup.findMany({ where: { groupId: input.groupId }, select: { clientId: true } });
      const clientIds = memberships.map((m) => m.clientId);
      if (clientIds.length === 0) return [];
      return ctx.db.clientPackage.findMany({
        where: {
          clientId: { in: clientIds },
          client: { organizationId: ctx.organizationId },
          ...(input.status ? { status: input.status as never } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
          package: { select: { id: true, name: true, price: true, billingCycle: true } },
        },
      });
    }),

  listMemberAccountBalances: staffProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.group.findFirst({ where: { id: input.groupId, organizationId: ctx.organizationId }, select: { id: true } });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const memberships = await ctx.db.clientGroup.findMany({ where: { groupId: input.groupId }, select: { clientId: true } });
      const clientIds = memberships.map((m) => m.clientId);
      if (clientIds.length === 0) return [];
      const balances = await ctx.db.accountBalanceTransaction.findMany({
        where: { clientId: { in: clientIds }, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        distinct: ["clientId"],
        include: { client: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } } },
      });
      return balances;
    }),

  listMemberServiceBalances: staffProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.group.findFirst({ where: { id: input.groupId, organizationId: ctx.organizationId }, select: { id: true } });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const memberships = await ctx.db.clientGroup.findMany({ where: { groupId: input.groupId }, select: { clientId: true } });
      const clientIds = memberships.map((m) => m.clientId);
      if (clientIds.length === 0) return [];
      const balances = await ctx.db.serviceBalanceTransaction.findMany({
        where: { clientId: { in: clientIds }, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        distinct: ["clientId"],
        include: { client: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } } },
      });
      return balances;
    }),

  listMemberPayments: staffProcedure
    .input(z.object({
      groupId: z.string(),
      status: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.group.findFirst({
        where: { id: input.groupId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

      // Get all client IDs in the group
      const memberships = await ctx.db.clientGroup.findMany({
        where: { groupId: input.groupId },
        select: { clientId: true },
      });
      const clientIds = memberships.map((m) => m.clientId);
      if (clientIds.length === 0) return [];

      return ctx.db.payment.findMany({
        where: {
          clientId: { in: clientIds },
          client: { organizationId: ctx.organizationId },
          ...(input.status ? { status: input.status as never } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
          clientPackage: { include: { package: { select: { name: true } } } },
        },
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.group.delete({ where: { id: input.id, organizationId: ctx.organizationId } });
    }),

  // ── Group Feed ────────────────────────────────────────────────────────────

  listPosts: staffProcedure
    .input(z.object({
      groupId: z.string(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Verify group belongs to org
      const group = await ctx.db.group.findFirst({ where: { id: input.groupId, organizationId: ctx.organizationId }, select: { id: true } });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });

      const posts = await ctx.db.groupPost.findMany({
        where: { groupId: input.groupId },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: {
          staffAuthor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          clientAuthor: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              staffAuthor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              clientAuthor: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
            },
          },
          _count: { select: { comments: true } },
        },
      });

      const hasMore = posts.length > input.limit;
      const items = hasMore ? posts.slice(0, -1) : posts;
      return { items, nextCursor: hasMore ? items[items.length - 1]?.id : undefined };
    }),

  createPost: staffProcedure
    .input(z.object({
      groupId: z.string(),
      content: z.string().min(1),
      mediaUrl: z.string().url().optional(),
      isAnnouncement: z.boolean().default(false),
      isPinned: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findFirst({ where: { id: input.groupId, organizationId: ctx.organizationId }, select: { id: true } });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.groupPost.create({
        data: {
          groupId: input.groupId,
          staffAuthorId: ctx.staff.id,
          content: input.content,
          mediaUrl: input.mediaUrl,
          isAnnouncement: input.isAnnouncement,
          isPinned: input.isPinned,
        },
        include: {
          staffAuthor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          comments: { include: { staffAuthor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
          _count: { select: { comments: true } },
        },
      });
    }),

  updatePost: staffProcedure
    .input(z.object({
      id: z.string(),
      content: z.string().min(1).optional(),
      isAnnouncement: z.boolean().optional(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // Staff can only edit their own posts (unless admin)
      const post = await ctx.db.groupPost.findFirst({ where: { id }, select: { staffAuthorId: true, group: { select: { organizationId: true } } } });
      if (!post || post.group.organizationId !== ctx.organizationId) throw new TRPCError({ code: "NOT_FOUND" });
      if (post.staffAuthorId !== ctx.staff.id && ctx.staff.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.groupPost.update({ where: { id }, data });
    }),

  deletePost: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.groupPost.findFirst({ where: { id: input.id }, select: { staffAuthorId: true, group: { select: { organizationId: true } } } });
      if (!post || post.group.organizationId !== ctx.organizationId) throw new TRPCError({ code: "NOT_FOUND" });
      if (post.staffAuthorId !== ctx.staff.id && ctx.staff.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.groupPost.delete({ where: { id: input.id } });
    }),

  addComment: staffProcedure
    .input(z.object({ postId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Verify the post's group is in this org
      const post = await ctx.db.groupPost.findFirst({ where: { id: input.postId }, select: { group: { select: { organizationId: true } } } });
      if (!post || post.group.organizationId !== ctx.organizationId) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.groupPostComment.create({
        data: { postId: input.postId, staffAuthorId: ctx.staff.id, content: input.content },
        include: { staffAuthor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      });
    }),

  deleteComment: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.groupPostComment.findFirst({ where: { id: input.id }, select: { staffAuthorId: true, post: { select: { group: { select: { organizationId: true } } } } } });
      if (!comment || comment.post.group.organizationId !== ctx.organizationId) throw new TRPCError({ code: "NOT_FOUND" });
      if (comment.staffAuthorId !== ctx.staff.id && ctx.staff.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.groupPostComment.delete({ where: { id: input.id } });
    }),
});

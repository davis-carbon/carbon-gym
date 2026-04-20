import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

// Default note fields seeded for every org on first access
const DEFAULT_NOTE_FIELDS = [
  "Client Issues/Goals Overview",
  "Nutrition Check-in Notes",
  "Health Check in Notes",
  "Gym/Equipment List",
  "Completed a Google Review?",
  "FREE Cancellation Used?",
];

export const notesRouter = createTRPCRouter({
  // ── Notes History (TrainerNote) ────────────────────────────────────────────

  listByClient: staffProcedure
    .input(z.object({
      clientId: z.string(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.trainerNote.findMany({
        where: {
          clientId: input.clientId,
          client: { organizationId: ctx.organizationId },
          ...(input.dateFrom || input.dateTo ? {
            noteDate: {
              ...(input.dateFrom ? { gte: input.dateFrom } : {}),
              ...(input.dateTo ? { lte: input.dateTo } : {}),
            },
          } : {}),
        },
        orderBy: { noteDate: "desc" },
        include: { staff: { select: { firstName: true, lastName: true } } },
      });
    }),

  create: staffProcedure
    .input(z.object({
      clientId: z.string(),
      title: z.string().min(1),
      content: z.string().min(1),
      noteDate: z.date().optional(),
      isPrivate: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.trainerNote.create({
        data: {
          clientId: input.clientId,
          title: input.title,
          content: input.content,
          noteDate: input.noteDate ?? new Date(),
          isPrivate: input.isPrivate,
          staffId: ctx.staff.id,
        },
      });
    }),

  update: staffProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
      noteDate: z.date().optional(),
      isPrivate: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.trainerNote.update({ where: { id }, data });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.trainerNote.delete({ where: { id: input.id } });
    }),

  // ── Client Note Fields (global per org) ───────────────────────────────────

  listNoteFields: staffProcedure.query(async ({ ctx }) => {
    let fields = await ctx.db.clientNoteField.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { order: "asc" },
    });

    // Seed default fields on first access
    if (fields.length === 0) {
      await ctx.db.clientNoteField.createMany({
        data: DEFAULT_NOTE_FIELDS.map((title, i) => ({
          organizationId: ctx.organizationId,
          title,
          order: i,
        })),
      });
      fields = await ctx.db.clientNoteField.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { order: "asc" },
      });
    }

    return fields;
  }),

  addNoteField: staffProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.clientNoteField.findFirst({
        where: { organizationId: ctx.organizationId },
        orderBy: { order: "desc" },
      });
      return ctx.db.clientNoteField.create({
        data: {
          organizationId: ctx.organizationId,
          title: input.title,
          order: (last?.order ?? -1) + 1,
        },
      });
    }),

  updateNoteField: staffProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientNoteField.update({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { title: input.title },
      });
    }),

  deleteNoteField: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientNoteField.delete({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
    }),

  // ── Client Note Values (per client per field) ─────────────────────────────

  listNoteValues: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.clientNoteValue.findMany({
        where: { clientId: input.clientId, field: { organizationId: ctx.organizationId } },
        include: { field: true },
      });
    }),

  upsertNoteValue: staffProcedure
    .input(z.object({
      clientId: z.string(),
      fieldId: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientNoteValue.upsert({
        where: { clientId_fieldId: { clientId: input.clientId, fieldId: input.fieldId } },
        create: {
          clientId: input.clientId,
          fieldId: input.fieldId,
          content: input.content,
          updatedById: ctx.staff.id,
        },
        update: {
          content: input.content,
          updatedById: ctx.staff.id,
        },
      });
    }),
});

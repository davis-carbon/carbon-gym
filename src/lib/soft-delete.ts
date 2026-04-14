import { Prisma } from '@generated/prisma/client'

/**
 * Prisma client extension for soft deletes on the Client model.
 * Read-side: findMany/findFirst/findUnique/count auto-filter `deletedAt: null`.
 * To query soft-deleted records, pass `{ where: { deletedAt: { not: null } } }`.
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'soft-delete',
  query: {
    client: {
      async findMany({ args, query }) {
        args.where = addDeletedAtFilter(args.where)
        return query(args)
      },
      async findFirst({ args, query }) {
        args.where = addDeletedAtFilter(args.where)
        return query(args)
      },
      async findUnique({ args, query }) {
        args.where = addDeletedAtFilter(args.where)
        return query(args)
      },
      async findUniqueOrThrow({ args, query }) {
        args.where = addDeletedAtFilter(args.where)
        return query(args)
      },
      async count({ args, query }) {
        args.where = addDeletedAtFilter(args.where)
        return query(args)
      },
    },
  },
})

function addDeletedAtFilter<T extends Record<string, unknown> | undefined>(
  where: T,
): T {
  if (!where) return { deletedAt: null } as unknown as T
  if ('deletedAt' in where) return where
  return { ...where, deletedAt: null }
}

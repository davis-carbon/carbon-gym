import { createTRPCRouter } from "../trpc";
import { clientsRouter } from "./clients";
import { dashboardRouter } from "./dashboard";

export const appRouter = createTRPCRouter({
  clients: clientsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

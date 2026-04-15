import { createTRPCRouter } from "../trpc";
import { clientsRouter } from "./clients";
import { dashboardRouter } from "./dashboard";
import { exercisesRouter } from "./exercises";
import { plansRouter } from "./plans";
import { groupsRouter } from "./groups";
import { scheduleRouter } from "./schedule";
import { messagesRouter } from "./messages";
import { measurementsRouter } from "./measurements";
import { notesRouter } from "./notes";
import { workoutsRouter } from "./workouts";

export const appRouter = createTRPCRouter({
  clients: clientsRouter,
  dashboard: dashboardRouter,
  exercises: exercisesRouter,
  plans: plansRouter,
  groups: groupsRouter,
  schedule: scheduleRouter,
  messages: messagesRouter,
  measurements: measurementsRouter,
  notes: notesRouter,
  workouts: workoutsRouter,
});

export type AppRouter = typeof appRouter;

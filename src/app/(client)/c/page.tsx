"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { Calendar, Dumbbell, MessageSquare, TrendingUp, Loader2 } from "lucide-react";

export default function ClientHomePage() {
  const { data: me } = trpc.portal.me.useQuery();
  const { data: stats, isLoading } = trpc.portal.dashboard.useQuery();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  }

  const firstName = me?.firstName ?? "there";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Hey, {firstName}!</h2>
        <p className="text-sm text-stone-500">Here&apos;s what&apos;s up today.</p>
      </div>

      {/* Next appointment */}
      {stats?.nextAppointment && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-stone-100 p-2">
                <Calendar className="h-5 w-5 text-stone-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-stone-500">Next Session</p>
                <p className="font-semibold text-stone-900 mt-0.5">
                  {stats.nextAppointment.service.name} with {stats.nextAppointment.staff.firstName} {stats.nextAppointment.staff.lastName}
                </p>
                <p className="text-sm text-stone-600 mt-0.5">
                  {new Date(stats.nextAppointment.scheduledAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  {" at "}
                  {new Date(stats.nextAppointment.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              <Badge variant={stats.nextAppointment.status === "CONFIRMED" ? "info" : "outline"}>
                {stats.nextAppointment.status === "CONFIRMED" ? "Confirmed" : "Reserved"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current plan */}
      {stats?.recentPlan && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-stone-100 p-2">
                <Dumbbell className="h-5 w-5 text-stone-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-stone-500">Current Plan</p>
                <p className="font-semibold text-stone-900 mt-0.5">{stats.recentPlan.name}</p>
                <p className="text-sm text-stone-600 mt-0.5">{stats.recentPlan.sizeWeeks} weeks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-5 w-5 text-emerald-500 mx-auto" />
            <p className="text-2xl font-bold mt-1">{stats?.workoutCount ?? 0}</p>
            <p className="text-xs text-stone-500">Workouts this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Dumbbell className="h-5 w-5 text-blue-500 mx-auto" />
            <p className="text-2xl font-bold mt-1">{stats?.activePackage?.sessionsRemaining ?? "—"}</p>
            <p className="text-xs text-stone-500">Sessions left</p>
          </CardContent>
        </Card>
      </div>

      {/* Unread messages */}
      {stats?.unreadMessages && stats.unreadMessages > 0 ? (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-stone-100 p-2">
                <MessageSquare className="h-5 w-5 text-stone-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-stone-900">{stats.unreadMessages} unread message{stats.unreadMessages > 1 ? "s" : ""}</p>
                <p className="text-xs text-stone-500">From your trainer</p>
              </div>
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-stone-900 px-1 text-[10px] font-bold text-white">
                {stats.unreadMessages}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Dumbbell, MessageSquare, TrendingUp } from "lucide-react";

export default function ClientHomePage() {
  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-stone-900">Hey, Tres!</h2>
        <p className="text-sm text-stone-500">Here&apos;s what&apos;s up today.</p>
      </div>

      {/* Next appointment */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-stone-100 p-2">
              <Calendar className="h-5 w-5 text-stone-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-stone-500">Next Session</p>
              <p className="font-semibold text-stone-900 mt-0.5">1-on-1 with Mada Hauck</p>
              <p className="text-sm text-stone-600 mt-0.5">Tomorrow, 8:30 AM</p>
            </div>
            <Badge variant="info">Confirmed</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Current plan */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-stone-100 p-2">
              <Dumbbell className="h-5 w-5 text-stone-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-stone-500">Current Plan</p>
              <p className="font-semibold text-stone-900 mt-0.5">Nutrition - Weekly Check In [M]</p>
              <p className="text-sm text-stone-600 mt-0.5">Week 3 of 4</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-5 w-5 text-emerald-500 mx-auto" />
            <p className="text-2xl font-bold mt-1">12</p>
            <p className="text-xs text-stone-500">Sessions this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Dumbbell className="h-5 w-5 text-blue-500 mx-auto" />
            <p className="text-2xl font-bold mt-1">3</p>
            <p className="text-xs text-stone-500">Workouts logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Unread messages */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-stone-100 p-2">
              <MessageSquare className="h-5 w-5 text-stone-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-stone-900">1 unread message</p>
              <p className="text-xs text-stone-500">From Mada Hauck</p>
            </div>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-white">1</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

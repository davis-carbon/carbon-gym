"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, LogOut } from "lucide-react";

export default function ClientProfilePage() {
  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="text-center py-4">
        <Avatar name="Tres Teschke" size="lg" className="mx-auto" />
        <h2 className="text-lg font-bold mt-3">Tres Teschke</h2>
        <p className="text-sm text-stone-500">tres.teschke@gmail.com</p>
        <Badge variant="success" className="mt-2">Active Member</Badge>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Info</CardTitle>
          <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Phone</span>
              <span className="text-stone-900">+1 214 453 9765</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Birth Date</span>
              <span className="text-stone-900">May 21, 1991</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Location</span>
              <span className="text-stone-900">CARBON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Trainer</span>
              <span className="text-stone-900">Mada Hauck</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Package */}
      <Card>
        <CardHeader>
          <CardTitle>My Package</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium text-sm">1-on-1 Training — 12 Sessions</p>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-stone-500">Sessions remaining</span>
            <span className="font-semibold text-stone-900">4</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2 mt-2">
            <div className="bg-stone-900 h-2 rounded-full" style={{ width: "67%" }} />
          </div>
          <p className="text-xs text-stone-500 mt-1">8 of 12 sessions used</p>
        </CardContent>
      </Card>

      {/* Groups */}
      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Nutrition Engineering</Badge>
          </div>
        </CardContent>
      </Card>

      <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50">
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}

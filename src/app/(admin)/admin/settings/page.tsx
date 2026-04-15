"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { trpc } from "@/trpc/client";
import { Pencil, Loader2 } from "lucide-react";

const roleVariant: Record<string, "danger" | "info" | "success" | "outline"> = {
  OWNER: "danger",
  ADMIN: "info",
  TRAINER: "success",
  STAFF: "outline",
};

export default function SettingsPage() {
  const { data: staffList, isLoading } = trpc.staff.list.useQuery();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business Information</TabsTrigger>
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /> Edit</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div><p className="text-xs text-stone-500 mb-1">Website</p><p className="text-sm text-stone-900">https://www.carbontc.co</p></div>
                <div><p className="text-xs text-stone-500 mb-1">Timezone</p><p className="text-sm text-stone-900">America/Denver (MT)</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-stone-500">Edit your profile in Supabase Auth settings.</p></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <Button size="sm">Invite Staff</Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
              ) : (
                <div className="space-y-3">
                  {(staffList ?? []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${s.firstName} ${s.lastName}`} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-stone-900">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-stone-500">{s.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={roleVariant[s.role] || "outline"}>
                          {s.role.charAt(0) + s.role.slice(1).toLowerCase()}
                        </Badge>
                        {!s.isActive && <Badge variant="outline">Inactive</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader><CardTitle>Billing & Stripe</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-stone-500">Stripe integration settings will appear here once connected.</p>
              <Button variant="secondary" size="sm" className="mt-4">Connect Stripe</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

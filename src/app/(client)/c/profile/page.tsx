"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Pencil, LogOut, Loader2 } from "lucide-react";

export default function ClientProfilePage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: "", aboutMe: "", height: "", weight: "" });

  const { data: client, isLoading } = trpc.portal.me.useQuery();
  const { data: measurements } = trpc.portal.measurements.useQuery();

  const updateProfile = trpc.portal.updateProfile.useMutation({
    onSuccess: () => { toast("success", "Profile updated"); utils.portal.me.invalidate(); setEditing(false); },
    onError: (err) => toast("error", err.message),
  });

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function startEdit() {
    setForm({
      phone: client?.phone ?? "",
      aboutMe: client?.aboutMe ?? "",
      height: client?.height ?? "",
      weight: client?.weight ?? "",
    });
    setEditing(true);
  }

  if (isLoading || !client) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  }

  const name = `${client.firstName} ${client.lastName}`;
  const activePackage = client.clientPackages?.[0];
  const latestWeight = measurements?.[0]?.weight;

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <Avatar name={name} src={client.profileImageUrl} size="lg" className="mx-auto" />
        <h2 className="text-lg font-bold mt-3">{name}</h2>
        {client.email && <p className="text-sm text-stone-500">{client.email}</p>}
        <Badge variant="success" className="mt-2">Active Member</Badge>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Info</CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={startEdit}><Pencil className="h-4 w-4" /></Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={() => updateProfile.mutate(form)} disabled={updateProfile.isPending}>Save</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Height" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
              <Input label="Weight" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">About Me</label>
                <textarea value={form.aboutMe} onChange={(e) => setForm({ ...form, aboutMe: e.target.value })} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none" rows={3} />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <Row label="Phone" value={client.phone || "—"} />
              <Row label="Birth Date" value={client.birthDate ? new Date(client.birthDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"} />
              <Row label="Height" value={client.height || "—"} />
              <Row label="Weight" value={client.weight || "—"} />
              <Row label="Latest Weight" value={latestWeight ? `${latestWeight} lbs` : "—"} />
              <Row label="Trainer" value={client.assignedStaff ? `${client.assignedStaff.firstName} ${client.assignedStaff.lastName}` : "—"} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package */}
      {activePackage && (
        <Card>
          <CardHeader><CardTitle>My Package</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium text-sm">{activePackage.package.name}</p>
            {activePackage.sessionsRemaining != null && (
              <>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-stone-500">Sessions remaining</span>
                  <span className="font-semibold text-stone-900">{activePackage.sessionsRemaining}</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-stone-900 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (activePackage.sessionsUsed / (activePackage.sessionsUsed + activePackage.sessionsRemaining)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-stone-500 mt-1">{activePackage.sessionsUsed} of {activePackage.sessionsUsed + activePackage.sessionsRemaining} sessions used</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      {client.groups && client.groups.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Groups</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {client.groups.map((g) => <Badge key={g.group.id} variant="info">{g.group.name}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-stone-500">{label}</span>
      <span className="text-stone-900">{value}</span>
    </div>
  );
}

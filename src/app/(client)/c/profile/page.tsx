"use client";

import { useState, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Pencil, LogOut, Loader2, Bell, BellOff, Camera, ChevronDown, ChevronUp, Scale, Plus } from "lucide-react";

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-stone-500">{label}</span>
      <span className="text-stone-900 font-medium">{value}</span>
    </div>
  );
}

// ─── Avatar upload ────────────────────────────────────────────────────────────

function AvatarUpload({
  name, currentUrl, onUploaded,
}: { name: string; currentUrl: string | null | undefined; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast("error", "Image too large (max 5MB)"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "avatars");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onUploaded(url);
    } catch (e: any) {
      toast("error", e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative inline-block cursor-pointer" onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      <Avatar name={name} src={currentUrl ?? undefined} size="lg" className="mx-auto" />
      <div className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/40 transition-opacity ${uploading ? "opacity-100" : "opacity-0 hover:opacity-100"}`}>
        {uploading
          ? <Loader2 className="h-5 w-5 text-white animate-spin" />
          : <Camera className="h-5 w-5 text-white" />
        }
      </div>
    </div>
  );
}

// ─── Measurement logger ───────────────────────────────────────────────────────

function MeasurementCard({ measurements }: { measurements: { id: string; date: Date; weight: number | null; bodyFatPercent: number | null; waist: number | null }[] }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showLog, setShowLog] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ weight: "", bodyFatPercent: "", waist: "", notes: "" });

  const logMeasurement = trpc.portal.logMeasurement.useMutation({
    onSuccess: () => { toast("success", "Measurement logged"); utils.portal.measurements.invalidate(); setShowLog(false); setForm({ weight: "", bodyFatPercent: "", waist: "", notes: "" }); },
    onError: (e) => toast("error", e.message),
  });

  const visible = expanded ? measurements : measurements.slice(0, 3);
  const hasMore = measurements.length > 3;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Scale className="h-4 w-4" /> Measurements</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowLog(true)}><Plus className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {measurements.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-2">No measurements logged yet.</p>
          ) : (
            <>
              <div className="space-y-2">
                {visible.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-stone-500 text-xs">{new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <div className="flex gap-4">
                      {m.weight != null && <span className="font-medium">{m.weight} lbs</span>}
                      {m.bodyFatPercent != null && <span className="text-stone-500">{m.bodyFatPercent}% BF</span>}
                      {m.waist != null && <span className="text-stone-500">{m.waist}" waist</span>}
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <button onClick={() => setExpanded((v) => !v)} className="mt-2 text-xs text-stone-400 flex items-center gap-1 hover:text-stone-600">
                  {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {measurements.length}</>}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Modal open={showLog} onClose={() => setShowLog(false)} title="Log Measurement"
        footer={<>
          <Button variant="secondary" onClick={() => setShowLog(false)}>Cancel</Button>
          <Button onClick={() => logMeasurement.mutate({ weight: form.weight ? Number(form.weight) : undefined, bodyFatPercent: form.bodyFatPercent ? Number(form.bodyFatPercent) : undefined, waist: form.waist ? Number(form.waist) : undefined, notes: form.notes || undefined })} disabled={logMeasurement.isPending || (!form.weight && !form.bodyFatPercent && !form.waist)}>
            {logMeasurement.isPending ? "Saving…" : "Save"}
          </Button>
        </>}
      >
        <div className="space-y-3">
          <Input label="Weight (lbs)" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 175" />
          <Input label="Body Fat (%)" type="number" value={form.bodyFatPercent} onChange={(e) => setForm({ ...form, bodyFatPercent: e.target.value })} placeholder="e.g. 18" />
          <Input label="Waist (inches)" type="number" value={form.waist} onChange={(e) => setForm({ ...form, waist: e.target.value })} placeholder="e.g. 32" />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none" rows={2} placeholder="Optional notes…" />
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Push notification card ───────────────────────────────────────────────────

function PushNotificationCard() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: status, isLoading } = trpc.portal.pushStatus.useQuery();
  const subscribe = trpc.portal.subscribePush.useMutation({ onSuccess: () => { utils.portal.pushStatus.invalidate(); toast("success", "Notifications enabled"); }, onError: (e) => toast("error", e.message) });
  const unsubscribe = trpc.portal.unsubscribePush.useMutation({ onSuccess: () => { utils.portal.pushStatus.invalidate(); toast("success", "Notifications disabled"); }, onError: (e) => toast("error", e.message) });

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  async function handleEnable() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      let sub = existing;
      if (!sub) {
        const keyBytes = Uint8Array.from(atob(vapidKey!.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes });
      }
      const json = sub.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } };
      if (!json.keys?.p256dh || !json.keys?.auth) throw new Error("Push subscription missing keys");
      subscribe.mutate({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
    } catch (e: any) { toast("error", e?.message ?? "Could not enable notifications"); }
  }

  async function handleDisable() {
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (reg) { const sub = await reg.pushManager.getSubscription(); await sub?.unsubscribe(); }
    unsubscribe.mutate();
  }

  const subscribed = status?.subscribed ?? false;
  const busy = subscribe.isPending || unsubscribe.isPending || isLoading;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${subscribed ? "bg-emerald-50" : "bg-stone-100"}`}>
              {subscribed ? <Bell className="h-5 w-5 text-emerald-600" /> : <BellOff className="h-5 w-5 text-stone-400" />}
            </div>
            <div>
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-xs text-stone-500">{subscribed ? "Enabled — you'll get notified of new messages" : "Enable to get notified of new messages"}</p>
            </div>
          </div>
          <Button variant={subscribed ? "secondary" : "primary"} size="sm" disabled={busy} onClick={subscribed ? handleDisable : handleEnable}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : subscribed ? "Off" : "On"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ManageBillingButton({ hasCustomerId }: { hasCustomerId: boolean }) {
  const { toast } = useToast();
  const portal = trpc.billing.createPortalSession.useMutation({ onSuccess: ({ url }) => { if (url) window.location.href = url; }, onError: (err) => toast("error", err.message) });
  if (!hasCustomerId) return null;
  return <Button variant="secondary" className="w-full" onClick={() => portal.mutate()} disabled={portal.isPending}>{portal.isPending ? "Opening…" : "Manage Billing"}</Button>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", aboutMe: "", height: "", weight: "",
    address: "", city: "", state: "", zip: "", profileImageUrl: "",
  });

  const { data: client, isLoading } = trpc.portal.me.useQuery();
  const { data: measurements } = trpc.portal.measurements.useQuery();

  const updateProfile = trpc.portal.updateProfile.useMutation({
    onSuccess: () => { toast("success", "Profile updated"); utils.portal.me.invalidate(); setEditing(false); },
    onError: (err) => toast("error", err.message),
  });

  useEffect(() => {
    if (client && editing) {
      setForm({
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone ?? "",
        aboutMe: client.aboutMe ?? "",
        height: client.height ?? "",
        weight: client.weight ?? "",
        address: client.address ?? "",
        city: client.city ?? "",
        state: client.state ?? "",
        zip: client.zip ?? "",
        profileImageUrl: client.profileImageUrl ?? "",
      });
    }
  }, [client, editing]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (isLoading || !client) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  }

  const name = `${client.firstName} ${client.lastName}`;
  const activePackage = client.clientPackages?.[0];

  // Cast measurement fields for the component
  const measurementList = (measurements ?? []).map((m) => ({
    id: m.id,
    date: m.date,
    weight: m.weight ?? null,
    bodyFatPercent: (m as any).bodyFatPercent ?? null,
    waist: (m as any).waist ?? null,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center py-4">
        {editing ? (
          <AvatarUpload
            name={name}
            currentUrl={form.profileImageUrl || client.profileImageUrl}
            onUploaded={(url) => setForm((f) => ({ ...f, profileImageUrl: url }))}
          />
        ) : (
          <Avatar name={name} src={client.profileImageUrl ?? undefined} size="lg" className="mx-auto" />
        )}
        <h2 className="text-lg font-bold mt-3">{name}</h2>
        {client.email && <p className="text-sm text-stone-500">{client.email}</p>}
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="success">Active Member</Badge>
          {client.lifecycleStage && client.lifecycleStage !== "CLIENT" && (
            <Badge variant="info">{client.lifecycleStage.charAt(0) + client.lifecycleStage.slice(1).toLowerCase()}</Badge>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Info</CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={() => updateProfile.mutate({
                firstName: form.firstName || undefined,
                lastName: form.lastName || undefined,
                phone: form.phone || undefined,
                aboutMe: form.aboutMe || undefined,
                height: form.height || undefined,
                weight: form.weight || undefined,
                address: form.address || undefined,
                city: form.city || undefined,
                state: form.state || undefined,
                zip: form.zip || undefined,
                profileImageUrl: form.profileImageUrl || undefined,
              })} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Height" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder='e.g. 5&apos;10"' />
                <Input label="Weight (lbs)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 175" />
              </div>
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="CO" />
                <Input label="ZIP" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">About Me</label>
                <textarea value={form.aboutMe} onChange={(e) => setForm({ ...form, aboutMe: e.target.value })} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none" rows={3} placeholder="Tell your trainer a bit about yourself…" />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <Row label="Phone" value={client.phone || "—"} />
              <Row label="Birth Date" value={client.birthDate ? new Date(client.birthDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"} />
              <Row label="Height" value={client.height || "—"} />
              <Row label="Weight" value={client.weight ? `${client.weight} lbs` : "—"} />
              <Row label="Trainer" value={client.assignedStaff ? `${client.assignedStaff.firstName} ${client.assignedStaff.lastName}` : "—"} />
              {client.aboutMe && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-stone-500 mb-1">About</p>
                  <p className="text-stone-700">{client.aboutMe}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Measurements */}
      <MeasurementCard measurements={measurementList} />

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
                  <span className="font-semibold">{activePackage.sessionsRemaining}</span>
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

      <ManageBillingButton hasCustomerId={!!client.stripeCustomerId} />
      <PushNotificationCard />

      <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import {
  User,
  Palette,
  Plug,
  Users,
  Package,
  ClipboardList,
  FolderOpen,
  Video,
  CreditCard,
  BarChart2,
  Tag,
  Ruler,
  Link2,
  Calendar,
  HelpCircle,
  Clock,
  GitBranch,
  Mail,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  MoreVertical,
  Globe,
  Lock,
  Copy,
  CheckCircle2,
  UserCheck,
  UserX,
} from "lucide-react";

// ─── Section Types ────────────────────────────────────────────────────────────
type Section =
  | "trainer-info"
  | "customize"
  | "connected-apps"
  | "trainers"
  | "products"
  | "assessments"
  | "resources"
  | "videos"
  | "stripe"
  | "reports"
  | "tags"
  | "measurement-reports"
  | "links"
  | "events"
  | "support"
  | "time-card"
  | "lifecycle"
  | "emails"
  | "point-of-sale";

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "trainer-info",        label: "Trainer Info",         icon: User },
  { id: "customize",           label: "Customize Platform",   icon: Palette },
  { id: "connected-apps",      label: "Connected Apps",       icon: Plug },
  { id: "trainers",            label: "Trainers",             icon: Users },
  { id: "products",            label: "Products",             icon: Package },
  { id: "assessments",         label: "Assessments",          icon: ClipboardList },
  { id: "resources",           label: "Resources",            icon: FolderOpen },
  { id: "videos",              label: "Videos",               icon: Video },
  { id: "stripe",              label: "Stripe",               icon: CreditCard },
  { id: "reports",             label: "Reports",              icon: BarChart2 },
  { id: "tags",                label: "Tags",                 icon: Tag },
  { id: "measurement-reports", label: "Measurement Reports",  icon: Ruler },
  { id: "links",               label: "Links",                icon: Link2 },
  { id: "events",              label: "Events",               icon: Calendar },
  { id: "support",             label: "Support",              icon: HelpCircle },
  { id: "time-card",           label: "Time Card",            icon: Clock },
  { id: "lifecycle",           label: "Lifecycle",            icon: GitBranch },
  { id: "emails",              label: "Emails",               icon: Mail },
  { id: "point-of-sale",       label: "Point of Sale",        icon: ShoppingCart },
];

// ─── Helper colors ────────────────────────────────────────────────────────────
const TAG_COLORS = [
  "#6B7280","#EF4444","#F97316","#EAB308","#22C55E",
  "#14B8A6","#3B82F6","#8B5CF6","#EC4899","#F43F5E",
  "#64748B","#0EA5E9",
];

function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
      style={{ backgroundColor: color, borderColor: selected ? "#1c1917" : "transparent" }}
    >
      {selected && <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />}
    </button>
  );
}

// ─── 1. Trainer Info ─────────────────────────────────────────────────────────
function TrainerInfoSection() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: me, isLoading } = trpc.staff.me.useQuery();
  const update = trpc.staff.updateProfile.useMutation({
    onSuccess: () => { utils.staff.me.invalidate(); toast("success", "Profile saved"); },
    onError: (e) => toast("error", e.message),
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", bio: "", phone: "", avatarUrl: "",
    color: "#6B7280", specialtiesStr: "", certificationsStr: "",
    linkedinUrl: "", instagramUrl: "",
  });

  const startEdit = () => {
    if (!me) return;
    setForm({
      firstName: me.firstName, lastName: me.lastName, bio: me.bio ?? "",
      phone: me.phone ?? "", avatarUrl: me.avatarUrl ?? "", color: me.color ?? "#6B7280",
      specialtiesStr: (me.specialties ?? []).join(", "),
      certificationsStr: (me.certifications ?? []).join(", "),
      linkedinUrl: me.linkedinUrl ?? "", instagramUrl: me.instagramUrl ?? "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    if (!me) return;
    update.mutate({
      id: me.id,
      firstName: form.firstName, lastName: form.lastName,
      bio: form.bio || null, phone: form.phone || null,
      avatarUrl: form.avatarUrl || null, color: form.color,
      specialties: form.specialtiesStr.split(",").map(s => s.trim()).filter(Boolean),
      certifications: form.certificationsStr.split(",").map(s => s.trim()).filter(Boolean),
      linkedinUrl: form.linkedinUrl || null, instagramUrl: form.instagramUrl || null,
    });
    setEditing(false);
  };

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  if (!me) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your Trainer Profile</CardTitle>
          <Button variant="secondary" size="sm" onClick={startEdit}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-5">
            <div className="relative shrink-0">
              <Avatar name={`${me.firstName} ${me.lastName}`} size="lg" src={me.avatarUrl ?? undefined} />
              {me.color && (
                <span
                  className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: me.color }}
                />
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
              <div><p className="text-xs text-stone-500 mb-0.5">Name</p><p className="text-sm font-medium text-stone-900">{me.firstName} {me.lastName}</p></div>
              <div><p className="text-xs text-stone-500 mb-0.5">Email</p><p className="text-sm text-stone-900">{me.email}</p></div>
              {me.phone && <div><p className="text-xs text-stone-500 mb-0.5">Phone</p><p className="text-sm text-stone-900">{me.phone}</p></div>}
              <div><p className="text-xs text-stone-500 mb-0.5">Role</p><Badge variant="info">{me.role.charAt(0) + me.role.slice(1).toLowerCase()}</Badge></div>
              {me.bio && <div className="col-span-2"><p className="text-xs text-stone-500 mb-0.5">Bio</p><p className="text-sm text-stone-700">{me.bio}</p></div>}
              {me.specialties && me.specialties.length > 0 && (
                <div><p className="text-xs text-stone-500 mb-0.5">Specialties</p>
                  <div className="flex flex-wrap gap-1">{me.specialties.map(s => <Badge key={s} variant="outline">{s}</Badge>)}</div>
                </div>
              )}
              {me.certifications && me.certifications.length > 0 && (
                <div><p className="text-xs text-stone-500 mb-0.5">Certifications</p>
                  <div className="flex flex-wrap gap-1">{me.certifications.map(c => <Badge key={c} variant="outline">{c}</Badge>)}</div>
                </div>
              )}
              {(me.linkedinUrl || me.instagramUrl) && (
                <div className="col-span-2 flex gap-3">
                  {me.linkedinUrl && <a href={me.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">LinkedIn <ExternalLink className="h-3 w-3" /></a>}
                  {me.instagramUrl && <span className="text-xs text-stone-600">{me.instagramUrl}</span>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Trainer Profile"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last Name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Bio</label>
            <textarea rows={3} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
          </div>
          <Input label="Avatar URL" value={form.avatarUrl} onChange={e => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://…" />
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Calendar Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TAG_COLORS.map(c => <ColorSwatch key={c} color={c} selected={form.color === c} onClick={() => setForm({ ...form, color: c })} />)}
            </div>
          </div>
          <Input label="Specialties (comma-separated)" value={form.specialtiesStr} onChange={e => setForm({ ...form, specialtiesStr: e.target.value })} placeholder="Strength, HIIT, Mobility" />
          <Input label="Certifications (comma-separated)" value={form.certificationsStr} onChange={e => setForm({ ...form, certificationsStr: e.target.value })} placeholder="NASM-CPT, ACE" />
          <Input label="LinkedIn URL" value={form.linkedinUrl} onChange={e => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/…" />
          <Input label="Instagram" value={form.instagramUrl} onChange={e => setForm({ ...form, instagramUrl: e.target.value })} placeholder="@username" />
        </div>
      </Modal>
    </div>
  );
}

// ─── 2. Customize Platform ───────────────────────────────────────────────────
function CustomizeSection() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: org, isLoading } = trpc.org.get.useQuery();
  const update = trpc.org.update.useMutation({
    onSuccess: () => { utils.org.get.invalidate(); toast("success", "Organization saved"); setEditing(false); },
    onError: (e) => toast("error", e.message),
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", logoUrl: "", timezone: "", website: "", bio: "", autoReply: "", address: "", city: "", state: "", zip: "", phone: "", email: "" });

  const startEdit = () => {
    if (!org) return;
    setForm({ name: org.name, logoUrl: org.logoUrl ?? "", timezone: org.timezone, website: org.website ?? "", bio: org.bio ?? "", autoReply: org.autoReply ?? "", address: org.address ?? "", city: org.city ?? "", state: org.state ?? "", zip: org.zip ?? "", phone: org.phone ?? "", email: org.email ?? "" });
    setEditing(true);
  };

  const TIMEZONES = ["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Phoenix","America/Anchorage","Pacific/Honolulu","UTC"];

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
          <Button variant="secondary" size="sm" onClick={startEdit}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
            <div><p className="text-xs text-stone-500 mb-0.5">Name</p><p className="text-sm font-medium">{org?.name}</p></div>
            <div><p className="text-xs text-stone-500 mb-0.5">Timezone</p><p className="text-sm">{org?.timezone}</p></div>
            {org?.website && <div><p className="text-xs text-stone-500 mb-0.5">Website</p><a href={org.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{org.website}</a></div>}
            {org?.phone && <div><p className="text-xs text-stone-500 mb-0.5">Phone</p><p className="text-sm">{org.phone}</p></div>}
            {org?.email && <div><p className="text-xs text-stone-500 mb-0.5">Email</p><p className="text-sm">{org.email}</p></div>}
            {org?.address && <div className="col-span-2"><p className="text-xs text-stone-500 mb-0.5">Address</p><p className="text-sm">{[org.address, org.city, org.state, org.zip].filter(Boolean).join(", ")}</p></div>}
            {org?.bio && <div className="col-span-2"><p className="text-xs text-stone-500 mb-0.5">Bio / About</p><p className="text-sm text-stone-700">{org.bio}</p></div>}
            {org?.autoReply && <div className="col-span-2"><p className="text-xs text-stone-500 mb-0.5">Auto-Reply Message</p><p className="text-sm text-stone-700">{org.autoReply}</p></div>}
          </div>
          {org?.logoUrl && (
            <div className="mt-4">
              <p className="text-xs text-stone-500 mb-2">Logo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={org.logoUrl} alt="Logo" className="h-16 object-contain rounded-lg border border-stone-200 p-2 bg-white" />
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Organization"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={() => update.mutate({ name: form.name || undefined, logoUrl: form.logoUrl || null, timezone: form.timezone || undefined, website: form.website || null, bio: form.bio || null, autoReply: form.autoReply || null, address: form.address || null, city: form.city || null, state: form.state || null, zip: form.zip || null, phone: form.phone || null, email: form.email || null })} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Organization Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Logo URL" value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://…" />
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Timezone</label>
            <select className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <Input label="Website" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://carbontc.co" />
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Street Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <Input label="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            <Input label="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
            <Input label="ZIP" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Bio / About</label>
            <textarea rows={3} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Auto-Reply Message</label>
            <textarea rows={2} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none" value={form.autoReply} onChange={e => setForm({ ...form, autoReply: e.target.value })} placeholder="Thanks for your message! We'll get back to you shortly." />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── 3. Connected Apps ───────────────────────────────────────────────────────
function ConnectedAppsSection() {
  const APPS = [
    { name: "Zapier", desc: "Connect Carbon Gym to 5,000+ apps via automation", icon: "⚡", connected: false },
    { name: "Google Calendar", desc: "Sync appointments to Google Calendar", icon: "📅", connected: false },
    { name: "Zoom", desc: "Automatically create Zoom links for virtual sessions", icon: "🎥", connected: false },
    { name: "Mailchimp", desc: "Sync client lists for email marketing", icon: "📧", connected: false },
    { name: "QuickBooks", desc: "Export revenue and payments to QuickBooks", icon: "📊", connected: false },
  ];
  return (
    <div className="space-y-3">
      {APPS.map(app => (
        <Card key={app.name}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{app.icon}</span>
                <div>
                  <p className="text-sm font-medium text-stone-900">{app.name}</p>
                  <p className="text-xs text-stone-500">{app.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={app.connected ? "success" : "outline"}>{app.connected ? "Connected" : "Not connected"}</Badge>
                <Button variant="secondary" size="sm" disabled>{app.connected ? "Disconnect" : "Connect"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-stone-400 text-center pt-2">Integrations coming soon. Contact support to request a specific integration.</p>
    </div>
  );
}

// ─── 4. Trainers ─────────────────────────────────────────────────────────────
const ROLE_VARIANT: Record<string, "danger" | "info" | "success" | "outline"> = {
  OWNER: "danger", ADMIN: "info", TRAINER: "success", STAFF: "outline",
};
const ROLES = ["OWNER","ADMIN","TRAINER","STAFF"] as const;

function TrainersSection() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: staffList = [], isLoading } = trpc.staff.list.useQuery();
  const { data: me } = trpc.staff.me.useQuery();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ firstName: "", lastName: "", email: "", role: "TRAINER" as typeof ROLES[number] });
  const [roleEditId, setRoleEditId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[number]>("TRAINER");

  const invite = trpc.staff.invite.useMutation({
    onSuccess: () => { utils.staff.list.invalidate(); setInviteOpen(false); setInviteForm({ firstName: "", lastName: "", email: "", role: "TRAINER" }); toast("success", "Staff member added"); },
    onError: (e) => toast("error", e.message),
  });
  const updateRole = trpc.staff.updateRole.useMutation({
    onSuccess: () => { utils.staff.list.invalidate(); setRoleEditId(null); toast("success", "Role updated"); },
    onError: (e) => toast("error", e.message),
  });
  const deactivate = trpc.staff.deactivate.useMutation({
    onSuccess: () => { utils.staff.list.invalidate(); toast("success", "Staff member deactivated"); },
    onError: (e) => toast("error", e.message),
  });
  const activate = trpc.staff.activate.useMutation({
    onSuccess: () => { utils.staff.list.invalidate(); toast("success", "Staff member activated"); },
    onError: (e) => toast("error", e.message),
  });

  const isAdmin = me?.role === "ADMIN" || me?.role === "OWNER";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Staff Members <Badge variant="outline" className="ml-2">{staffList.length}</Badge></CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Staff</Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          ) : (
            <div className="space-y-2">
              {staffList.map(s => (
                <div key={s.id} className={`flex items-center justify-between rounded-xl border p-3 ${!s.isActive ? "opacity-50 bg-stone-50" : "bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar name={`${s.firstName} ${s.lastName}`} size="sm" src={s.avatarUrl ?? undefined} />
                      {s.color && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: s.color }} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-stone-500">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {roleEditId === s.id && isAdmin ? (
                      <div className="flex items-center gap-1">
                        <select className="rounded border border-stone-200 px-2 py-1 text-xs" value={selectedRole} onChange={e => setSelectedRole(e.target.value as typeof ROLES[number])}>
                          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
                        </select>
                        <Button size="sm" onClick={() => updateRole.mutate({ id: s.id, role: selectedRole })} disabled={updateRole.isPending}>
                          {updateRole.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRoleEditId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <button
                        className="cursor-pointer"
                        onClick={() => { if (isAdmin && s.id !== me?.id) { setRoleEditId(s.id); setSelectedRole(s.role as typeof ROLES[number]); } }}
                      >
                        <Badge variant={ROLE_VARIANT[s.role] ?? "outline"}>{s.role.charAt(0) + s.role.slice(1).toLowerCase()}</Badge>
                      </button>
                    )}
                    {!s.isActive && <Badge variant="outline">Inactive</Badge>}
                    {isAdmin && s.id !== me?.id && (
                      s.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => deactivate.mutate({ id: s.id })} title="Deactivate">
                          <UserX className="h-3.5 w-3.5 text-stone-400" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => activate.mutate({ id: s.id })} title="Activate">
                          <UserCheck className="h-3.5 w-3.5 text-stone-400" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Add Staff Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={() => invite.mutate(inviteForm)} disabled={invite.isPending || !inviteForm.firstName || !inviteForm.lastName || !inviteForm.email}>{invite.isPending ? "Adding…" : "Add Staff"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={inviteForm.firstName} onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })} />
            <Input label="Last Name" value={inviteForm.lastName} onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Role</label>
            <select className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as typeof ROLES[number] })}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── 5. Products ──────────────────────────────────────────────────────────────
function ProductsSection() {
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Packages</p>
              <p className="text-xs text-stone-500">Training packages and membership plans</p>
            </div>
            <Link href="/admin/schedule?tab=packages"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Manage</Button></Link>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Services</p>
              <p className="text-xs text-stone-500">Session types, classes, and services offered</p>
            </div>
            <Link href="/admin/schedule?tab=services"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Manage</Button></Link>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Workout Plans</p>
              <p className="text-xs text-stone-500">Structured training programs to sell or assign</p>
            </div>
            <Link href="/admin/plans"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Manage</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 6. Assessments ───────────────────────────────────────────────────────────
function AssessmentsSection() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-900">Assessment Templates</p>
            <p className="text-xs text-stone-500">Build and manage intake forms, fitness assessments, and questionnaires</p>
          </div>
          <Link href="/admin/assessments"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Manage</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 7. Resources ─────────────────────────────────────────────────────────────
function ResourcesSection() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-900">Resource Library</p>
            <p className="text-xs text-stone-500">PDFs, guides, meal plans, and other documents to share with clients</p>
          </div>
          <Link href="/admin/resources"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Manage</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 8. Videos ────────────────────────────────────────────────────────────────
function VideosSection() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-900">Video Library</p>
            <p className="text-xs text-stone-500">Instructional videos, form demos, and content to share with clients</p>
          </div>
          <Link href="/admin/videos"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Manage</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 9. Stripe ────────────────────────────────────────────────────────────────
function StripeSection() {
  const { data: status, isLoading } = trpc.billing.status.useQuery();
  const isConnected = status?.enabled ?? false;
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/stripe` : "/api/webhooks/stripe";
  const [copied, setCopied] = useState(false);

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connection</CardTitle>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-stone-400" /> : (
            <Badge variant={isConnected ? "success" : "outline"}>{isConnected ? "Connected" : "Not configured"}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">Stripe is configured. Package purchases and subscription billing are active.</p>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">Open Stripe Dashboard <ExternalLink className="h-3.5 w-3.5 ml-1" /></Button>
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-stone-500">Add your Stripe keys to the environment to enable payments.</p>
              <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-1">
                <p className="text-xs font-medium text-stone-700 mb-1">Required environment variables:</p>
                <code className="block text-xs text-stone-600 font-mono">STRIPE_SECRET_KEY=sk_live_…</code>
                <code className="block text-xs text-stone-600 font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…</code>
                <code className="block text-xs text-stone-600 font-mono">STRIPE_WEBHOOK_SECRET=whsec_…</code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Webhook Configuration</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-stone-600 mb-3">Register this endpoint in your <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline text-stone-900">Stripe Webhook settings</a>.</p>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs text-stone-700 font-mono truncate">{webhookUrl}</code>
            <Button variant="secondary" size="sm" onClick={copyWebhook}>
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
            <p className="text-xs font-medium text-stone-700 mb-1">Required events:</p>
            <ul className="text-xs text-stone-600 space-y-0.5">
              <li>• checkout.session.completed</li>
              <li>• invoice.payment_succeeded</li>
              <li>• invoice.payment_failed</li>
              <li>• customer.subscription.deleted</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 10. Reports ─────────────────────────────────────────────────────────────
function ReportsSection() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-900">Reports & Analytics</p>
            <p className="text-xs text-stone-500">Revenue reports, client activity, package usage, and more</p>
          </div>
          <Link href="/admin/reports"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />View Reports</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 11. Tags ─────────────────────────────────────────────────────────────────
function TagRow({ tag, onSaved, onDelete }: { tag: { id: string; name: string; color: string | null; _count: { clients: number } }; onSaved: () => void; onDelete: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color ?? "#6B7280");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = trpc.tags.update.useMutation({ onSuccess: () => { setEditing(false); onSaved(); toast("success", "Tag updated"); }, onError: (e) => toast("error", e.message) });
  const del = trpc.tags.delete.useMutation({ onSuccess: () => { onDelete(); toast("success", "Tag deleted"); }, onError: (e) => toast("error", e.message) });

  if (editing) return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3">
      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <input className="flex-1 rounded border border-stone-200 px-2 py-1 text-sm" value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === "Enter") update.mutate({ id: tag.id, name, color }); if (e.key === "Escape") { setEditing(false); setName(tag.name); setColor(tag.color ?? "#6B7280"); } }} />
      <div className="flex flex-wrap gap-1">{TAG_COLORS.map(c => <ColorSwatch key={c} color={c} selected={color === c} onClick={() => setColor(c)} />)}</div>
      <div className="flex gap-1">
        <Button size="sm" onClick={() => update.mutate({ id: tag.id, name, color })} disabled={update.isPending || !name.trim()}>{update.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}</Button>
        <Button variant="secondary" size="sm" onClick={() => { setEditing(false); setName(tag.name); setColor(tag.color ?? "#6B7280"); }}><X className="h-3 w-3" /></Button>
      </div>
    </div>
  );
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-200 p-3 hover:bg-stone-50">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color ?? "#6B7280" }} />
        <span className="text-sm font-medium text-stone-900">{tag.name}</span>
        <span className="text-xs text-stone-400">{tag._count.clients} client{tag._count.clients !== 1 ? "s" : ""}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-600">Remove from {tag._count.clients} client{tag._count.clients !== 1 ? "s" : ""}?</span>
            <Button variant="danger" size="sm" onClick={() => del.mutate({ id: tag.id })} disabled={del.isPending}>{del.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}><X className="h-3 w-3" /></Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}><Trash2 className="h-3.5 w-3.5 text-stone-400" /></Button>
        )}
      </div>
    </div>
  );
}

function TagsSection() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: tags = [], isLoading } = trpc.tags.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]!);
  const create = trpc.tags.create.useMutation({
    onSuccess: () => { utils.tags.list.invalidate(); setCreateOpen(false); setNewName(""); setNewColor(TAG_COLORS[0]!); toast("success", "Tag created"); },
    onError: (e) => toast("error", e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Tags</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />New Tag</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div> : tags.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">No tags yet.</p>
        ) : (
          <div className="space-y-2">{tags.map(tag => <TagRow key={tag.id} tag={tag} onSaved={() => utils.tags.list.invalidate()} onDelete={() => utils.tags.list.invalidate()} />)}</div>
        )}
      </CardContent>
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setNewName(""); }} title="New Tag"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setNewName(""); }}>Cancel</Button>
            <Button onClick={() => create.mutate({ name: newName, color: newColor })} disabled={create.isPending || !newName.trim()}>{create.isPending ? "Creating…" : "Create"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Tag name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. VIP, Needs Follow-up" autoFocus />
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">Color</p>
            <div className="flex flex-wrap gap-2">{TAG_COLORS.map(c => <ColorSwatch key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />)}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: newColor }} />
            <span className="text-sm text-stone-600">{newName || "Preview"}</span>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

// ─── 12. Measurement Reports ─────────────────────────────────────────────────
function MeasurementReportsSection() {
  const METRICS = [
    { name: "Body Weight", unit: "lbs", active: true },
    { name: "Body Fat %", unit: "%", active: true },
    { name: "Chest", unit: "in", active: true },
    { name: "Waist", unit: "in", active: true },
    { name: "Hips", unit: "in", active: true },
    { name: "Left Arm", unit: "in", active: false },
    { name: "Right Arm", unit: "in", active: false },
    { name: "Left Thigh", unit: "in", active: false },
    { name: "Right Thigh", unit: "in", active: false },
  ];
  return (
    <Card>
      <CardHeader><CardTitle>Measurement Metrics</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-stone-500 mb-4">Configure which measurements are tracked and displayed for clients.</p>
        <div className="space-y-2">
          {METRICS.map(m => (
            <div key={m.name} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-stone-900">{m.name}</span>
                <Badge variant="outline" className="text-xs">{m.unit}</Badge>
              </div>
              <Badge variant={m.active ? "success" : "outline"}>{m.active ? "Active" : "Hidden"}</Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-3 text-center">Measurement configuration coming soon.</p>
      </CardContent>
    </Card>
  );
}

// ─── 13. Links ────────────────────────────────────────────────────────────────
function LinksSection() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: links = [], isLoading } = trpc.orgLinks.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", type: "custom" as "booking" | "affiliate" | "custom" });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const create = trpc.orgLinks.create.useMutation({
    onSuccess: () => { utils.orgLinks.list.invalidate(); setCreateOpen(false); setForm({ name: "", url: "", type: "custom" }); toast("success", "Link created"); },
    onError: (e) => toast("error", e.message),
  });
  const del = trpc.orgLinks.delete.useMutation({
    onSuccess: () => { utils.orgLinks.list.invalidate(); toast("success", "Link deleted"); },
    onError: (e) => toast("error", e.message),
  });
  const toggleActive = trpc.orgLinks.update.useMutation({
    onSuccess: () => utils.orgLinks.list.invalidate(),
    onError: (e) => toast("error", e.message),
  });

  const copyLink = (link: { id: string; url: string }) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const TYPE_VARIANT: Record<string, "info" | "warning" | "success"> = { booking: "success", affiliate: "warning", custom: "info" };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Links</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Link</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div> : links.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">No links yet. Add booking pages, affiliate links, or custom URLs.</p>
        ) : (
          <div className="space-y-2">
            {links.map(link => (
              <div key={link.id} className={`flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5 ${!link.isActive ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900">{link.name}</p>
                    <p className="text-xs text-stone-500 truncate max-w-xs">{link.url}</p>
                  </div>
                  <Badge variant={TYPE_VARIANT[link.type] ?? "outline"}>{link.type}</Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => copyLink(link)}>
                    {copiedId === link.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate({ id: link.id, isActive: !link.isActive })}>
                    {link.isActive ? <Globe className="h-3.5 w-3.5 text-stone-400" /> : <Lock className="h-3.5 w-3.5 text-stone-400" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => del.mutate({ id: link.id })}><Trash2 className="h-3.5 w-3.5 text-stone-400" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Link"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate(form)} disabled={create.isPending || !form.name || !form.url}>{create.isPending ? "Adding…" : "Add Link"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Book a Session" />
          <Input label="URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Type</label>
            <select className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as "booking" | "affiliate" | "custom" })}>
              <option value="booking">Booking</option>
              <option value="affiliate">Affiliate</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

// ─── 14. Events ───────────────────────────────────────────────────────────────
function EventsSection() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-900">Calendar & Events</p>
            <p className="text-xs text-stone-500">Manage appointments, availability, and scheduling settings</p>
          </div>
          <Link href="/admin/schedule"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Open Schedule</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 15. Support ──────────────────────────────────────────────────────────────
function SupportSection() {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle>Get Help</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-900">Documentation</p>
                <p className="text-xs text-stone-500">Platform guides, tutorials, and FAQs</p>
              </div>
              <Button variant="secondary" size="sm" disabled>Coming Soon</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-900">Email Support</p>
                <p className="text-xs text-stone-500">Contact the platform team</p>
              </div>
              <a href="mailto:support@carbontc.co"><Button variant="secondary" size="sm">Email Us</Button></a>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-900">Feature Requests</p>
                <p className="text-xs text-stone-500">Suggest new features or improvements</p>
              </div>
              <Button variant="secondary" size="sm" disabled>Coming Soon</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Platform Info</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-stone-500">Version</p><p className="text-sm font-medium">1.0.0</p></div>
            <div><p className="text-xs text-stone-500">Stack</p><p className="text-sm font-medium">Next.js 16 + Supabase</p></div>
            <div><p className="text-xs text-stone-500">Environment</p><p className="text-sm font-medium">{process.env.NODE_ENV}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 16. Time Card ────────────────────────────────────────────────────────────
function TimeCardSection() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: statusData } = trpc.timeCard.status.useQuery();
  const { data: allEntries = [], isLoading } = trpc.timeCard.listAll.useQuery({ weeks: 4 });
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ staffId: "", clockedIn: "", clockedOut: "", note: "" });

  const { data: staffList = [] } = trpc.staff.list.useQuery();
  const clockIn = trpc.timeCard.clockIn.useMutation({ onSuccess: () => { utils.timeCard.status.invalidate(); toast("success", "Clocked in"); }, onError: (e) => toast("error", e.message) });
  const clockOut = trpc.timeCard.clockOut.useMutation({ onSuccess: () => { utils.timeCard.status.invalidate(); utils.timeCard.listAll.invalidate(); toast("success", "Clocked out"); }, onError: (e) => toast("error", e.message) });
  const addEntry = trpc.timeCard.addEntry.useMutation({ onSuccess: () => { utils.timeCard.listAll.invalidate(); setAddOpen(false); setAddForm({ staffId: "", clockedIn: "", clockedOut: "", note: "" }); toast("success", "Entry added"); }, onError: (e) => toast("error", e.message) });
  const deleteEntry = trpc.timeCard.deleteEntry.useMutation({ onSuccess: () => { utils.timeCard.listAll.invalidate(); toast("success", "Entry deleted"); }, onError: (e) => toast("error", e.message) });

  const fmt = (d: Date | string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  const dur = (a: Date | string, b: Date | string | null) => {
    if (!b) return "—";
    const mins = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
    const h = Math.floor(mins / 60); const m = mins % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Status</CardTitle>
          <Badge variant={statusData?.isClockedIn ? "success" : "outline"}>{statusData?.isClockedIn ? "Clocked In" : "Clocked Out"}</Badge>
        </CardHeader>
        <CardContent>
          {statusData?.isClockedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">Clocked in at {statusData.entry ? fmt(statusData.entry.clockedIn) : "—"}</p>
              <Button variant="danger" size="sm" onClick={() => clockOut.mutate()} disabled={clockOut.isPending}>{clockOut.isPending ? "Clocking out…" : "Clock Out"}</Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => clockIn.mutate({})} disabled={clockIn.isPending}>{clockIn.isPending ? "Clocking in…" : "Clock In"}</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Entries (Last 4 Weeks)</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Manual Entry</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div> : allEntries.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No time entries in the last 4 weeks.</p>
          ) : (
            <div className="space-y-1">
              {allEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5 hover:bg-stone-50">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${e.staff.firstName} ${e.staff.lastName}`} size="sm" src={e.staff.avatarUrl ?? undefined} />
                    <div>
                      <p className="text-sm font-medium text-stone-900">{e.staff.firstName} {e.staff.lastName}</p>
                      <p className="text-xs text-stone-500">{fmt(e.clockedIn)} → {e.clockedOut ? fmt(e.clockedOut) : <span className="text-emerald-600 font-medium">Active</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-stone-700">{dur(e.clockedIn, e.clockedOut ?? null)}</span>
                    {e.note && <span className="text-xs text-stone-400 max-w-24 truncate">{e.note}</span>}
                    <Button variant="ghost" size="sm" onClick={() => deleteEntry.mutate({ id: e.id })}><Trash2 className="h-3.5 w-3.5 text-stone-400" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Time Entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addEntry.mutate({ staffId: addForm.staffId, clockedIn: addForm.clockedIn, clockedOut: addForm.clockedOut || undefined, note: addForm.note || undefined })} disabled={addEntry.isPending || !addForm.staffId || !addForm.clockedIn}>{addEntry.isPending ? "Adding…" : "Add Entry"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Staff Member</label>
            <select className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" value={addForm.staffId} onChange={e => setAddForm({ ...addForm, staffId: e.target.value })}>
              <option value="">Select staff…</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <Input label="Clock In" type="datetime-local" value={addForm.clockedIn} onChange={e => setAddForm({ ...addForm, clockedIn: e.target.value })} />
          <Input label="Clock Out (optional)" type="datetime-local" value={addForm.clockedOut} onChange={e => setAddForm({ ...addForm, clockedOut: e.target.value })} />
          <Input label="Note (optional)" value={addForm.note} onChange={e => setAddForm({ ...addForm, note: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}

// ─── 17. Lifecycle ────────────────────────────────────────────────────────────
function LifecycleSection() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-900">Lifecycle Automations</p>
            <p className="text-xs text-stone-500">Trigger-based rules that fire automatically (e.g. assign plan on purchase, send welcome email)</p>
          </div>
          <Link href="/admin/automations"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Manage</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 18. Emails ───────────────────────────────────────────────────────────────
function EmailsSection() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.emailTemplates.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", trigger: "" });

  const create = trpc.emailTemplates.create.useMutation({
    onSuccess: () => { utils.emailTemplates.list.invalidate(); setCreateOpen(false); setForm({ name: "", subject: "", body: "", trigger: "" }); toast("success", "Template created"); },
    onError: (e) => toast("error", e.message),
  });
  const update = trpc.emailTemplates.update.useMutation({
    onSuccess: () => { utils.emailTemplates.list.invalidate(); setEditingId(null); toast("success", "Template updated"); },
    onError: (e) => toast("error", e.message),
  });
  const del = trpc.emailTemplates.delete.useMutation({
    onSuccess: () => { utils.emailTemplates.list.invalidate(); toast("success", "Template deleted"); },
    onError: (e) => toast("error", e.message),
  });
  const toggleActive = trpc.emailTemplates.update.useMutation({
    onSuccess: () => utils.emailTemplates.list.invalidate(),
  });

  const TRIGGERS = ["", "on_purchase", "on_signup", "on_assessment_complete", "on_package_expiry", "manual"];

  const startEdit = (t: typeof templates[number]) => {
    setForm({ name: t.name, subject: t.subject, body: t.body, trigger: t.trigger ?? "" });
    setEditingId(t.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Templates</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />New Template</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div> : templates.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">No email templates yet.</p>
        ) : (
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className={`flex items-center justify-between rounded-lg border border-stone-200 px-3 py-3 ${!t.isActive ? "opacity-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-stone-900">{t.name}</p>
                    {t.trigger && <Badge variant="outline" className="text-xs">{t.trigger}</Badge>}
                  </div>
                  <p className="text-xs text-stone-500 truncate">{t.subject}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate({ id: t.id, isActive: !t.isActive })}>
                    {t.isActive ? <Globe className="h-3.5 w-3.5 text-stone-400" /> : <Lock className="h-3.5 w-3.5 text-stone-400" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => del.mutate({ id: t.id })}><Trash2 className="h-3.5 w-3.5 text-stone-400" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Email Template"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate({ name: form.name, subject: form.subject, body: form.body, trigger: form.trigger || undefined })} disabled={create.isPending || !form.name || !form.subject || !form.body}>{create.isPending ? "Creating…" : "Create"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Template Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welcome Email" />
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Trigger (optional)</label>
            <select className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })}>
              {TRIGGERS.map(t => <option key={t} value={t}>{t || "Manual only"}</option>)}
            </select>
          </div>
          <Input label="Subject Line" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Welcome to Carbon Training Centre!" />
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Body</label>
            <textarea rows={6} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none font-mono text-xs" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Hi {{first_name}}, welcome to Carbon TC!&#10;&#10;Use {{first_name}}, {{last_name}}, {{trainer_name}} as variables." />
          </div>
        </div>
      </Modal>

      {/* Edit */}
      <Modal open={!!editingId} onClose={() => setEditingId(null)} title="Edit Email Template"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={() => update.mutate({ id: editingId!, name: form.name, subject: form.subject, body: form.body, trigger: form.trigger || null })} disabled={update.isPending || !form.name || !form.subject || !form.body}>{update.isPending ? "Saving…" : "Save"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Template Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Trigger</label>
            <select className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })}>
              {TRIGGERS.map(t => <option key={t} value={t}>{t || "Manual only"}</option>)}
            </select>
          </div>
          <Input label="Subject Line" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Body</label>
            <textarea rows={6} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none font-mono text-xs" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          </div>
        </div>
      </Modal>
    </Card>
  );
}

// ─── 19. Point of Sale ────────────────────────────────────────────────────────
function PointOfSaleSection() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Point of Sale</CardTitle><Badge variant="outline">Coming Soon</Badge></CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500 mb-4">Accept in-person payments via card reader or manual entry at the front desk.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "Card Reader", desc: "Stripe Terminal integration for tap/swipe/chip", icon: "💳" },
              { title: "Cash Tracking", desc: "Log and reconcile cash payments", icon: "💵" },
              { title: "Daily Drawer", desc: "Open/close drawer reports and reconciliation", icon: "🗃️" },
            ].map(f => (
              <div key={f.title} className="rounded-xl border border-stone-200 p-4 text-center">
                <div className="text-3xl mb-2">{f.icon}</div>
                <p className="text-sm font-medium text-stone-900">{f.title}</p>
                <p className="text-xs text-stone-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [section, setSection] = useState<Section>("trainer-info");
  const [collapsed, setCollapsed] = useState(false);

  const current = NAV_ITEMS.find(n => n.id === section)!;

  const renderSection = () => {
    switch (section) {
      case "trainer-info":        return <TrainerInfoSection />;
      case "customize":           return <CustomizeSection />;
      case "connected-apps":      return <ConnectedAppsSection />;
      case "trainers":            return <TrainersSection />;
      case "products":            return <ProductsSection />;
      case "assessments":         return <AssessmentsSection />;
      case "resources":           return <ResourcesSection />;
      case "videos":              return <VideosSection />;
      case "stripe":              return <StripeSection />;
      case "reports":             return <ReportsSection />;
      case "tags":                return <TagsSection />;
      case "measurement-reports": return <MeasurementReportsSection />;
      case "links":               return <LinksSection />;
      case "events":              return <EventsSection />;
      case "support":             return <SupportSection />;
      case "time-card":           return <TimeCardSection />;
      case "lifecycle":           return <LifecycleSection />;
      case "emails":              return <EmailsSection />;
      case "point-of-sale":       return <PointOfSaleSection />;
    }
  };

  return (
    <div className="flex min-h-screen gap-0">
      {/* Sidebar */}
      <aside className={`shrink-0 border-r border-stone-200 bg-white transition-all duration-200 ${collapsed ? "w-12" : "w-52"}`}>
        <div className="sticky top-0 flex flex-col h-screen">
          {/* Header */}
          <div className={`flex items-center border-b border-stone-100 px-3 py-3 ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed && <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Account</span>}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-2">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${collapsed ? "justify-center" : ""} ${active ? "bg-stone-100 text-stone-900 font-medium" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto bg-stone-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <current.icon className="h-5 w-5 text-stone-400" />
            <h1 className="text-xl font-bold text-stone-900">{current.label}</h1>
          </div>
          {renderSection()}
        </div>
      </main>
    </div>
  );
}

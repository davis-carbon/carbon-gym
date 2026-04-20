"use client";

import { use, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Calendar as CalendarIcon, MoreVertical, Loader2,
  User, Package, CreditCard, Ruler, FileText, Dumbbell,
  UtensilsCrossed, ClipboardList, FolderOpen, Video, Users,
  CalendarCheck, Image, RefreshCw, ChevronLeft, ChevronRight, Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { PersonalInfoSection } from "@/components/admin/client-detail/personal-info-section";
import { PackagesTab } from "@/components/admin/client-detail/packages-tab";
import { MeasurementsTab } from "@/components/admin/client-detail/measurements-tab";
import { TrainerNotesTab } from "@/components/admin/client-detail/trainer-notes-tab";
import { WorkoutsTab } from "@/components/admin/client-detail/workouts-tab";
import { PaymentsTab } from "@/components/admin/client-detail/payments-tab";
import { VisitsTab } from "@/components/admin/client-detail/visits-tab";
import { AssessmentsSection } from "@/components/admin/client-detail/assessments-section";
import { ResourcesTab } from "@/components/admin/client-detail/resources-tab";
import { VideosTab } from "@/components/admin/client-detail/videos-tab";
import { GroupsTab } from "@/components/admin/client-detail/groups-tab";
import { ProgressPhotosTab } from "@/components/admin/client-detail/progress-photos-tab";
import { NutritionTab } from "@/components/admin/client-detail/nutrition-tab";
import { LifecycleTab } from "@/components/admin/client-detail/lifecycle-tab";
import { useToast } from "@/components/ui/toast";
import { trpc } from "@/trpc/client";

// ─── Sidebar nav definition ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "personal-info",   label: "Personal Info",       icon: User },
  { id: "packages",        label: "Packages",            icon: Package },
  { id: "payments",        label: "Payments / Products", icon: CreditCard },
  { id: "measurements",    label: "Measurements",        icon: Ruler },
  { id: "notes",           label: "Trainer Notes",       icon: FileText },
  { id: "workouts",        label: "Workouts",            icon: Dumbbell },
  { id: "nutrition",       label: "Nutrition",           icon: UtensilsCrossed },
  { id: "assessments",     label: "Assessments",         icon: ClipboardList },
  { id: "resources",       label: "Resources",           icon: FolderOpen },
  { id: "videos",          label: "Videos",              icon: Video },
  { id: "groups",          label: "Group Memberships",   icon: Users },
  { id: "visits",          label: "Visits",              icon: CalendarCheck },
  { id: "progress-photos", label: "Progress Photos",     icon: Image },
  { id: "lifecycle",       label: "Lifecycle",           icon: RefreshCw },
] as const;

type SectionId = (typeof NAV_ITEMS)[number]["id"];



// ─── Inner component (uses useSearchParams — needs Suspense) ──────────────────
function ClientDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const activeSection = (searchParams.get("section") as SectionId) ?? "personal-info";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: client, isLoading, error } = trpc.clients.byId.useQuery({ id });

  const { data: packages } = trpc.schedule.packages.list.useQuery(undefined, { enabled: false });

  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [chargeOpen, setChargeOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");

  const createThread = trpc.messages.createThread.useMutation({
    onSuccess: () => { toast("success", "Message sent"); setSendMessageOpen(false); setMessageText(""); router.push("/admin/messages"); },
    onError: (err) => toast("error", err.message),
  });

  const archiveClient = trpc.clients.update.useMutation({
    onSuccess: () => router.push("/admin/clients"),
    onError: (err) => toast("error", err.message),
  });

  function navigate(section: SectionId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.replace(`/admin/clients/${id}?${params.toString()}`, { scroll: false });
  }

  function renderSection() {
    switch (activeSection) {
      case "personal-info":   return <PersonalInfoSection clientId={id} />;
      case "packages":        return <PackagesTab clientId={id} />;
      case "payments":        return <PaymentsTab clientId={id} />;
      case "measurements":    return <MeasurementsTab clientId={id} />;
      case "notes":           return <TrainerNotesTab clientId={id} />;
      case "workouts":        return <WorkoutsTab clientId={id} clientName={client ? `${client.firstName} ${client.lastName}` : "Client"} />;
      case "nutrition":       return <NutritionTab clientId={id} />;
      case "assessments":     return <AssessmentsSection clientId={id} />;
      case "resources":       return <ResourcesTab clientId={id} />;
      case "videos":          return <VideosTab clientId={id} clientName={client ? `${client.firstName} ${client.lastName}` : "Client"} />;
      case "groups":          return <GroupsTab clientId={id} clientName={client ? `${client.firstName} ${client.lastName}` : "Client"} />;
      case "visits":          return <VisitsTab clientId={id} />;
      case "progress-photos": return <ProgressPhotosTab clientId={id} />;
      case "lifecycle":       return <LifecycleTab clientId={id} />;
      default:                return <PersonalInfoSection clientId={id} />;
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        <span className="ml-2 text-sm text-stone-500">Loading client...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-red-600">Client not found or access denied.</p>
        <Link href="/admin/clients" className="text-sm text-stone-500 underline mt-2 inline-block">Back to accounts</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Back link ─────────────────────────────────────────── */}
      <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="h-4 w-4" /> Back to accounts
      </Link>

      {/* ── Client header ─────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={`${client.firstName} ${client.lastName}`} src={client.profileImageUrl} size="lg" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-stone-900">{client.firstName} {client.lastName}</h1>
                <span className="text-sm text-stone-400">·</span>
                <span className="text-sm text-stone-500">{client.lifecycleStage.charAt(0) + client.lifecycleStage.slice(1).toLowerCase().replace("_", " ")}</span>
                {client.assignedStaff && (
                  <span className="text-xs text-stone-400 ml-1">· {client.assignedStaff.firstName} {client.assignedStaff.lastName}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={client.billingStatus === "PAID" ? "success" : client.billingStatus === "PAST_DUE" ? "danger" : client.billingStatus === "NON_BILLED" ? "outline" : "warning"}>
                  {client.billingStatus.charAt(0) + client.billingStatus.slice(1).toLowerCase().replace("_", " ")}
                </Badge>
                {client.tags.slice(0, 3).map((t) => (
                  <Badge key={t.tag.id} variant="outline">
                    {t.tag.name}
                  </Badge>
                ))}
                <span className="text-xs text-stone-400">
                  Sign up {new Date(client.signupDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/admin/clients/${id}/calendar`}>
              <Button variant="secondary" size="sm">
                <CalendarIcon className="h-4 w-4" /> Calendar
              </Button>
            </Link>
            <DropdownMenu trigger={<MoreVertical className="h-4 w-4" />}>
              <DropdownItem onClick={() => setSendMessageOpen(true)}>Send Message</DropdownItem>
              <DropdownItem onClick={() => setChargeOpen(true)}>Charge Account</DropdownItem>
              <DropdownItem danger onClick={() => {
                if (!confirm(`Archive ${client.firstName} ${client.lastName}?`)) return;
                archiveClient.mutate({ id, status: "INACTIVE", lifecycleStage: "FORMER_CLIENT" });
              }}>Archive Client</DropdownItem>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + content ────────────────────────────── */}
      <div className="flex gap-4 items-start">
        {/* Sidebar */}
        <div className={`shrink-0 rounded-xl border border-stone-200 bg-white overflow-hidden transition-all ${sidebarCollapsed ? "w-12" : "w-52"}`}>
          <div className={`flex items-center border-b border-stone-100 px-3 py-3 ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
            {!sidebarCollapsed && <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Client Sections</span>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-stone-400 hover:text-stone-700 p-0.5">
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <nav className="py-1">
            {NAV_ITEMS.map(({ id: navId, label, icon: Icon }) => {
              const active = activeSection === navId;
              return (
                <button
                  key={navId}
                  onClick={() => navigate(navId)}
                  title={sidebarCollapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-stone-100 text-stone-900 font-medium"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  } ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Icon className={`shrink-0 ${active ? "h-4 w-4" : "h-4 w-4 opacity-60"}`} />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderSection()}
        </div>
      </div>

      {/* ── Send Message Modal ─────────────────────────────────── */}
      <Modal open={sendMessageOpen} onClose={() => { setSendMessageOpen(false); setMessageText(""); }} title="Send Message">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-stone-700">To: {client.firstName} {client.lastName}</label>
          <textarea
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            rows={5} placeholder="Type your message..."
            value={messageText} onChange={(e) => setMessageText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setSendMessageOpen(false); setMessageText(""); }}>Cancel</Button>
            <Button onClick={() => createThread.mutate({ clientId: id, initialMessage: messageText })} disabled={!messageText.trim() || createThread.isPending}>
              {createThread.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Charge Account Modal ───────────────────────────────── */}
      <Modal open={chargeOpen} onClose={() => { setChargeOpen(false); setSelectedPackageId(""); }} title="Charge Account">
        <ChargeModal clientId={id} onClose={() => { setChargeOpen(false); setSelectedPackageId(""); }} />
      </Modal>
    </div>
  );
}

// ─── Charge modal (fetches packages lazily) ───────────────────────────────────
function ChargeModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState("");
  const { data: packages } = trpc.schedule.packages.list.useQuery();
  const checkout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => { if (data.url) window.open(data.url, "_blank"); onClose(); },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">Select a package to charge the client.</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {!packages ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          : packages.length === 0 ? <p className="text-sm text-stone-400">No packages found.</p>
          : packages.map((pkg) => (
            <button key={pkg.id} onClick={() => setSelectedId(pkg.id)}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${selectedId === pkg.id ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-300"}`}>
              <p className="font-medium text-sm">{pkg.name}</p>
              <p className="text-xs text-stone-500 mt-0.5">${pkg.price} · {pkg.billingCycle === "ONE_TIME" ? "One-time" : pkg.billingCycle.toLowerCase()}</p>
            </button>
          ))
        }
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => checkout.mutate({ clientId, packageId: selectedId })} disabled={!selectedId || checkout.isPending}>
          {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Checkout Link"}
        </Button>
      </div>
    </div>
  );
}

// ─── Page wrapper with Suspense for useSearchParams ───────────────────────────
export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    }>
      <ClientDetailInner id={id} />
    </Suspense>
  );
}

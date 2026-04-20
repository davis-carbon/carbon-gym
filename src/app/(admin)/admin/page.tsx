"use client";

import { useState, useCallback, useEffect } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, CreditCard, Package, ClipboardCheck, Dumbbell, Cake,
  UserX, MessageSquare, Upload, BarChart3, UserCheck, TrendingUp,
  XCircle, RefreshCw, AlertCircle, Settings2, Plus, X,
  ChevronUp, ChevronDown, Loader2,
} from "lucide-react";
import { CARD_META, CARD_TYPES, TIME_RANGES, DEFAULT_CARDS, type CardType, type TimeRange, type DashboardCard } from "@/lib/dashboard-config";

// ─── Card icon map ────────────────────────────────────────────────────────────

const CARD_ICONS: Record<CardType, React.ComponentType<{ className?: string }>> = {
  NEW_ACCOUNTS: Users,
  FAILED_PAYMENTS: CreditCard,
  EXPIRING_PACKAGES: Package,
  COMPLETED_ASSESSMENTS: ClipboardCheck,
  NO_LOGGED_WORKOUTS: Dumbbell,
  BIRTHDAY_SOON: Cake,
  NO_RECENT_VISITS: UserX,
  NEW_MESSAGES: MessageSquare,
  NEW_UPLOADS: Upload,
  ACTIVE_PACKAGES: Package,
  ACTIVE_CLIENTS: UserCheck,
  NEW_LEADS: TrendingUp,
  CANCELLATIONS: XCircle,
  RENEWALS: RefreshCw,
  EXPIRING_CARDS: AlertCircle,
};

// ─── Category colours ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Clients: "bg-blue-50 text-blue-600",
  Billing: "bg-amber-50 text-amber-600",
  Engagement: "bg-emerald-50 text-emerald-600",
  Content: "bg-purple-50 text-purple-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, isCurrency: boolean) {
  if (isCurrency) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n.toLocaleString("en-US");
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

let nextId = 1;
function genId() { return `card-${Date.now()}-${nextId++}`; }

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  card,
  value,
  isCurrency,
  timeRangeLabel,
  loading,
  editMode,
  onRemove,
  onMoveUp,
  onMoveDown,
  onTimeRangeChange,
  isFirst,
  isLast,
  onClick,
}: {
  card: DashboardCard;
  value?: number;
  isCurrency?: boolean;
  timeRangeLabel?: string;
  loading: boolean;
  editMode: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onTimeRangeChange: (r: TimeRange) => void;
  isFirst: boolean;
  isLast: boolean;
  onClick?: () => void;
}) {
  const meta = CARD_META[card.type];
  const Icon = CARD_ICONS[card.type];
  const iconBg = CATEGORY_COLORS[meta.category] ?? "bg-stone-100 text-stone-500";

  return (
    <Card
      className={`relative ${editMode ? "ring-2 ring-stone-300 ring-offset-1" : onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      {editMode && (
        <div className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className="rounded-full bg-white border border-stone-200 p-0.5 shadow-sm text-stone-400 hover:text-stone-700 disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className="rounded-full bg-white border border-stone-200 p-0.5 shadow-sm text-stone-400 hover:text-stone-700 disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="rounded-full bg-red-500 text-white p-0.5 shadow-sm hover:bg-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <CardContent className="pt-4">
        <div
          className="flex items-start justify-between gap-2"
          onClick={!editMode ? onClick : undefined}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-stone-500 truncate">{meta.title}</p>
            <p className="mt-2 text-3xl font-bold text-stone-900">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-stone-300" /> : fmt(value ?? 0, isCurrency ?? false)}
            </p>
            <div className="mt-1">
              {editMode || meta.availableRanges.length > 1 ? (
                <select
                  value={card.timeRange}
                  onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-stone-400 bg-transparent border-none focus:outline-none cursor-pointer hover:text-stone-600 p-0"
                >
                  {meta.availableRanges.map((r) => (
                    <option key={r} value={r}>{TIME_RANGES.includes(r) ? formatRange(r) : r}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-stone-400">{timeRangeLabel ?? formatRange(card.timeRange)}</p>
              )}
            </div>
          </div>
          <div className={`rounded-lg p-2 shrink-0 ${iconBg.split(" ").slice(0, 1).join(" ")}`}>
            <Icon className={`h-5 w-5 ${iconBg.split(" ").slice(1).join(" ")}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRange(r: TimeRange): string {
  return r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Add Card Panel ───────────────────────────────────────────────────────────

function AddCardPanel({ existingTypes, onAdd, onClose }: {
  existingTypes: Set<CardType>;
  onAdd: (type: CardType) => void;
  onClose: () => void;
}) {
  const categories = Array.from(new Set(Object.values(CARD_META).map((m) => m.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="text-base font-semibold">Add Card</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {categories.map((cat) => {
            const catCards = CARD_TYPES.filter((t) => CARD_META[t].category === cat);
            return (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{cat}</p>
                <div className="space-y-1">
                  {catCards.map((type) => {
                    const already = existingTypes.has(type);
                    const Icon = CARD_ICONS[type];
                    return (
                      <button
                        key={type}
                        onClick={() => !already && onAdd(type)}
                        disabled={already}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${
                          already
                            ? "text-stone-300 cursor-default"
                            : "text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{CARD_META[type].title}</span>
                        {already && <span className="text-xs text-stone-300">Added</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Breakdown Panel ──────────────────────────────────────────────────────────

function BreakdownPanel() {
  const [period, setPeriod] = useState<"TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_30_DAYS">("TODAY");
  const { data, isLoading } = trpc.dashboard.breakdown.useQuery(period);

  const rows: Array<{ label: string; count: number; amount?: number }> = data ? [
    { label: "New Leads", count: data.newLeads },
    { label: "New Clients", count: data.newClients },
    { label: "New Sales", count: data.newSalesCount, amount: data.newSalesAmount },
    { label: "Renewals", count: data.renewalsCount, amount: data.renewalsAmount },
    { label: "Refunds", count: data.refundsCount, amount: data.refundsAmount },
    { label: "Cancellations", count: data.cancellations },
    { label: "Failed Payments", count: data.failedPaymentsCount, amount: data.failedPaymentsAmount },
  ] : [];

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900">Breakdown</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="rounded border border-stone-200 px-2 py-1 text-xs text-stone-600 focus:outline-none"
          >
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-stone-300" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-right text-stone-500 tabular-nums">{row.count}</span>
                  <span className="text-stone-700">{row.label}</span>
                </div>
                {row.amount !== undefined && (
                  <span className={`font-medium tabular-nums ${row.amount > 0 ? "text-emerald-600" : "text-stone-400"}`}>
                    {fmtUSD(row.amount)}
                  </span>
                )}
              </div>
            ))}
            {data && (
              <div className="border-t border-stone-200 pt-2.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-900">Total change</span>
                <span className={`text-sm font-semibold tabular-nums ${data.totalChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmtUSD(data.totalChange)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Drill-Down Panel ─────────────────────────────────────────────────────────

function DrillDownPanel({
  card,
  timeRangeLabel,
  onClose,
}: {
  card: DashboardCard;
  timeRangeLabel: string;
  onClose: () => void;
}) {
  const meta = CARD_META[card.type];
  const { data, isLoading } = trpc.dashboard.drillDown.useQuery(
    { type: card.type, timeRange: card.timeRange },
    { enabled: true },
  );

  function getInitials(firstName: string, lastName: string) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-96 z-50 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{meta.title}</h2>
            <p className="text-xs text-stone-400 mt-0.5">{timeRangeLabel}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-stone-300" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
              <p className="text-sm">No clients found</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {data.map((client) => (
                <li key={`${client.id}-${client.detail}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50">
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-stone-600">
                      {getInitials(client.firstName, client.lastName)}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-xs text-stone-400 truncate">{client.detail}</p>
                  </div>
                  {/* View link */}
                  <a
                    href={`/admin/clients/${client.id}`}
                    className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Time-ago helper ──────────────────────────────────────────────────────────

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── Recently Logged Workouts Panel ──────────────────────────────────────────

function RecentWorkoutsPanel() {
  const { data, isLoading } = trpc.dashboard.recentWorkouts.useQuery();

  return (
    <Card>
      <CardContent className="pt-4">
        <h2 className="font-semibold text-stone-900 mb-3">Recently Logged Workouts</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-stone-300" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">No workouts logged yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
            {data.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-stone-800 truncate">
                    <a href={`/admin/clients/${item.clientId}`} className="font-medium hover:underline">
                      {item.clientName}
                    </a>
                    {" — "}
                    <span className="text-stone-500">{item.workoutTitle}</span>
                  </p>
                </div>
                <span className="text-xs text-stone-400 shrink-0 tabular-nums">
                  {timeAgo(item.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Past Due Subscriptions Panel ────────────────────────────────────────────

function PastDuePanel() {
  const { data, isLoading } = trpc.dashboard.pastDue.useQuery();

  return (
    <Card>
      <CardContent className="pt-4">
        <h2 className="font-semibold text-stone-900 mb-3">Past Due Subscriptions</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-stone-300" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">No past-due clients.</p>
        ) : (
          <ul className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
            {data.map((client) => (
              <li key={client.id} className="flex items-center justify-between py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">
                    {client.firstName} {client.lastName}
                  </p>
                  {client.email && (
                    <p className="text-xs text-stone-400 truncate">{client.email}</p>
                  )}
                </div>
                <a
                  href={`/admin/clients/${client.id}`}
                  className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  View →
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const utils = trpc.useUtils();
  const [editMode, setEditMode] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [localCards, setLocalCards] = useState<DashboardCard[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [drillCard, setDrillCard] = useState<DashboardCard | null>(null);

  const { data: savedCards, isLoading: configLoading } = trpc.dashboard.getConfig.useQuery();

  useEffect(() => {
    if (savedCards && !localCards) setLocalCards(savedCards);
  }, [savedCards]);

  const saveConfig = trpc.dashboard.saveConfig.useMutation({
    onSuccess: () => {
      utils.dashboard.getConfig.invalidate();
      setEditMode(false);
      setSaving(false);
    },
  });

  const cards: DashboardCard[] = localCards ?? savedCards ?? DEFAULT_CARDS;

  const { data: cardValues, isLoading: valuesLoading } = trpc.dashboard.cardData.useQuery(cards, {
    enabled: cards.length > 0,
    placeholderData: keepPreviousData,
  });

  const updateCard = useCallback((id: string, patch: Partial<DashboardCard>) => {
    setLocalCards((prev) => (prev ?? cards).map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, [cards]);

  const removeCard = useCallback((id: string) => {
    setLocalCards((prev) => (prev ?? cards).filter((c) => c.id !== id));
  }, [cards]);

  const moveCard = useCallback((id: string, dir: -1 | 1) => {
    setLocalCards((prev) => {
      const arr = [...(prev ?? cards)];
      const idx = arr.findIndex((c) => c.id === id);
      if (idx < 0) return arr;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx]!, arr[idx]!];
      return arr;
    });
  }, [cards]);

  const addCard = useCallback((type: CardType) => {
    const meta = CARD_META[type];
    setLocalCards((prev) => [
      ...(prev ?? cards),
      { id: genId(), type, timeRange: meta.defaultTimeRange },
    ]);
    setShowAddPanel(false);
  }, [cards]);

  function handleSave() {
    setSaving(true);
    saveConfig.mutate(cards);
  }

  function handleCancelEdit() {
    setLocalCards(savedCards ?? DEFAULT_CARDS);
    setEditMode(false);
  }

  const existingTypes = new Set(cards.map((c) => c.type));

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button size="sm" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Layout"}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => setShowAddPanel(true)}>
                <Plus className="h-4 w-4" /> Add Card
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditMode(true)}>
                <Settings2 className="h-4 w-4" /> Configure
              </Button>
            </>
          )}
        </div>
      </div>

      {editMode && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 px-4 py-2.5 text-sm text-stone-500">
          Drag cards to reorder using ↑↓ arrows, or remove them with ×. Changes save when you click <strong>Save Layout</strong>.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* KPI cards grid */}
        <div className="lg:col-span-3">
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 py-16 text-stone-400">
              <BarChart3 className="h-10 w-10 mb-3 text-stone-300" />
              <p className="text-sm">No cards added yet.</p>
              <Button size="sm" variant="secondary" className="mt-4" onClick={() => setShowAddPanel(true)}>
                <Plus className="h-4 w-4" /> Add your first card
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map((card, idx) => {
                const data = cardValues?.[card.id];
                return (
                  <KpiCard
                    key={card.id}
                    card={card}
                    value={data?.value}
                    isCurrency={data?.isCurrency}
                    timeRangeLabel={data?.timeRangeLabel}
                    loading={valuesLoading}
                    editMode={editMode}
                    onRemove={() => removeCard(card.id)}
                    onMoveUp={() => moveCard(card.id, -1)}
                    onMoveDown={() => moveCard(card.id, 1)}
                    onTimeRangeChange={(r) => updateCard(card.id, { timeRange: r })}
                    isFirst={idx === 0}
                    isLast={idx === cards.length - 1}
                    onClick={() => setDrillCard(card)}
                  />
                );
              })}
              {editMode && (
                <button
                  onClick={() => setShowAddPanel(true)}
                  className="flex items-center justify-center rounded-xl border-2 border-dashed border-stone-200 py-8 text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-1.5" /> Add card
                </button>
              )}
            </div>
          )}
        </div>

        {/* Breakdown panel */}
        <div className="lg:col-span-1">
          <BreakdownPanel />
        </div>
      </div>

      {/* Activity feed row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentWorkoutsPanel />
        <PastDuePanel />
      </div>

      {/* Add card panel */}
      {showAddPanel && (
        <AddCardPanel
          existingTypes={existingTypes as Set<CardType>}
          onAdd={addCard}
          onClose={() => setShowAddPanel(false)}
        />
      )}

      {/* Drill-down panel */}
      {drillCard && (
        <DrillDownPanel
          card={drillCard}
          timeRangeLabel={cardValues?.[drillCard.id]?.timeRangeLabel ?? formatRange(drillCard.timeRange)}
          onClose={() => setDrillCard(null)}
        />
      )}
    </div>
  );
}

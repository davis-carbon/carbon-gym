"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import {
  CreditCard, Loader2, Search, Plus, MoreVertical, ExternalLink,
  Copy, TrendingUp, Users, RefreshCw, CheckCircle2, BarChart2,
  Calendar,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number) { return `$${n.toFixed(2)}`; }
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
    </div>
  );
}

function EmptyState({ text, subtext }: { text: string; subtext?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-stone-400">
      <Search className="h-8 w-8" />
      <p className="text-sm font-medium text-stone-500">{text}</p>
      {subtext && <p className="text-xs">{subtext}</p>}
    </div>
  );
}

function ClientCell({ client }: { client: { id: string; firstName: string; lastName: string; profileImageUrl?: string | null } }) {
  return (
    <Link
      href={`/admin/clients/${client.id}?tab=payments`}
      className="flex items-center gap-2 group"
      onClick={(e) => e.stopPropagation()}
    >
      {client.profileImageUrl ? (
        <img src={client.profileImageUrl} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-semibold text-stone-500">
            {client.firstName[0]}{client.lastName[0]}
          </span>
        </div>
      )}
      <span className="text-sm font-medium text-stone-800 group-hover:underline">
        {client.firstName} {client.lastName}
      </span>
    </Link>
  );
}

// ─── Sub-tab: Subscriptions ──────────────────────────────────────────────────

function SubscriptionsTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const { data: subscriptions = [], isLoading } = trpc.billing.listOrgSubscriptions.useQuery({
    status: filterStatus || undefined,
  });

  const cancel = trpc.schedule.clientPackages.cancel.useMutation({
    onSuccess: () => { toast("success", "Subscription cancelled"); utils.billing.listOrgSubscriptions.invalidate(); },
    onError: (err) => toast("error", err.message),
  });
  const pause = trpc.schedule.clientPackages.pause.useMutation({
    onSuccess: () => { toast("success", "Subscription paused"); utils.billing.listOrgSubscriptions.invalidate(); },
    onError: (err) => toast("error", err.message),
  });
  const resume = trpc.schedule.clientPackages.resume.useMutation({
    onSuccess: () => { toast("success", "Subscription resumed"); utils.billing.listOrgSubscriptions.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  const filtered = subscriptions.filter((s) => {
    if (!filterSearch) return true;
    const name = `${s.client.firstName} ${s.client.lastName}`.toLowerCase();
    const pkg = s.package.name.toLowerCase();
    return name.includes(filterSearch.toLowerCase()) || pkg.includes(filterSearch.toLowerCase());
  });

  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const pausedCount = subscriptions.filter((s) => s.status === "paused").length;
  const totalMRR = subscriptions
    .filter((s) => s.status === "active" && s.package.billingCycle === "MONTHLY")
    .reduce((sum, s) => sum + s.package.price, 0);

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge variant="success">Active</Badge>;
    if (status === "paused") return <Badge variant="warning">Paused</Badge>;
    if (status === "cancelled") return <Badge variant="danger">Cancelled</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Total Subscriptions</p>
          <p className="text-2xl font-bold text-stone-900">{subscriptions.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Paused</p>
          <p className="text-2xl font-bold text-amber-600">{pausedCount}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Monthly Recurring Revenue</p>
          <p className="text-2xl font-bold text-stone-900">{fmt$(totalMRR)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search client or package..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <LoadingState /> : filtered.length === 0 ? (
          <EmptyState text="No subscriptions found" subtext={filterSearch || filterStatus ? "Try clearing filters" : "Subscriptions appear once clients complete checkout"} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Client</th>
                <th className="px-4 py-3 font-medium text-stone-600">Package</th>
                <th className="px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="px-4 py-3 font-medium text-stone-600">Price</th>
                <th className="px-4 py-3 font-medium text-stone-600">Started</th>
                <th className="px-4 py-3 font-medium text-stone-600">Ends / Renews</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3"><ClientCell client={s.client} /></td>
                  <td className="px-4 py-3 font-medium text-stone-800">{s.package.name}</td>
                  <td className="px-4 py-3">{statusBadge(s.status)}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {fmt$(s.package.price)}
                    {s.package.billingCycle !== "ONE_TIME" && (
                      <span className="text-stone-400 text-xs"> / {s.package.billingCycle.toLowerCase()}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {(s as any).startDate ? fmtDate((s as any).startDate) : fmtDate((s as any).createdAt)}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {s.endDate ? fmtDate(s.endDate) : <span className="text-stone-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu align="right">
                      <DropdownItem onClick={() => window.open(`/admin/clients/${s.client.id}?tab=payments`, "_blank")}>
                        <ExternalLink className="h-4 w-4" /> View Client
                      </DropdownItem>
                      {s.status === "active" && (
                        <DropdownItem onClick={() => pause.mutate({ id: s.id })}>
                          Pause Subscription
                        </DropdownItem>
                      )}
                      {s.status === "paused" && (
                        <DropdownItem onClick={() => resume.mutate({ id: s.id })}>
                          Resume Subscription
                        </DropdownItem>
                      )}
                      <DropdownItem
                        danger
                        onClick={() => {
                          if (confirm("Cancel this subscription? This cannot be undone.")) cancel.mutate({ id: s.id });
                        }}
                      >
                        Cancel Subscription
                      </DropdownItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reports */}
      <div>
        <h3 className="text-sm font-semibold text-stone-700 mb-3">Reports</h3>
        <div className="grid grid-cols-2 gap-3 max-w-lg">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-4 w-4 text-stone-400" />
              <p className="text-sm font-medium text-stone-700">Subscriptions Report</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => toast("info", "Reports coming soon")}>
              View Report
            </Button>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-stone-400" />
              <p className="text-sm font-medium text-stone-700">Scheduled Subscriptions</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => toast("info", "Reports coming soon")}>
              View Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Charges ────────────────────────────────────────────────────────

function ChargesTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const { data: payments = [], isLoading } = trpc.billing.listOrgPayments.useQuery({
    status: filterStatus || undefined,
  });

  const refund = trpc.billing.refund.useMutation({
    onSuccess: () => { toast("success", "Refund initiated"); utils.billing.listOrgPayments.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  const filtered = payments.filter((p) => {
    if (!filterSearch) return true;
    const name = `${p.client.firstName} ${p.client.lastName}`.toLowerCase();
    const desc = (p.description || p.clientPackage?.package?.name || "").toLowerCase();
    return name.includes(filterSearch.toLowerCase()) || desc.includes(filterSearch.toLowerCase());
  });

  const totalRevenue = payments.filter((p) => p.status === "SUCCEEDED").reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = payments.filter((p) => p.status === "REFUNDED").reduce((sum, p) => sum + p.amount, 0);

  const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
    SUCCEEDED: "success",
    PENDING: "warning",
    FAILED: "danger",
    REFUNDED: "outline",
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Total Charges</p>
          <p className="text-2xl font-bold text-stone-900">{payments.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Revenue Collected</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt$(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Refunded</p>
          <p className="text-2xl font-bold text-red-500">{fmt$(totalRefunded)}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Failed</p>
          <p className="text-2xl font-bold text-stone-900">
            {payments.filter((p) => p.status === "FAILED").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">All statuses</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search client or item..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <LoadingState /> : filtered.length === 0 ? (
          <EmptyState text="No charges found" subtext={filterSearch || filterStatus ? "Try clearing filters" : undefined} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Client</th>
                <th className="px-4 py-3 font-medium text-stone-600">Item</th>
                <th className="px-4 py-3 font-medium text-stone-600">Date</th>
                <th className="px-4 py-3 font-medium text-stone-600">Amount</th>
                <th className="px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3"><ClientCell client={p.client} /></td>
                  <td className="px-4 py-3 text-stone-700">{p.description || p.clientPackage?.package?.name || "Charge"}</td>
                  <td className="px-4 py-3 text-stone-500">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{fmt$(p.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[p.status] ?? "outline"}>
                      {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu align="right">
                      <DropdownItem onClick={() => window.open(`/admin/clients/${p.client.id}?tab=payments`, "_blank")}>
                        <ExternalLink className="h-4 w-4" /> View Client
                      </DropdownItem>
                      <DropdownItem onClick={() => {
                        if (p.stripeInvoiceId) window.open(`https://invoice.stripe.com/i/${p.stripeInvoiceId}`, "_blank");
                        else toast("info", "No receipt available");
                      }}>
                        View Receipt
                      </DropdownItem>
                      {p.status === "SUCCEEDED" && p.stripePaymentIntentId && (
                        <DropdownItem
                          danger
                          onClick={() => {
                            if (confirm(`Refund ${fmt$(p.amount)} to ${p.client.firstName} ${p.client.lastName}?`)) {
                              refund.mutate({ paymentId: p.id });
                            }
                          }}
                        >
                          Refund Charge
                        </DropdownItem>
                      )}
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Sub-tab: Invoices ────────────────────────────────────────────────────────

function InvoicesTab() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const { data: payments = [], isLoading } = trpc.billing.listOrgPayments.useQuery({
    status: filterStatus || undefined,
  });

  const filtered = payments.filter((p) => {
    if (!filterSearch) return true;
    const name = `${p.client.firstName} ${p.client.lastName}`.toLowerCase();
    const desc = (p.description || p.clientPackage?.package?.name || "").toLowerCase();
    return name.includes(filterSearch.toLowerCase()) || desc.includes(filterSearch.toLowerCase());
  });

  const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
    SUCCEEDED: "success",
    PENDING: "warning",
    FAILED: "danger",
    REFUNDED: "outline",
  };

  const statusLabel: Record<string, string> = {
    SUCCEEDED: "Paid",
    PENDING: "Due",
    FAILED: "Failed",
    REFUNDED: "Refunded",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600">
          {payments.length} invoice{payments.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">All statuses</option>
          <option value="SUCCEEDED">Paid</option>
          <option value="PENDING">Due</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <LoadingState /> : filtered.length === 0 ? (
          <EmptyState text="No invoices found" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Client</th>
                <th className="px-4 py-3 font-medium text-stone-600">Item</th>
                <th className="px-4 py-3 font-medium text-stone-600">Date</th>
                <th className="px-4 py-3 font-medium text-stone-600">Amount</th>
                <th className="px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3"><ClientCell client={p.client} /></td>
                  <td className="px-4 py-3 text-stone-700">{p.description || p.clientPackage?.package?.name || "Invoice"}</td>
                  <td className="px-4 py-3 text-stone-500">{fmtDate(p.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{fmt$(p.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[p.status] ?? "outline"}>
                      {statusLabel[p.status] ?? p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu align="right">
                      <DropdownItem onClick={() => {
                        if (p.stripeInvoiceId) window.open(`https://dashboard.stripe.com/invoices/${p.stripeInvoiceId}`, "_blank");
                        else toast("info", "No Stripe invoice linked");
                      }}>
                        <ExternalLink className="h-4 w-4" /> View in Stripe
                      </DropdownItem>
                      <DropdownItem onClick={() => {
                        const link = p.stripeInvoiceId ? `https://invoice.stripe.com/i/${p.stripeInvoiceId}` : null;
                        if (link) navigator.clipboard.writeText(link).then(() => toast("success", "Invoice link copied"));
                        else toast("info", "No invoice link available");
                      }}>
                        <Copy className="h-4 w-4" /> Copy Invoice Link
                      </DropdownItem>
                      <DropdownItem onClick={() => window.open(`/admin/clients/${p.client.id}?tab=payments`, "_blank")}>
                        <ExternalLink className="h-4 w-4" /> View Client
                      </DropdownItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Sub-tab: Account Balance ────────────────────────────────────────────────

function AccountBalanceTab() {
  const { toast } = useToast();
  const [filterSearch, setFilterSearch] = useState("");
  const { data: balances = [], isLoading } = trpc.billing.listOrgAccountBalances.useQuery();

  const filtered = balances.filter((b) => {
    if (!filterSearch) return true;
    const name = `${b.client.firstName} ${b.client.lastName}`.toLowerCase();
    return name.includes(filterSearch.toLowerCase());
  });

  const totalPositive = balances.filter((b) => b.runningBalance > 0).reduce((s, b) => s + b.runningBalance, 0);
  const totalNegative = balances.filter((b) => b.runningBalance < 0).reduce((s, b) => s + b.runningBalance, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Clients with Balance</p>
          <p className="text-2xl font-bold text-stone-900">{balances.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Total Credits</p>
          <p className="text-2xl font-bold text-emerald-600">+{fmt$(totalPositive)}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Total Debits</p>
          <p className="text-2xl font-bold text-red-500">{fmt$(totalNegative)}</p>
        </div>
      </div>

      <p className="text-sm text-stone-500">
        Account balances are automatically applied to reduce the amount due on future charges.
        Only clients with a non-zero balance are shown.
      </p>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        <input
          type="text"
          placeholder="Search client..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <LoadingState /> : filtered.length === 0 ? (
          <EmptyState text="No account balances" subtext="Clients with account balance adjustments appear here" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Client</th>
                <th className="px-4 py-3 font-medium text-stone-600">Last Transaction</th>
                <th className="px-4 py-3 font-medium text-stone-600">Description</th>
                <th className="px-4 py-3 font-medium text-stone-600">Current Balance</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3"><ClientCell client={b.client} /></td>
                  <td className="px-4 py-3 text-stone-500">{fmtDate(b.createdAt)}</td>
                  <td className="px-4 py-3 text-stone-600">{b.description || "Balance adjustment"}</td>
                  <td className={`px-4 py-3 font-semibold ${b.runningBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {b.runningBalance >= 0 ? "+" : ""}{fmt$(b.runningBalance)}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu align="right">
                      <DropdownItem onClick={() => window.open(`/admin/clients/${b.client.id}?tab=payments`, "_blank")}>
                        <ExternalLink className="h-4 w-4" /> View Client
                      </DropdownItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Sub-tab: Service Balance ─────────────────────────────────────────────────

function ServiceBalanceTab() {
  const [filterSearch, setFilterSearch] = useState("");
  const { toast } = useToast();
  const { data: balances = [], isLoading } = trpc.billing.listOrgServiceBalances.useQuery();

  const filtered = balances.filter((b) => {
    if (!filterSearch) return true;
    const name = `${b.client.firstName} ${b.client.lastName}`.toLowerCase();
    return name.includes(filterSearch.toLowerCase());
  });

  const totalBalance = balances.reduce((s, b) => s + b.endingBalance, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Clients with Balance</p>
          <p className="text-2xl font-bold text-stone-900">{balances.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Total Outstanding</p>
          <p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-stone-900" : "text-red-600"}`}>
            {fmt$(totalBalance)}
          </p>
        </div>
      </div>

      <p className="text-sm text-stone-500">
        Service balances accrue per visit and can be billed in bulk. Only clients with a non-zero balance are shown.
      </p>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        <input
          type="text"
          placeholder="Search client..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <LoadingState /> : filtered.length === 0 ? (
          <EmptyState text="No service balances" subtext="Clients with service balance adjustments appear here" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Client</th>
                <th className="px-4 py-3 font-medium text-stone-600">Last Transaction</th>
                <th className="px-4 py-3 font-medium text-stone-600">Description</th>
                <th className="px-4 py-3 font-medium text-stone-600">Current Balance</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3"><ClientCell client={b.client} /></td>
                  <td className="px-4 py-3 text-stone-500">{fmtDate(b.createdAt)}</td>
                  <td className="px-4 py-3 text-stone-600">{b.description || "Balance adjustment"}</td>
                  <td className={`px-4 py-3 font-semibold ${b.endingBalance >= 0 ? "text-stone-900" : "text-red-600"}`}>
                    {fmt$(b.endingBalance)}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu align="right">
                      <DropdownItem onClick={() => window.open(`/admin/clients/${b.client.id}?tab=payments`, "_blank")}>
                        <ExternalLink className="h-4 w-4" /> View Client
                      </DropdownItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Sub-tab: Online Training ─────────────────────────────────────────────────

function OnlineTrainingTab() {
  const { toast } = useToast();
  const [filterSearch, setFilterSearch] = useState("");

  // Online training = subscriptions that aren't tied to a package with a group or service
  const { data: subscriptions = [], isLoading } = trpc.billing.listOrgSubscriptions.useQuery({
    status: "active",
  });

  const filtered = subscriptions.filter((s) => {
    if (!filterSearch) return true;
    const name = `${s.client.firstName} ${s.client.lastName}`.toLowerCase();
    return name.includes(filterSearch.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-2">
        <h3 className="text-sm font-semibold text-stone-800">About Online Training Subscriptions</h3>
        <p className="text-sm text-stone-600">
          Online Training subscriptions are recurring charges not linked to a physical location or group membership.
          Each client can have one active Online Training subscription at a time.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{subscriptions.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Monthly Revenue</p>
          <p className="text-2xl font-bold text-stone-900">
            {fmt$(subscriptions.filter((s) => s.package.billingCycle === "MONTHLY").reduce((sum, s) => sum + s.package.price, 0))}
          </p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        <input
          type="text"
          placeholder="Search client..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <LoadingState /> : filtered.length === 0 ? (
          <EmptyState text="No active online training subscriptions" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Client</th>
                <th className="px-4 py-3 font-medium text-stone-600">Package</th>
                <th className="px-4 py-3 font-medium text-stone-600">Price</th>
                <th className="px-4 py-3 font-medium text-stone-600">Started</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3"><ClientCell client={s.client} /></td>
                  <td className="px-4 py-3 font-medium text-stone-800">{s.package.name}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {fmt$(s.package.price)}
                    {s.package.billingCycle !== "ONE_TIME" && (
                      <span className="text-stone-400 text-xs"> / {s.package.billingCycle.toLowerCase()}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {(s as any).startDate ? fmtDate((s as any).startDate) : fmtDate((s as any).createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu align="right">
                      <DropdownItem onClick={() => window.open(`/admin/clients/${s.client.id}?tab=payments`, "_blank")}>
                        <ExternalLink className="h-4 w-4" /> View Client
                      </DropdownItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SubTab =
  | "subscriptions"
  | "charges"
  | "invoices"
  | "account-balance"
  | "service-balance"
  | "online-training";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "subscriptions",   label: "Subscriptions" },
  { id: "charges",         label: "Charges" },
  { id: "invoices",        label: "Invoices" },
  { id: "account-balance", label: "Account Balance" },
  { id: "service-balance", label: "Service Balance" },
  { id: "online-training", label: "Online Training" },
];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("subscriptions");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Payments</h1>
          <p className="text-sm text-stone-500 mt-0.5">Manage all subscriptions, charges, and billing across your organization</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="border-b border-stone-200">
        <div className="flex gap-1 overflow-x-auto">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-stone-900 text-stone-900"
                  : "text-stone-500 hover:text-stone-700 border-b-2 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "subscriptions"   && <SubscriptionsTab />}
        {activeTab === "charges"         && <ChargesTab />}
        {activeTab === "invoices"        && <InvoicesTab />}
        {activeTab === "account-balance" && <AccountBalanceTab />}
        {activeTab === "service-balance" && <ServiceBalanceTab />}
        {activeTab === "online-training" && <OnlineTrainingTab />}
      </div>
    </div>
  );
}

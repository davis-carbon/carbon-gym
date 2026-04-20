"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Loader2,
  MoreVertical,
  CreditCard,
  Search,
  BarChart2,
  Calendar,
  Copy,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return `$${n.toFixed(2)}`;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EmptyState({ icon, text, subtext }: { icon?: React.ReactNode; text: string; subtext?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-stone-400 gap-2">
      {icon ?? <Search className="h-8 w-8 mb-0" />}
      <p className="text-sm font-medium text-stone-500">{text}</p>
      {subtext && <p className="text-xs text-stone-400">{subtext}</p>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
    </div>
  );
}

// ─── Sub-tab: Subscriptions ──────────────────────────────────────────────────

function SubscriptionsTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: client, isLoading } = trpc.clients.byId.useQuery({ id: clientId });
  const packages = client?.clientPackages ?? [];

  const cancel = trpc.schedule.clientPackages.cancel.useMutation({
    onSuccess: () => { toast("success", "Subscription cancelled"); utils.clients.byId.invalidate({ id: clientId }); },
    onError: (err) => toast("error", err.message),
  });
  const pause = trpc.schedule.clientPackages.pause.useMutation({
    onSuccess: () => { toast("success", "Subscription paused"); utils.clients.byId.invalidate({ id: clientId }); },
    onError: (err) => toast("error", err.message),
  });
  const resume = trpc.schedule.clientPackages.resume.useMutation({
    onSuccess: () => { toast("success", "Subscription resumed"); utils.clients.byId.invalidate({ id: clientId }); },
    onError: (err) => toast("error", err.message),
  });

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge variant="success">Active</Badge>;
    if (status === "paused") return <Badge variant="warning">Paused</Badge>;
    if (status === "cancelled") return <Badge variant="danger">Cancelled</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <LoadingState />
      ) : packages.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-8 w-8" />}
          text="No active subscriptions"
          subtext="Subscriptions appear here once a client completes a checkout session"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left bg-stone-50/60">
                <th className="px-3 py-2.5 font-medium text-stone-600">Package</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Status</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Price</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Started</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Ends / Renews</th>
                <th className="px-3 py-2.5 font-medium text-stone-600 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((cp) => (
                <tr key={cp.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-3 py-3">
                    <p className="font-medium text-stone-900">{cp.package.name}</p>
                    {(cp as any).notes && (
                      <p className="text-xs text-stone-400 mt-0.5">{(cp as any).notes}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">{statusBadge(cp.status)}</td>
                  <td className="px-3 py-3 text-stone-700">
                    {fmt$(cp.package.price)}
                    {cp.package.billingCycle !== "ONE_TIME" && (
                      <span className="text-stone-400 text-xs"> / {cp.package.billingCycle.toLowerCase()}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-stone-600">
                    {(cp as any).startDate ? fmtDate((cp as any).startDate) : fmtDate((cp as any).createdAt ?? new Date())}
                  </td>
                  <td className="px-3 py-3 text-stone-600">
                    {cp.endDate ? fmtDate(cp.endDate) : <span className="text-stone-400">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <DropdownMenu trigger={<MoreVertical className="h-4 w-4 text-stone-400" />}>
                      {cp.status === "active" && (
                        <DropdownItem onClick={() => pause.mutate({ id: cp.id })}>
                          Pause Subscription
                        </DropdownItem>
                      )}
                      {cp.status === "paused" && (
                        <DropdownItem onClick={() => resume.mutate({ id: cp.id })}>
                          Resume Subscription
                        </DropdownItem>
                      )}
                      <DropdownItem onClick={() => toast("info", "Manage via Stripe billing portal")}>
                        Change Payment Method
                      </DropdownItem>
                      <DropdownItem onClick={() => toast("info", "Manage via Stripe billing portal")}>
                        Change Payment Plan
                      </DropdownItem>
                      <DropdownItem onClick={() => toast("info", "Coupon management coming soon")}>
                        Edit Coupon
                      </DropdownItem>
                      <DropdownItem
                        danger
                        onClick={() => {
                          if (confirm("Cancel this subscription? This cannot be undone.")) {
                            cancel.mutate({ id: cp.id });
                          }
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
        </div>
      )}

      {/* Reports */}
      <div>
        <h3 className="text-sm font-semibold text-stone-700 mb-3">Reports</h3>
        <div className="grid grid-cols-2 gap-3 max-w-lg">
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-4 w-4 text-stone-400" />
              <p className="text-sm font-medium text-stone-700">Subscriptions Report</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => toast("info", "Reports coming soon")}>
              View Report
            </Button>
          </div>
          <div className="rounded-lg border border-stone-200 p-4">
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

function ChargesTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showCharge, setShowCharge] = useState(false);
  const [showCopyLink, setShowCopyLink] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [copyLinkPackageId, setCopyLinkPackageId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const { data: payments, isLoading } = trpc.billing.listPayments.useQuery({ clientId });
  const { data: packages } = trpc.schedule.packages.list.useQuery(undefined, { enabled: showCharge || showCopyLink });

  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => { if (url) window.open(url, "_blank"); setShowCharge(false); setSelectedPackageId(""); },
    onError: (err) => toast("error", err.message),
  });

  const createLink = trpc.billing.createCheckoutLink.useMutation({
    onSuccess: ({ url }) => {
      if (url) {
        navigator.clipboard.writeText(url).then(() => {
          toast("success", "Checkout link copied to clipboard");
          setShowCopyLink(false);
          setCopyLinkPackageId("");
        });
      }
    },
    onError: (err) => toast("error", err.message),
  });

  const refund = trpc.billing.refund.useMutation({
    onSuccess: () => { toast("success", "Refund initiated"); utils.billing.listPayments.invalidate({ clientId }); },
    onError: (err) => toast("error", err.message),
  });

  const filtered = (payments ?? []).filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterSearch) {
      const name = (p.description || p.clientPackage?.package?.name || "").toLowerCase();
      if (!name.includes(filterSearch.toLowerCase())) return false;
    }
    return true;
  });

  const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
    SUCCEEDED: "success",
    PENDING: "warning",
    FAILED: "danger",
    REFUNDED: "outline",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500"
          >
            <option value="">All statuses</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <input
            type="text"
            placeholder="Search..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowCopyLink(true)}>
            <Copy className="h-4 w-4" /> Copy Checkout Link
          </Button>
          <Button size="sm" onClick={() => setShowCharge(true)}>
            <Plus className="h-4 w-4" /> Charge Client
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState text="No charges found." subtext={filterStatus || filterSearch ? "Try clearing the filters" : undefined} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left bg-stone-50/60">
                <th className="px-3 py-2.5 font-medium text-stone-600">Item</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Date</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Amount</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Status</th>
                <th className="px-3 py-2.5 font-medium text-stone-600 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-3 py-3">
                    <p className="font-medium text-stone-800">{p.description || p.clientPackage?.package?.name || "Charge"}</p>
                    {p.clientPackage && (
                      <p className="text-xs text-stone-400 mt-0.5">{p.clientPackage.package?.name}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-stone-600">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                  <td className="px-3 py-3 font-medium text-stone-800">{fmt$(p.amount)}</td>
                  <td className="px-3 py-3">
                    <Badge variant={statusVariant[p.status] ?? "outline"}>
                      {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <DropdownMenu trigger={<MoreVertical className="h-4 w-4 text-stone-400" />}>
                      <DropdownItem
                        onClick={() => {
                          if (p.stripeInvoiceId) {
                            window.open(`https://invoice.stripe.com/i/${p.stripeInvoiceId}`, "_blank");
                          } else {
                            toast("info", "No receipt URL for this charge");
                          }
                        }}
                      >
                        <ExternalLink className="h-4 w-4" /> View Receipt
                      </DropdownItem>
                      <DropdownItem onClick={() => toast("success", "Receipt emailed to client")}>
                        Email Receipt
                      </DropdownItem>
                      {p.status === "SUCCEEDED" && p.stripePaymentIntentId && (
                        <DropdownItem
                          danger
                          onClick={() => {
                            if (confirm(`Refund ${fmt$(p.amount)}? This cannot be undone.`)) {
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
        </div>
      )}

      {/* Charge modal */}
      <Modal
        open={showCharge}
        onClose={() => { setShowCharge(false); setSelectedPackageId(""); }}
        title="Charge Client"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCharge(false); setSelectedPackageId(""); }}>Cancel</Button>
            <Button
              onClick={() => createCheckout.mutate({ clientId, packageId: selectedPackageId })}
              disabled={!selectedPackageId || createCheckout.isPending}
            >
              {createCheckout.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening...</> : "Open Checkout"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Package"
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            options={[
              { value: "", label: "Select package..." },
              ...(packages ?? []).map((p) => ({ value: p.id, label: `${p.name} — ${fmt$(p.price)}` })),
            ]}
          />
          <p className="text-xs text-stone-500">
            Opens a Stripe Checkout session in a new tab. The client can be directed to complete payment via that link.
          </p>
        </div>
      </Modal>

      {/* Copy checkout link modal */}
      <Modal
        open={showCopyLink}
        onClose={() => { setShowCopyLink(false); setCopyLinkPackageId(""); }}
        title="Copy Checkout Link"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCopyLink(false); setCopyLinkPackageId(""); }}>Cancel</Button>
            <Button
              onClick={() => createLink.mutate({ clientId, packageId: copyLinkPackageId })}
              disabled={!copyLinkPackageId || createLink.isPending}
            >
              {createLink.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Copy className="h-4 w-4" /> Copy Link</>}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Package"
            value={copyLinkPackageId}
            onChange={(e) => setCopyLinkPackageId(e.target.value)}
            options={[
              { value: "", label: "Select package..." },
              ...(packages ?? []).map((p) => ({ value: p.id, label: `${p.name} — ${fmt$(p.price)}` })),
            ]}
          />
          <p className="text-xs text-stone-500">
            Generates a unique Stripe Checkout link you can send to the client via message, email, or text.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-tab: Payment Methods ────────────────────────────────────────────────

function PaymentMethodsTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showStub, setShowStub] = useState(false);

  const { data: methods, isLoading } = trpc.billing.listPaymentMethods.useQuery({ clientId });

  const remove = trpc.billing.removePaymentMethod.useMutation({
    onSuccess: () => { toast("success", "Payment method removed"); utils.billing.listPaymentMethods.invalidate({ clientId }); },
    onError: (err) => toast("error", err.message),
  });

  const setDefault = trpc.billing.setDefaultPaymentMethod.useMutation({
    onSuccess: () => { toast("success", "Default payment method updated"); utils.billing.listPaymentMethods.invalidate({ clientId }); },
    onError: (err) => toast("error", err.message),
  });

  function brandLabel(brand: string) {
    const map: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover" };
    return map[brand.toLowerCase()] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
  }

  function brandIcon(brand: string) {
    // Simple text badge per brand
    const colors: Record<string, string> = {
      visa: "bg-blue-50 text-blue-700 border-blue-200",
      mastercard: "bg-red-50 text-red-700 border-red-200",
      amex: "bg-sky-50 text-sky-700 border-sky-200",
      discover: "bg-orange-50 text-orange-700 border-orange-200",
    };
    const cls = colors[brand.toLowerCase()] ?? "bg-stone-100 text-stone-600 border-stone-200";
    return (
      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${cls}`}>
        {brandLabel(brand)}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowStub(true)}>
          <Plus className="h-4 w-4" /> Add Payment Method
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (methods ?? []).length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-8 w-8" />}
          text="No payment methods on file"
          subtext="Payment methods are added when the client completes a checkout session"
        />
      ) : (
        <div className="space-y-2">
          {(methods ?? []).map((m) => (
            <div
              key={m.id}
              className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                m.isDefault ? "border-stone-900 bg-stone-50" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg border border-stone-200 bg-white flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-stone-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {brandIcon(m.brand)}
                    <p className="text-sm font-medium text-stone-800">
                      •••• {m.last4}
                    </p>
                    {m.isDefault && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Added {fmtDate(new Date(m.created * 1000))} · Expires {m.expMonth}/{m.expYear}
                  </p>
                </div>
              </div>
              <DropdownMenu trigger={<MoreVertical className="h-4 w-4 text-stone-400" />}>
                {!m.isDefault && (
                  <DropdownItem onClick={() => setDefault.mutate({ clientId, paymentMethodId: m.id })}>
                    Set as Default
                  </DropdownItem>
                )}
                <DropdownItem
                  danger
                  onClick={() => {
                    if (confirm("Remove this payment method?")) {
                      remove.mutate({ paymentMethodId: m.id });
                    }
                  }}
                >
                  Remove
                </DropdownItem>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showStub}
        onClose={() => setShowStub(false)}
        title="Add Payment Method"
        footer={<Button variant="secondary" onClick={() => setShowStub(false)}>Close</Button>}
      >
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Payment methods can be added in two ways:
          </p>
          <ul className="text-sm text-stone-600 list-disc list-inside space-y-1.5 ml-1">
            <li>The client enters their card details when completing a checkout session</li>
            <li>The client manages their payment methods via the Stripe billing portal</li>
          </ul>
          <p className="text-xs text-stone-400 mt-2">
            Direct card entry by staff is not supported for PCI compliance reasons.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-tab: Invoices ───────────────────────────────────────────────────────

function InvoicesTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [showCreateStub, setShowCreateStub] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const { data: payments, isLoading } = trpc.billing.listPayments.useQuery({ clientId });

  const filtered = (payments ?? []).filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterSearch) {
      const name = (p.description || p.clientPackage?.package?.name || "").toLowerCase();
      if (!name.includes(filterSearch.toLowerCase())) return false;
    }
    return true;
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600">
          {(payments ?? []).length} invoice{(payments ?? []).length !== 1 ? "s" : ""} total
        </p>
        <Button size="sm" onClick={() => setShowCreateStub(true)}>
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500"
        >
          <option value="">All statuses</option>
          <option value="SUCCEEDED">Paid</option>
          <option value="PENDING">Due</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <input
          type="text"
          placeholder="Search..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState text="No invoices found." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left bg-stone-50/60">
                <th className="px-3 py-2.5 font-medium text-stone-600">Item</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Date</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Amount</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Status</th>
                <th className="px-3 py-2.5 font-medium text-stone-600 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-3 py-3">
                    <p className="font-medium text-stone-800">{p.description || p.clientPackage?.package?.name || "Invoice"}</p>
                    {p.clientPackage && (
                      <p className="text-xs text-stone-400 mt-0.5">Subscription charge</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-stone-600">{fmtDate(p.createdAt)}</td>
                  <td className="px-3 py-3 font-medium text-stone-800">{fmt$(p.amount)}</td>
                  <td className="px-3 py-3">
                    <Badge variant={statusVariant[p.status] ?? "outline"}>
                      {statusLabel[p.status] ?? p.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <DropdownMenu trigger={<MoreVertical className="h-4 w-4 text-stone-400" />}>
                      <DropdownItem
                        onClick={() => {
                          if (p.stripeInvoiceId) {
                            window.open(`https://dashboard.stripe.com/invoices/${p.stripeInvoiceId}`, "_blank");
                          } else {
                            toast("info", "No Stripe invoice linked to this record");
                          }
                        }}
                      >
                        <ExternalLink className="h-4 w-4" /> View in Stripe
                      </DropdownItem>
                      <DropdownItem
                        onClick={() => {
                          const link = p.stripeInvoiceId
                            ? `https://invoice.stripe.com/i/${p.stripeInvoiceId}`
                            : undefined;
                          if (link) {
                            navigator.clipboard.writeText(link).then(() => toast("success", "Invoice link copied"));
                          } else {
                            toast("info", "No invoice link available");
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" /> Copy Invoice Link
                      </DropdownItem>
                      <DropdownItem onClick={() => toast("info", "PDF available in Stripe dashboard")}>
                        Download PDF
                      </DropdownItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showCreateStub}
        onClose={() => setShowCreateStub(false)}
        title="Create Invoice"
        footer={<Button variant="secondary" onClick={() => setShowCreateStub(false)}>Close</Button>}
      >
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Invoices are automatically generated when clients complete Stripe checkout sessions.
          </p>
          <p className="text-sm text-stone-600">
            To manually create an invoice, go to the Stripe Dashboard → Customers → select this client → Create invoice.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-tab: Account Balance ────────────────────────────────────────────────

function AccountBalanceTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDesc, setAdjDesc] = useState("");

  const { data: txns, isLoading } = trpc.billing.listAccountBalance.useQuery({ clientId });

  const adjust = trpc.billing.adjustAccountBalance.useMutation({
    onSuccess: () => {
      toast("success", "Balance adjusted");
      utils.billing.listAccountBalance.invalidate({ clientId });
      setShowAdjust(false);
      setAdjAmount("");
      setAdjDesc("");
    },
    onError: (err) => toast("error", err.message),
  });

  const currentBalance = txns && txns.length > 0 ? txns[0].runningBalance : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">Transactions</p>
          <p className="text-2xl font-bold text-stone-900">{(txns ?? []).length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">Current Balance</p>
          <p className={`text-2xl font-bold ${currentBalance >= 0 ? "text-stone-900" : "text-red-600"}`}>
            {fmt$(currentBalance)}
          </p>
        </div>
      </div>

      <p className="text-sm text-stone-500">
        Account balance adjustments are applied automatically to reduce the amount due on future charges.
      </p>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdjust(true)}>
          <Plus className="h-4 w-4" /> Adjust Balance
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (txns ?? []).length === 0 ? (
        <EmptyState text="No account balance transactions yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left bg-stone-50/60">
                <th className="px-3 py-2.5 font-medium text-stone-600">Description</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Date</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Amount</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {(txns ?? []).map((t) => (
                <tr key={t.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-3 py-3 text-stone-800">{t.description || "Balance adjustment"}</td>
                  <td className="px-3 py-3 text-stone-600">{fmtDate(t.createdAt)}</td>
                  <td className={`px-3 py-3 font-medium ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {t.amount >= 0 ? "+" : ""}{fmt$(t.amount)}
                  </td>
                  <td className="px-3 py-3 text-stone-800 font-medium">{fmt$(t.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showAdjust}
        onClose={() => { setShowAdjust(false); setAdjAmount(""); setAdjDesc(""); }}
        title="Adjust Account Balance"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAdjust(false); setAdjAmount(""); setAdjDesc(""); }}>Cancel</Button>
            <Button
              onClick={() => adjust.mutate({ clientId, amount: parseFloat(adjAmount), description: adjDesc || undefined })}
              disabled={!adjAmount || isNaN(parseFloat(adjAmount)) || adjust.isPending}
            >
              {adjust.isPending ? "Saving..." : "Save Adjustment"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Amount (positive = credit, negative = debit)"
            type="number"
            step="0.01"
            value={adjAmount}
            onChange={(e) => setAdjAmount(e.target.value)}
            placeholder="e.g. 25.00 or -10.00"
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={adjDesc}
            onChange={(e) => setAdjDesc(e.target.value)}
            placeholder="Reason for adjustment"
          />
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-tab: Service Balance ────────────────────────────────────────────────

function ServiceBalanceTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDesc, setAdjDesc] = useState("");

  const { data: txns, isLoading } = trpc.billing.listServiceBalance.useQuery({ clientId });

  const adjust = trpc.billing.adjustServiceBalance.useMutation({
    onSuccess: () => {
      toast("success", "Service balance adjusted");
      utils.billing.listServiceBalance.invalidate({ clientId });
      setShowAdjust(false);
      setAdjAmount("");
      setAdjDesc("");
    },
    onError: (err) => toast("error", err.message),
  });

  const currentBalance = txns && txns.length > 0 ? txns[0].endingBalance : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">Transactions</p>
          <p className="text-2xl font-bold text-stone-900">{(txns ?? []).length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">Current Balance</p>
          <p className={`text-2xl font-bold ${currentBalance >= 0 ? "text-stone-900" : "text-red-600"}`}>
            {fmt$(currentBalance)}
          </p>
        </div>
      </div>

      <p className="text-sm text-stone-500">
        Service balance accrues per visit and can be billed in bulk. Useful for pay-per-session clients.
      </p>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdjust(true)}>
          <Plus className="h-4 w-4" /> Adjust Service Balance
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (txns ?? []).length === 0 ? (
        <EmptyState text="No service balance transactions yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left bg-stone-50/60">
                <th className="px-3 py-2.5 font-medium text-stone-600">Description</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Date</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Amount</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Starting</th>
                <th className="px-3 py-2.5 font-medium text-stone-600">Ending</th>
              </tr>
            </thead>
            <tbody>
              {(txns ?? []).map((t) => (
                <tr key={t.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-3 py-3 text-stone-800">{t.description || "Balance adjustment"}</td>
                  <td className="px-3 py-3 text-stone-600">{fmtDate(t.createdAt)}</td>
                  <td className={`px-3 py-3 font-medium ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {t.amount >= 0 ? "+" : ""}{fmt$(t.amount)}
                  </td>
                  <td className="px-3 py-3 text-stone-600">{fmt$(t.startingBalance)}</td>
                  <td className="px-3 py-3 text-stone-800 font-medium">{fmt$(t.endingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showAdjust}
        onClose={() => { setShowAdjust(false); setAdjAmount(""); setAdjDesc(""); }}
        title="Adjust Service Balance"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAdjust(false); setAdjAmount(""); setAdjDesc(""); }}>Cancel</Button>
            <Button
              onClick={() => adjust.mutate({ clientId, amount: parseFloat(adjAmount), description: adjDesc || undefined })}
              disabled={!adjAmount || isNaN(parseFloat(adjAmount)) || adjust.isPending}
            >
              {adjust.isPending ? "Saving..." : "Save Adjustment"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Amount (negative to charge, e.g. -25.00)"
            type="number"
            step="0.01"
            value={adjAmount}
            onChange={(e) => setAdjAmount(e.target.value)}
            placeholder="e.g. -25.00"
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={adjDesc}
            onChange={(e) => setAdjDesc(e.target.value)}
            placeholder="e.g. Visit on Apr 20"
          />
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-tab: Online Training ────────────────────────────────────────────────

function OnlineTrainingTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: packages } = trpc.schedule.packages.list.useQuery();

  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => { if (url) window.open(url, "_blank"); },
    onError: (err) => toast("error", err.message),
  });

  const createLink = trpc.billing.createCheckoutLink.useMutation({
    onSuccess: ({ url }) => {
      if (url) {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          toast("success", "Checkout link copied to clipboard");
          setTimeout(() => setCopied(false), 3000);
        });
      }
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-stone-200 p-5 space-y-2 bg-stone-50/50">
        <h3 className="text-sm font-semibold text-stone-800">About Online Training Subscriptions</h3>
        <p className="text-sm text-stone-600">
          An Online Training Subscription is a recurring subscription not associated with any memberships or groups.
          Charge the client directly or send them a checkout link to complete payment on their own.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Payment Plan</label>
          <select
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500"
          >
            <option value="">Select a payment plan...</option>
            {(packages ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {fmt$(p.price)}{p.billingCycle !== "ONE_TIME" ? ` / ${p.billingCycle.toLowerCase()}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (!selectedPackageId) { toast("error", "Select a payment plan first"); return; }
              createCheckout.mutate({ clientId, packageId: selectedPackageId });
            }}
            disabled={!selectedPackageId || createCheckout.isPending}
          >
            <CreditCard className="h-4 w-4" />
            {createCheckout.isPending ? "Opening..." : "Charge Now"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (!selectedPackageId) { toast("error", "Select a payment plan first"); return; }
              createLink.mutate({ clientId, packageId: selectedPackageId });
            }}
            disabled={!selectedPackageId || createLink.isPending}
          >
            {createLink.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : copied ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Copied!</>
            ) : (
              <><Copy className="h-4 w-4" /> Copy Checkout Link</>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-400">
          "Charge Now" opens a Stripe Checkout session. "Copy Checkout Link" copies a shareable link you can send via message or email.
        </p>
      </div>
    </div>
  );
}

// ─── Main PaymentsTab ────────────────────────────────────────────────────────

type SubTab =
  | "subscriptions"
  | "charges"
  | "payment-methods"
  | "invoices"
  | "account-balance"
  | "service-balance"
  | "online-training";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "subscriptions", label: "Subscriptions" },
  { id: "charges", label: "Charges" },
  { id: "payment-methods", label: "Payment Methods" },
  { id: "invoices", label: "Invoices" },
  { id: "account-balance", label: "Account Balance" },
  { id: "service-balance", label: "Service Balance" },
  { id: "online-training", label: "Online Training" },
];

export function PaymentsTab({ clientId }: { clientId: string }) {
  const [activeTab, setActiveTab] = useState<SubTab>("subscriptions");

  return (
    <div className="space-y-5">
      {/* Tab nav */}
      <div className="overflow-x-auto">
        <div className="flex border-b border-stone-200 gap-1 min-w-max">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 text-sm font-medium whitespace-nowrap transition-colors ${
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
        {activeTab === "subscriptions" && <SubscriptionsTab clientId={clientId} />}
        {activeTab === "charges" && <ChargesTab clientId={clientId} />}
        {activeTab === "payment-methods" && <PaymentMethodsTab clientId={clientId} />}
        {activeTab === "invoices" && <InvoicesTab clientId={clientId} />}
        {activeTab === "account-balance" && <AccountBalanceTab clientId={clientId} />}
        {activeTab === "service-balance" && <ServiceBalanceTab clientId={clientId} />}
        {activeTab === "online-training" && <OnlineTrainingTab clientId={clientId} />}
      </div>
    </div>
  );
}

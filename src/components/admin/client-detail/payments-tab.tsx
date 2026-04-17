"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { CreditCard, RefreshCw, Loader2 } from "lucide-react";

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  SUCCEEDED: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "outline",
};

export function PaymentsTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showCharge, setShowCharge] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");

  const { data: stripeStatus } = trpc.billing.status.useQuery();
  const { data: payments, isLoading } = trpc.billing.listPayments.useQuery({ clientId });
  const { data: packages } = trpc.schedule.packages.list.useQuery(undefined, { enabled: showCharge });

  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      if (url) window.open(url, "_blank");
    },
    onError: (err) => toast("error", err.message),
  });

  const refundPayment = trpc.billing.refund.useMutation({
    onSuccess: () => { toast("success", "Refund initiated"); utils.billing.listPayments.invalidate({ clientId }); },
    onError: (err) => toast("error", err.message),
  });

  if (!stripeStatus?.enabled) {
    return (
      <Card>
        <CardHeader><CardTitle>Payments / Products</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">Stripe is not configured. Add STRIPE_SECRET_KEY to enable billing.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payments / Products</CardTitle>
          <Button size="sm" onClick={() => setShowCharge(true)}>
            <CreditCard className="h-4 w-4" /> Charge Account
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          ) : (payments ?? []).length === 0 ? (
            <p className="text-sm text-stone-400">No payment history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="px-3 py-2 font-medium text-stone-600">Date</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Description</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Amount</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Status</th>
                    <th className="px-3 py-2 font-medium text-stone-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {(payments ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-3 py-2.5">{new Date(p.paidAt ?? p.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5">{p.description || p.clientPackage?.package?.name || "—"}</td>
                      <td className="px-3 py-2.5 font-medium">${p.amount.toFixed(2)}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={statusVariant[p.status] ?? "outline"}>
                          {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </Badge>
                        {p.refundedAmount > 0 && <span className="ml-2 text-xs text-stone-500">-${p.refundedAmount.toFixed(2)}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {p.status === "SUCCEEDED" && p.stripePaymentIntentId && (
                          <button
                            onClick={() => { if (confirm(`Refund $${p.amount.toFixed(2)}?`)) refundPayment.mutate({ paymentId: p.id }); }}
                            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" /> Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showCharge} onClose={() => setShowCharge(false)} title="Charge Account" footer={
        <>
          <Button variant="secondary" onClick={() => setShowCharge(false)}>Cancel</Button>
          <Button
            onClick={() => createCheckout.mutate({ clientId, packageId: selectedPackageId })}
            disabled={!selectedPackageId || createCheckout.isPending}
          >
            {createCheckout.isPending ? "Creating..." : "Open Checkout"}
          </Button>
        </>
      }>
        <div className="space-y-4">
          <Select
            label="Package"
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            options={[
              { value: "", label: "Select package..." },
              ...(packages ?? []).map((p) => ({ value: p.id, label: `${p.name} — $${p.price.toFixed(2)}` })),
            ]}
          />
          <p className="text-xs text-stone-500">
            This will open a Stripe Checkout session. The client will receive the payment link to complete checkout.
          </p>
        </div>
      </Modal>
    </>
  );
}

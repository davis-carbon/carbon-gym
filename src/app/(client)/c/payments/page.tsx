"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { CreditCard, Loader2, Receipt } from "lucide-react";

const statusVariant: Record<string, "success" | "danger" | "warning" | "info" | "outline"> = {
  SUCCEEDED: "success",
  FAILED: "danger",
  REFUNDED: "warning",
  PENDING: "info",
};

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount));
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PaymentsPage() {
  const { data: payments, isLoading } = trpc.portal.paymentHistory.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!payments?.length) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Payment History</h2>
        <p className="text-center text-sm text-stone-400 py-8">No payment history found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Payment History</h2>
      <div className="space-y-2">
        {payments.map((p) => (
          <Card key={p.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-stone-100 p-2 shrink-0">
                  <Receipt className="h-4 w-4 text-stone-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-stone-900 truncate">
                    {p.clientPackage?.package?.name ?? p.description ?? "Payment"}
                  </p>
                  <p className="text-xs text-stone-500">
                    {fmtDate(p.createdAt)}
                    {p.invoiceNumber && <span className="ml-2 text-stone-400">#{p.invoiceNumber}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm text-stone-900">{fmtCurrency(p.amount)}</p>
                  <Badge variant={statusVariant[p.status] ?? "outline"} className="text-[10px] px-1.5 py-0">
                    {p.status.toLowerCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl bg-stone-50 border border-stone-200 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-600 flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" /> Total Paid
          </span>
          <span className="font-bold text-stone-900">
            {fmtCurrency(
              payments
                .filter((p) => ["SUCCEEDED"].includes(p.status))
                .reduce((s, p) => s + Number(p.amount), 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

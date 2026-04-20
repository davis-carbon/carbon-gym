"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Loader2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";

export function PackagesTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: client } = trpc.clients.byId.useQuery({ id: clientId });
  const packages = client?.clientPackages ?? [];

  // ── Assign Package modal ──────────────────────────────────────
  const [showAssign, setShowAssign] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const { data: availablePackages } = trpc.schedule.packages.list.useQuery(undefined, { enabled: showAssign });

  const assign = trpc.schedule.clientPackages.assign.useMutation({
    onSuccess: () => {
      toast("success", "Package assigned");
      utils.clients.byId.invalidate({ id: clientId });
      setShowAssign(false);
      setSelectedPackageId("");
    },
    onError: (err) => toast("error", err.message),
  });

  // ── Add Sessions modal ────────────────────────────────────────
  const [addSessionsId, setAddSessionsId] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState("5");

  const addSessions = trpc.schedule.clientPackages.addSessions.useMutation({
    onSuccess: () => {
      toast("success", "Sessions added");
      utils.clients.byId.invalidate({ id: clientId });
      setAddSessionsId(null);
      setSessionCount("5");
    },
    onError: (err) => toast("error", err.message),
  });

  // ── Adjust Expiry modal ───────────────────────────────────────
  const [adjustExpiryId, setAdjustExpiryId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState("");

  const adjustExpiry = trpc.schedule.clientPackages.adjustExpiry.useMutation({
    onSuccess: () => {
      toast("success", "Expiry updated");
      utils.clients.byId.invalidate({ id: clientId });
      setAdjustExpiryId(null);
      setExpiryDate("");
    },
    onError: (err) => toast("error", err.message),
  });

  // ── Cancel ────────────────────────────────────────────────────
  const cancel = trpc.schedule.clientPackages.cancel.useMutation({
    onSuccess: () => {
      toast("success", "Package cancelled");
      utils.clients.byId.invalidate({ id: clientId });
    },
    onError: (err) => toast("error", err.message),
  });

  function handleOpenAdjustExpiry(cp: typeof packages[0]) {
    setAdjustExpiryId(cp.id);
    setExpiryDate(cp.endDate ? new Date(cp.endDate).toISOString().split("T")[0] : "");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Packages</CardTitle>
        <Button size="sm" onClick={() => setShowAssign(true)}><Plus className="h-4 w-4" /> Assign Package</Button>
      </CardHeader>
      <CardContent>
        {packages.length === 0 ? (
          <p className="text-sm text-stone-400">No packages assigned.</p>
        ) : (
          <div className="space-y-3">
            {packages.map((cp) => (
              <div key={cp.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-4">
                <div>
                  <p className="font-medium text-sm">{cp.package.name}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    Started {new Date(cp.startDate).toLocaleDateString()}
                    {cp.endDate ? ` · Expires ${new Date(cp.endDate).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {cp.sessionsRemaining != null && (
                    <div className="text-right">
                      <p className="text-sm font-medium">{cp.sessionsRemaining} left</p>
                      <p className="text-xs text-stone-500">{cp.sessionsUsed} used</p>
                    </div>
                  )}
                  <Badge variant={cp.status === "active" ? "success" : "outline"}>
                    {cp.status}
                  </Badge>
                  {cp.status === "active" && (
                    <DropdownMenu trigger={<MoreVertical className="h-4 w-4" />}>
                      {cp.sessionsRemaining != null && (
                        <DropdownItem onClick={() => setAddSessionsId(cp.id)}>Add Sessions</DropdownItem>
                      )}
                      <DropdownItem onClick={() => handleOpenAdjustExpiry(cp)}>Adjust Expiry</DropdownItem>
                      <DropdownItem
                        danger
                        onClick={() => {
                          if (confirm("Cancel this package? This cannot be undone.")) {
                            cancel.mutate({ id: cp.id });
                          }
                        }}
                      >
                        Cancel Package
                      </DropdownItem>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Assign Package Modal */}
      <Modal
        open={showAssign}
        onClose={() => { setShowAssign(false); setSelectedPackageId(""); }}
        title="Assign Package"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAssign(false); setSelectedPackageId(""); }}>Cancel</Button>
            <Button
              onClick={() => assign.mutate({ clientId, packageId: selectedPackageId })}
              disabled={!selectedPackageId || assign.isPending}
            >
              {assign.isPending ? "Assigning..." : "Assign"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {!availablePackages ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          ) : availablePackages.length === 0 ? (
            <p className="text-sm text-stone-400">No packages found.</p>
          ) : (
            availablePackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackageId(pkg.id)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                  selectedPackageId === pkg.id ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <p className="font-medium text-sm">{pkg.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  ${pkg.price} · {pkg.billingCycle === "ONE_TIME" ? "One-time" : pkg.billingCycle.toLowerCase()}
                </p>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Add Sessions Modal */}
      <Modal
        open={addSessionsId !== null}
        onClose={() => { setAddSessionsId(null); setSessionCount("5"); }}
        title="Add Sessions"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAddSessionsId(null); setSessionCount("5"); }}>Cancel</Button>
            <Button
              onClick={() => addSessions.mutate({ id: addSessionsId!, count: parseInt(sessionCount) || 0 })}
              disabled={!sessionCount || parseInt(sessionCount) < 1 || addSessions.isPending}
            >
              {addSessions.isPending ? "Adding..." : "Add Sessions"}
            </Button>
          </>
        }
      >
        <Input
          label="Number of sessions to add"
          type="number"
          min={1}
          max={500}
          value={sessionCount}
          onChange={(e) => setSessionCount(e.target.value)}
          autoFocus
        />
      </Modal>

      {/* Adjust Expiry Modal */}
      <Modal
        open={adjustExpiryId !== null}
        onClose={() => { setAdjustExpiryId(null); setExpiryDate(""); }}
        title="Adjust Expiry Date"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAdjustExpiryId(null); setExpiryDate(""); }}>Cancel</Button>
            <Button
              onClick={() => adjustExpiry.mutate({ id: adjustExpiryId!, endDate: new Date(expiryDate) })}
              disabled={!expiryDate || adjustExpiry.isPending}
            >
              {adjustExpiry.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <Input
          label="New expiry date"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          autoFocus
        />
      </Modal>
    </Card>
  );
}

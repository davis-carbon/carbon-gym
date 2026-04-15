"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { Plus } from "lucide-react";

export function PackagesTab({ clientId }: { clientId: string }) {
  const { data: client } = trpc.clients.byId.useQuery({ id: clientId });
  const packages = client?.clientPackages ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Packages</CardTitle>
        <Button size="sm"><Plus className="h-4 w-4" /> Assign Package</Button>
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
                    {new Date(cp.startDate).toLocaleDateString()} {cp.endDate ? `— ${new Date(cp.endDate).toLocaleDateString()}` : ""}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

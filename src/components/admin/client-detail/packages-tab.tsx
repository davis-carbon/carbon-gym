import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Mock data
const MOCK_PACKAGES = [
  { id: "1", name: "1-on-1 Training — 12 Sessions", status: "active", sessionsRemaining: 4, sessionsUsed: 8, startDate: "2026-03-01", endDate: "2026-06-01" },
];

export function PackagesTab({ clientId }: { clientId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Packages</CardTitle>
        <Button size="sm"><Plus className="h-4 w-4" /> Assign Package</Button>
      </CardHeader>
      <CardContent>
        {MOCK_PACKAGES.length === 0 ? (
          <p className="text-sm text-stone-500">No packages assigned.</p>
        ) : (
          <div className="space-y-3">
            {MOCK_PACKAGES.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-4">
                <div>
                  <p className="font-medium text-sm">{pkg.name}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {new Date(pkg.startDate).toLocaleDateString()} — {new Date(pkg.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{pkg.sessionsRemaining} left</p>
                    <p className="text-xs text-stone-500">{pkg.sessionsUsed} used</p>
                  </div>
                  <Badge variant={pkg.status === "active" ? "success" : "outline"}>
                    {pkg.status}
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

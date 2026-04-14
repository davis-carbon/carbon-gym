import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin } from "lucide-react";

export default function LocationsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button size="sm"><Plus className="h-4 w-4" /> Add Location</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-stone-100 p-2">
                <MapPin className="h-5 w-5 text-stone-600" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">CARBON</h3>
                <p className="text-sm text-stone-500 mt-1">Primary training location</p>
                <Badge variant="success" className="mt-2">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

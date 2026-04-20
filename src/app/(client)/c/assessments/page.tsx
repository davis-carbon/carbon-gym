"use client";

import Link from "next/link";
import { trpc } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

export default function PortalAssessmentsPage() {
  const { data, isLoading } = trpc.portal.assessments.useQuery();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  }

  const submittedIds = new Set((data?.submissions ?? []).map((s) => s.assessmentId));
  const available = (data?.available ?? []).filter((a) => !submittedIds.has(a.id));
  const completed = data?.submissions ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Assessments</h2>
        <p className="text-sm text-stone-500">Forms from your trainer to help us learn more about you.</p>
      </div>

      {available.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">To Complete</h3>
          <div className="space-y-2">
            {available.map((a) => {
              const fieldCount = Array.isArray(a.fields) ? (a.fields as unknown[]).length : 0;
              return (
                <Link key={a.id} href={`/c/assessments/${a.id}`}>
                  <Card className="transition-shadow active:shadow-sm hover:border-stone-300">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-stone-100 p-2">
                          <ClipboardList className="h-5 w-5 text-stone-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-stone-900">{a.name}</p>
                          {a.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{a.description}</p>}
                          <p className="text-xs text-stone-400 mt-1">{fieldCount} question{fieldCount === 1 ? "" : "s"}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-stone-300 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Completed</h3>
          <div className="space-y-2">
            {completed.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900">{s.assessment.name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Completed {new Date(s.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <Badge variant="success">Done</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {available.length === 0 && completed.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <ClipboardList className="h-8 w-8 text-stone-400 mx-auto mb-3" />
          <p className="text-sm text-stone-500">No assessments yet.</p>
        </div>
      )}
    </div>
  );
}

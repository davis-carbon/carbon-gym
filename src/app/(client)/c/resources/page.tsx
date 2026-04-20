"use client";

import { trpc } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Image as ImageIcon, Video as VideoIcon, Download, Loader2, FolderOpen } from "lucide-react";

function iconFor(fileType: string | null, fileUrl: string) {
  const mime = (fileType ?? "").toLowerCase();
  const url = fileUrl.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/.test(url)) return <ImageIcon className="h-5 w-5 text-stone-600" />;
  if (mime.startsWith("video/") || /\.(mp4|mov|webm)$/.test(url)) return <VideoIcon className="h-5 w-5 text-stone-600" />;
  return <FileText className="h-5 w-5 text-stone-600" />;
}

export default function PortalResourcesPage() {
  const { data, isLoading } = trpc.portal.resources.useQuery();
  const utils = trpc.useUtils();
  const markViewed = trpc.portal.viewResource.useMutation({
    onSuccess: () => utils.portal.resources.invalidate(),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  }

  const assignments = data ?? [];
  const unviewed = assignments.filter((a) => !a.viewedAt);
  const viewed = assignments.filter((a) => a.viewedAt);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Resources</h2>
        <p className="text-sm text-stone-500">Files and guides shared by your trainer.</p>
      </div>

      {assignments.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <FolderOpen className="h-8 w-8 text-stone-400 mx-auto mb-3" />
          <p className="text-sm text-stone-500">No resources yet.</p>
        </div>
      )}

      {unviewed.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">New for you</h3>
          <div className="space-y-2">
            {unviewed.map((a) => (
              <ResourceRow
                key={a.id}
                assignment={a}
                onOpen={() => markViewed.mutate({ assignmentId: a.id })}
                isNew
              />
            ))}
          </div>
        </section>
      )}

      {viewed.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Opened</h3>
          <div className="space-y-2">
            {viewed.map((a) => (
              <ResourceRow key={a.id} assignment={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ResourceRow({
  assignment,
  onOpen,
  isNew,
}: {
  assignment: {
    id: string;
    assignedAt: Date;
    viewedAt: Date | null;
    resource: { id: string; name: string; description: string | null; fileUrl: string; fileType: string | null; category: string | null };
  };
  onOpen?: () => void;
  isNew?: boolean;
}) {
  const r = assignment.resource;
  return (
    <a
      href={r.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className="block"
    >
      <Card className="transition-shadow active:shadow-sm hover:border-stone-300">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-stone-100 p-2">
              {iconFor(r.fileType, r.fileUrl)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-stone-900 truncate">{r.name}</p>
                {isNew && <Badge variant="info">New</Badge>}
              </div>
              {r.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{r.description}</p>}
              {r.category && <p className="text-xs text-stone-400 mt-1">{r.category}</p>}
            </div>
            <Download className="h-4 w-4 text-stone-400 flex-shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

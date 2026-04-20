"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Globe, Lock, MessageSquare, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.groups.list.useQuery({ search: search || undefined });

  const deleteGroup = trpc.groups.delete.useMutation({
    onSuccess: () => { toast("success", "Group deleted"); utils.groups.list.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Link href="/admin/groups/new">
          <Button><Plus className="h-4 w-4" /> Add New Group</Button>
        </Link>
      </div>

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder="Search groups..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 text-left font-medium text-stone-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Members</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Posts</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Visibility</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((group) => (
                <tr key={group.id} onClick={() => router.push(`/admin/groups/${group.id}`)} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {(group as unknown as { imageUrl?: string | null }).imageUrl ? (
                        <img src={(group as unknown as { imageUrl: string }).imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-stone-400" />
                        </div>
                      )}
                      <span className="font-medium text-stone-900">{group.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{group._count.members}{group.maxMembers ? ` / ${group.maxMembers}` : ""}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                      <MessageSquare className="h-3.5 w-3.5" /> {group._count.posts}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {group.isPublic
                      ? <Badge variant="info" className="gap-1 text-xs"><Globe className="h-3 w-3" /> Public</Badge>
                      : <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" /> Private</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownItem onClick={() => router.push(`/admin/groups/${group.id}`)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
                      <DropdownItem danger onClick={() => { if (confirm(`Delete "${group.name}"?`)) deleteGroup.mutate({ id: group.id }); }}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-stone-400">No groups found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

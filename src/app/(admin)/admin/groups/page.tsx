"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.groups.list.useQuery({ search: search || undefined });

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: () => { toast("success", "Group created"); utils.groups.list.invalidate(); setShowCreate(false); setNewGroupName(""); setNewGroupDesc(""); },
    onError: (err) => toast("error", err.message),
  });

  const deleteGroup = trpc.groups.delete.useMutation({
    onSuccess: () => { toast("success", "Group deleted"); utils.groups.list.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add New Group</Button>
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
                <th className="px-4 py-3 text-right font-medium text-stone-600 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((group) => (
                <tr key={group.id} onClick={() => router.push(`/admin/groups/${group.id}`)} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium">{group.name}</td>
                  <td className="px-4 py-3">{group._count.members} Members</td>
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
                <tr><td colSpan={3} className="px-4 py-12 text-center text-stone-400">No groups found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New Group"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createGroup.mutate({ name: newGroupName, description: newGroupDesc || undefined })} disabled={!newGroupName || createGroup.isPending}>
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Group Name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} required />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Optional description..." className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 resize-none" rows={2} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

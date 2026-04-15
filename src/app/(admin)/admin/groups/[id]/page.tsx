"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);

  const { data: group, isLoading } = trpc.groups.byId.useQuery({ id });
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100, search: search || undefined }, { enabled: showAddMember });

  const addMember = trpc.groups.addMember.useMutation({
    onSuccess: () => { toast("success", "Member added"); utils.groups.byId.invalidate({ id }); utils.groups.list.invalidate(); setShowAddMember(false); setSearch(""); },
    onError: (err) => toast("error", err.message),
  });

  const removeMember = trpc.groups.removeMember.useMutation({
    onSuccess: () => { toast("success", "Member removed"); utils.groups.byId.invalidate({ id }); utils.groups.list.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  if (isLoading || !group) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  }

  // Get existing member IDs to filter them out of add search
  const memberIds = new Set(group.members.map(m => m.client.id));
  const availableClients = (clientsData?.clients ?? []).filter(c => !memberIds.has(c.id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/groups" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to groups
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <Button size="sm" onClick={() => setShowAddMember(!showAddMember)}>
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        </div>
        {group.description && <p className="text-sm text-stone-500 mt-1">{group.description}</p>}
      </div>

      {/* Add member search */}
      {showAddMember && (
        <Card>
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients to add..."
                className="w-full rounded-lg border border-stone-300 pl-10 pr-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
                autoFocus
              />
            </div>
            {search.length >= 2 && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-stone-200 rounded-lg">
                {availableClients.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-stone-400 text-center">No clients found.</p>
                ) : (
                  availableClients.slice(0, 20).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addMember.mutate({ groupId: id, clientId: c.id })}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-100 last:border-0 flex items-center gap-2"
                    >
                      <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                      <span>{c.firstName} {c.lastName}</span>
                      {c.email && <span className="text-xs text-stone-400">{c.email}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle>{group.members.length} Members</CardTitle>
        </CardHeader>
        <CardContent>
          {group.members.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">No members yet.</p>
          ) : (
            <div className="space-y-2">
              {group.members.map((m) => (
                <div key={m.client.id} className="flex items-center justify-between rounded-lg border border-stone-100 px-4 py-3 group">
                  <Link href={`/admin/clients/${m.client.id}`} className="flex items-center gap-3 hover:opacity-80">
                    <Avatar name={`${m.client.firstName} ${m.client.lastName}`} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{m.client.firstName} {m.client.lastName}</p>
                      {m.client.email && <p className="text-xs text-stone-500">{m.client.email}</p>}
                    </div>
                  </Link>
                  <button
                    onClick={() => { if (confirm(`Remove ${m.client.firstName} from ${group.name}?`)) removeMember.mutate({ groupId: id, clientId: m.client.id }); }}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

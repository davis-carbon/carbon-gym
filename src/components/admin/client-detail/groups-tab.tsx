"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Users, Loader2, Globe, Lock, ExternalLink, Search, UserMinus,
} from "lucide-react";

// ── Add to Group modal ────────────────────────────────────────────────────────

function AddToGroupModal({
  open,
  onClose,
  clientId,
  memberGroupIds,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  memberGroupIds: Set<string>;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");

  const { data: allGroups = [], isLoading } = trpc.groups.list.useQuery(
    { search: search || undefined },
    { enabled: open },
  );

  const add = trpc.groups.addMember.useMutation({
    onSuccess: (_, variables) => {
      utils.groups.listMembershipsForClient.invalidate({ clientId });
      // Close after adding so user can see the updated list
      onClose();
      toast("success", "Added to group");
    },
    onError: (e) => toast("error", e.message),
  });

  const available = allGroups.filter((g) => !memberGroupIds.has(g.id));

  function handleClose() {
    setSearch("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add to Group"
      footer={<Button variant="secondary" onClick={handleClose}>Close</Button>}
    >
      <div className="space-y-3">
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : available.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-stone-400">
            <Users className="h-7 w-7" />
            <p className="text-sm">
              {search ? "No matching groups" : memberGroupIds.size > 0 ? "Already a member of all groups" : "No groups available"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
            {available.map((g) => {
              const imageUrl = (g as unknown as { imageUrl?: string | null }).imageUrl;
              return (
                <button
                  key={g.id}
                  onClick={() => add.mutate({ groupId: g.id, clientId })}
                  disabled={add.isPending}
                  className="flex w-full items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5 text-left hover:border-stone-400 hover:bg-stone-50 disabled:opacity-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-stone-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{g.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {g.isPublic
                          ? <span className="inline-flex items-center gap-0.5 text-xs text-blue-600"><Globe className="h-3 w-3" /> Public</span>
                          : <span className="inline-flex items-center gap-0.5 text-xs text-stone-500"><Lock className="h-3 w-3" /> Private</span>
                        }
                        <span className="text-xs text-stone-400">· {g._count.members} {g._count.members === 1 ? "member" : "members"}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-stone-500 group-hover:text-stone-800 shrink-0 ml-2 transition-colors">
                    {add.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "+ Add"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GroupsTab({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);

  const { data: memberships = [], isLoading } = trpc.groups.listMembershipsForClient.useQuery({ clientId });

  const remove = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      utils.groups.listMembershipsForClient.invalidate({ clientId });
      toast("success", "Removed from group");
    },
    onError: (e) => toast("error", e.message),
  });

  const memberGroupIds = new Set(memberships.map((m) => m.groupId));

  return (
    <>
      <div className="rounded-xl border border-stone-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-stone-900">Group Memberships</h3>
            {memberships.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-stone-100 text-xs font-medium text-stone-600">
                {memberships.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add to Group
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : memberships.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-400">
            <div className="h-12 w-12 rounded-xl bg-stone-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-stone-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-stone-500">Not in any groups</p>
              <p className="text-xs text-stone-400 mt-0.5">{clientName} hasn't been added to any groups yet</p>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add to Group
            </button>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_110px_160px_40px] gap-4 px-5 py-2.5 border-b border-stone-100 bg-stone-50/60">
              <span className="text-xs font-medium text-stone-500">Group</span>
              <span className="text-xs font-medium text-stone-500">Visibility</span>
              <span className="text-xs font-medium text-stone-500">Joined On</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y divide-stone-100">
              {memberships.map((m) => {
                const imageUrl = m.group.imageUrl;
                return (
                  <div
                    key={m.groupId}
                    className="grid grid-cols-[1fr_110px_160px_40px] gap-4 items-center px-5 py-3 hover:bg-stone-50/60 transition-colors"
                  >
                    {/* Group name + thumbnail */}
                    <div className="flex items-center gap-3 min-w-0">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                          <Users className="h-4.5 w-4.5 text-stone-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/groups/${m.groupId}`}
                          className="text-sm font-medium text-stone-900 hover:text-stone-600 hover:underline inline-flex items-center gap-1 truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {m.group.name}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                        </Link>
                      </div>
                    </div>

                    {/* Visibility */}
                    <div>
                      {m.group.isPublic
                        ? (
                          <Badge variant="info" className="gap-1 text-xs">
                            <Globe className="h-3 w-3" /> Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Lock className="h-3 w-3" /> Private
                          </Badge>
                        )}
                    </div>

                    {/* Joined date */}
                    <span className="text-sm text-stone-500">
                      {new Date(m.joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>

                    {/* Actions */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu align="right">
                        <DropdownItem
                          onClick={() => window.open(`/admin/groups/${m.groupId}`, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" /> View Group
                        </DropdownItem>
                        <DropdownItem
                          danger
                          onClick={() => {
                            if (confirm(`Remove ${clientName} from "${m.group.name}"?`))
                              remove.mutate({ groupId: m.groupId, clientId });
                          }}
                        >
                          <UserMinus className="h-4 w-4" /> Remove from Group
                        </DropdownItem>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <AddToGroupModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clientId={clientId}
        memberGroupIds={memberGroupIds}
      />
    </>
  );
}

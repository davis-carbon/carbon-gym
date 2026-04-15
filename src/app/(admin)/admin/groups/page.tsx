"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.groups.list.useQuery({ search: search || undefined });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button><Plus className="h-4 w-4" /> Add New Group</Button>
      </div>

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder="Search groups..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
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
                <tr key={group.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium">{group.name}</td>
                  <td className="px-4 py-3">{group._count.members} Members</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownItem><Pencil className="h-4 w-4" /> Edit</DropdownItem>
                      <DropdownItem danger><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
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
    </div>
  );
}

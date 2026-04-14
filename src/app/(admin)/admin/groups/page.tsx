"use client";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2 } from "lucide-react";

const MOCK_GROUPS = [
  { id: "1", name: "Nutrition Engineering", members: 49, createdBy: "CARBON Training Centre" },
  { id: "2", name: "March Row Challenge 2026", members: 13, createdBy: "Aaron Davis" },
  { id: "3", name: "March Rowing Challenge", members: 28, createdBy: "CARBON Training Centre" },
  { id: "4", name: "2024: Fall Apprentice Program", members: 15, createdBy: "Bri Larson" },
  { id: "5", name: "Tour de BikeErg", members: 20, createdBy: "Bri Larson" },
  { id: "6", name: "Course: Herbal Formulas for Performance & Recovery", members: 12, createdBy: "CARBON Training Centre" },
];

export default function GroupsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button><Plus className="h-4 w-4" /> Add New Group</Button>
      </div>

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder="Search groups..." />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left font-medium text-stone-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Members</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Created By</th>
              <th className="px-4 py-3 text-right font-medium text-stone-600 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {MOCK_GROUPS.map((group) => (
              <tr key={group.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium">{group.name}</td>
                <td className="px-4 py-3">{group.members} Members</td>
                <td className="px-4 py-3 text-stone-500">{group.createdBy}</td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownItem><Pencil className="h-4 w-4" /> Edit</DropdownItem>
                    <DropdownItem danger><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

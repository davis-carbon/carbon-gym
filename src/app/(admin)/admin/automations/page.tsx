"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, Copy, Zap } from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  when: string;
  who: string;
  what: string;
  message?: string;
}

const MOCK_AUTOMATIONS: AutomationRule[] = [
  {
    id: "1",
    name: "Assign a Staff Member",
    type: "Assign a Staff Member",
    isActive: true,
    when: "0 days after account has purchased ORIGIN",
    who: "all accounts (will be added as a client if not already)",
    what: "Assign Brandon Sherwood",
  },
  {
    id: "2",
    name: "Assign/Import a Plan",
    type: "Assign/Import a Plan",
    isActive: true,
    when: "3 minutes after user purchases ORIGIN",
    who: "all accounts",
    what: "ORIGIN Post-Assessment - Only Assign Plan",
    message: "",
  },
  {
    id: "3",
    name: "Assign/Import a Plan",
    type: "Assign/Import a Plan",
    isActive: true,
    when: "2 minutes after user purchases ORIGIN",
    who: "all accounts",
    what: "ORIGIN Pre-Assessment - Only Assign Plan",
    message: "",
  },
  {
    id: "4",
    name: "Assign a Resource",
    type: "Assign a Resource",
    isActive: true,
    when: "0 days after user has purchased ORIGIN",
    who: "all accounts",
    what: "Assign Welcome Packet resource",
  },
  {
    id: "5",
    name: "Send a Message",
    type: "Send a Message",
    isActive: true,
    when: "1 day after user signs up",
    who: "all new clients",
    what: "Send welcome message",
    message: "Welcome to CARBON! We're excited to have you...",
  },
  {
    id: "6",
    name: "Add to Group",
    type: "Add to Group",
    isActive: false,
    when: "0 days after purchase of Nutrition Program",
    who: "all accounts",
    what: "Add to Nutrition Engineering group",
  },
];

export default function AutomationsPage() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_AUTOMATIONS.filter(
    (a) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.what.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Automations</h1>
        <div className="flex gap-2">
          <select className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600">
            <option>Sort By: Newest First</option>
            <option>Sort By: Oldest First</option>
            <option>Sort By: Name A-Z</option>
          </select>
          <select className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600">
            <option>Create New Automation</option>
            <option>Assign a Staff Member</option>
            <option>Assign/Import a Plan</option>
            <option>Assign a Resource</option>
            <option>Send a Message</option>
            <option>Add to Group</option>
            <option>Add a Tag</option>
          </select>
        </div>
      </div>

      <div className="mb-4 max-w-md">
        <SearchInput
          placeholder="Filter Automations"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.map((rule) => (
          <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-stone-900">
                      Automation <Pencil className="inline h-3.5 w-3.5 text-stone-400 ml-1 cursor-pointer" /> | {rule.type}
                    </h3>
                    {!rule.isActive && <Badge variant="outline">Disabled</Badge>}
                    <div className="flex items-center gap-1 ml-2">
                      <button className="text-stone-400 hover:text-stone-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      <button className="text-stone-400 hover:text-stone-600 transition-colors"><Copy className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-4">
                      <span className="font-semibold text-stone-700 w-20">When?</span>
                      <span className="text-stone-600">{rule.when} <Pencil className="inline h-3 w-3 text-stone-400 ml-1 cursor-pointer" /></span>
                    </div>
                    <div className="flex gap-4">
                      <span className="font-semibold text-stone-700 w-20">Who?</span>
                      <span className="text-stone-600">{rule.who}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="font-semibold text-stone-700 w-20">What?</span>
                      <span className="text-stone-600">{rule.what} <Pencil className="inline h-3 w-3 text-stone-400 ml-1 cursor-pointer" /></span>
                    </div>
                    {rule.message !== undefined && (
                      <div className="flex gap-4">
                        <span className="font-semibold text-stone-700 w-20">Message:</span>
                        <span className="text-stone-400 italic">{rule.message || "enter a message (optional)"} <Pencil className="inline h-3 w-3 text-stone-400 ml-1 cursor-pointer" /></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

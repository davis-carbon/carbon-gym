"use client";

import Link from "next/link";
import { Users, Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";

export default function ClientGroupsPage() {
  const { data: memberships, isLoading } = trpc.portal.myGroups.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!memberships || memberships.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Groups</h2>
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="h-8 w-8 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-600">No groups yet</p>
            <p className="text-xs text-stone-400 mt-1">Your coach will add you to groups when you join challenges or programs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-stone-900">Groups</h2>
      <div className="space-y-3">
        {memberships.map(({ group, joinedAt }) => (
          <Link key={group.id} href={`/c/groups/${group.id}`} className="block">
            <Card className="hover:border-stone-300 transition-colors">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-stone-100 p-2.5">
                    <Users className="h-5 w-5 text-stone-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-stone-900 truncate">{group.name}</p>
                    {group.description && (
                      <p className="text-xs text-stone-500 mt-0.5 truncate">{group.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-stone-400">
                        {group._count.members} {group._count.members === 1 ? "member" : "members"}
                      </span>
                      {group._count.posts > 0 && (
                        <span className="text-xs text-stone-400">· {group._count.posts} posts</span>
                      )}
                      {group.allowClientPosts && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">Can post</Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-xs text-stone-400 text-center">
        Joined {memberships.length} {memberships.length === 1 ? "group" : "groups"}
      </p>
    </div>
  );
}

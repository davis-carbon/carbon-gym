"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageSquare, Send, Pin, Megaphone, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";

function authorName(post: {
  staffAuthor?: { firstName: string; lastName: string } | null;
  clientAuthor?: { firstName: string; lastName: string } | null;
}) {
  if (post.staffAuthor) return `${post.staffAuthor.firstName} ${post.staffAuthor.lastName}`;
  if (post.clientAuthor) return `${post.clientAuthor.firstName} ${post.clientAuthor.lastName}`;
  return "Someone";
}

function authorInitials(post: {
  staffAuthor?: { firstName: string; lastName: string } | null;
  clientAuthor?: { firstName: string; lastName: string } | null;
}) {
  const name = post.staffAuthor ?? post.clientAuthor;
  if (!name) return "?";
  return `${name.firstName[0]}${name.lastName[0]}`.toUpperCase();
}

function isStaff(post: { staffAuthor?: unknown }) {
  return !!post.staffAuthor;
}

function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PostCard({
  post,
  allowComments,
  onAddComment,
}: {
  post: {
    id: string;
    content: string;
    createdAt: Date | string;
    isPinned: boolean;
    isAnnouncement: boolean;
    staffAuthor?: { firstName: string; lastName: string } | null;
    clientAuthor?: { firstName: string; lastName: string } | null;
    comments: {
      id: string;
      content: string;
      createdAt: Date | string;
      staffAuthor?: { firstName: string; lastName: string } | null;
      clientAuthor?: { firstName: string; lastName: string } | null;
    }[];
    _count: { comments: number };
  };
  allowComments: boolean;
  onAddComment: (postId: string, content: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleComment() {
    if (!commentText.trim()) return;
    setSubmitting(true);
    await onAddComment(post.id, commentText.trim());
    setCommentText("");
    setSubmitting(false);
  }

  return (
    <Card className={post.isPinned ? "border-amber-200 bg-amber-50/30" : ""}>
      <CardContent className="pt-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            isStaff(post) ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-700"
          }`}>
            {authorInitials(post)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-stone-900">{authorName(post)}</span>
              {isStaff(post) && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">Coach</Badge>}
              {post.isAnnouncement && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                  <Megaphone className="h-2.5 w-2.5" /> Announcement
                </span>
              )}
              {post.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
            </div>
            <p className="text-xs text-stone-400 mt-0.5">{timeAgo(post.createdAt)}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {/* Comment toggle */}
        {post._count.comments > 0 && (
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {post._count.comments} {post._count.comments === 1 ? "comment" : "comments"}
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        {/* Comments */}
        {showComments && post.comments.length > 0 && (
          <div className="space-y-2 pl-4 border-l-2 border-stone-100">
            {post.comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isStaff(c) ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-700"
                }`}>
                  {authorInitials(c)}
                </div>
                <div>
                  <span className="text-xs font-semibold text-stone-800">{authorName(c)}</span>
                  <span className="text-xs text-stone-400 ml-1">{timeAgo(c.createdAt)}</span>
                  <p className="text-xs text-stone-700 mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add comment */}
        {allowComments && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); }}}
              className="flex-1 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || submitting}
              className="rounded-full bg-stone-900 text-white p-1.5 disabled:opacity-40 transition-opacity"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GroupFeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = trpc.portal.groupFeed.useInfiniteQuery(
    { groupId: id, limit: 20 },
    { getNextPageParam: (last) => last.nextCursor }
  );

  const { data: groups } = trpc.portal.myGroups.useQuery();
  const groupInfo = groups?.find((g) => g.group.id === id)?.group;

  const addComment = trpc.portal.addGroupComment.useMutation({
    onSuccess: () => utils.portal.groupFeed.invalidate({ groupId: id }),
  });

  const createPost = trpc.portal.createGroupPost.useMutation({
    onSuccess: () => {
      setPostText("");
      setShowPostBox(false);
      utils.portal.groupFeed.invalidate({ groupId: id });
    },
  });

  const [postText, setPostText] = useState("");
  const [showPostBox, setShowPostBox] = useState(false);

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  async function handleAddComment(postId: string, content: string) {
    await addComment.mutateAsync({ postId, content });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link href="/c/groups" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Groups
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{groupInfo?.name ?? "Group"}</h2>
            {groupInfo?.description && (
              <p className="text-sm text-stone-500 mt-0.5">{groupInfo.description}</p>
            )}
          </div>
          {groupInfo?.allowClientPosts && (
            <Button size="sm" variant="secondary" onClick={() => setShowPostBox(!showPostBox)}>
              Post
            </Button>
          )}
        </div>
      </div>

      {/* New post box */}
      {showPostBox && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <textarea
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
              rows={3}
              placeholder="Share something with the group…"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setShowPostBox(false); setPostText(""); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!postText.trim() || createPost.isPending}
                onClick={() => createPost.mutate({ groupId: id, content: postText.trim() })}
              >
                {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <MessageSquare className="h-8 w-8 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-600">No posts yet</p>
            <p className="text-xs text-stone-400 mt-1">Your coach will post updates and announcements here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              allowComments={true}
              onAddComment={handleAddComment}
            />
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full text-center text-sm text-stone-500 py-2 hover:text-stone-700 transition-colors"
            >
              {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

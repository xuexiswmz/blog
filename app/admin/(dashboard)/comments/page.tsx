import CommentModerationList from "@/components/Admin/Comments/components/CommentModerationList";

export default function AdminCommentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950 dark:text-neutral-100">
          评论审核
        </h1>
      </div>
      <CommentModerationList />
    </div>
  );
}

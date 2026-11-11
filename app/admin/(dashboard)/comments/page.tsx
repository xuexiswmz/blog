import CommentModerationList from "@/components/Admin/Comments/components/CommentModerationList";

export default function AdminCommentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950 dark:text-neutral-100">
          评论审核
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          查看、审核和删除读者评论。
        </p>
      </div>
      <CommentModerationList />
    </div>
  );
}

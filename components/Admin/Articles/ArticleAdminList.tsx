"use client";

import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type ArticleAdminListItem = {
  slug: string;
  title: string;
  date: string;
};

type DeleteResult = {
  slug: string;
  commitUrl: string;
};

export default function ArticleAdminList({
  posts,
}: {
  posts: ArticleAdminListItem[];
}) {
  const [pendingDelete, setPendingDelete] =
    useState<ArticleAdminListItem | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deletedSlugs, setDeletedSlugs] = useState<string[]>([]);
  const [result, setResult] = useState<DeleteResult | null>(null);

  const visiblePosts = posts.filter(
    (post) => !deletedSlugs.includes(post.slug),
  );

  async function handleDelete(slug: string) {
    setDeletingSlug(slug);
    setResult(null);

    try {
      const response = await fetch(
        `/api/admin/articles/${encodeURIComponent(slug)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as {
        message?: string;
        commitUrl?: string;
      };

      if (!response.ok) {
        toast.error(payload.message ?? "删除文章失败");
        return;
      }

      toast.success("已提交删除，部署后生效");
      setDeletedSlugs((current) => [...current, slug]);
      setPendingDelete(null);
      setResult({
        slug,
        commitUrl: payload.commitUrl ?? "",
      });
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setDeletingSlug(null);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h2 className="font-semibold text-neutral-950 dark:text-neutral-100">
          已有文章
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          删除会 commit 删除对应的 MDX 文件；其他文章中的关联和正文链接不会自动清理，评论与访问数据会保留。
        </p>
      </div>

      {result ? (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300">
          已提交删除 <span className="font-medium">{result.slug}</span>
          ，部署构建后生效。
          {result.commitUrl ? (
            <a
              href={result.commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 font-medium text-neutral-950 underline underline-offset-4 dark:text-neutral-100"
            >
              查看 commit
            </a>
          ) : null}
        </div>
      ) : null}

      {visiblePosts.length > 0 ? (
        <ul className="mt-4 max-h-[28rem] overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          {visiblePosts.map((post) => (
            <li
              key={post.slug}
              className="border-b border-neutral-100 px-3 py-3 last:border-b-0 dark:border-neutral-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/posts/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {post.slug} · {post.date}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPendingDelete(post)}
                  disabled={deletingSlug === post.slug}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  删除
                </button>
              </div>

            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          没有文章。
        </p>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingSlug) {
            setPendingDelete(null);
          }
        }}
      >
        {pendingDelete ? (
          <DialogContent>
            <DialogTitle>删除文章</DialogTitle>
            <DialogDescription>
              确认删除「{pendingDelete.title}」？会向 GitHub 提交删除
              content/posts/{pendingDelete.slug}.mdx，部署后生效。
            </DialogDescription>

            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              其他文章中的 related 和正文链接不会自动清理，评论与访问数据会保留。
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <DialogClose asChild>
                <button
                  type="button"
                  disabled={Boolean(deletingSlug)}
                  className="rounded-full px-4 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  取消
                </button>
              </DialogClose>
              <button
                type="button"
                disabled={Boolean(deletingSlug)}
                onClick={() => void handleDelete(pendingDelete.slug)}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingSlug ? (
                  <Loader2
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                {deletingSlug ? "删除中…" : "确认删除"}
              </button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}

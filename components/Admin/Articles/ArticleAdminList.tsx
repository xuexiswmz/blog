"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronRight,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import ArticleCategoryButton from "@/components/Admin/ArticleCategories/components/ArticleCategoryButton";
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
  tags?: string[];
};

type DeleteResult = {
  slug: string;
  commitUrl: string;
};

const ALL_TAGS = "全部";

const TAG_LABELS: Record<string, string> = {
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  react: "React",
};

function formatTagLabel(tag: string): string {
  return TAG_LABELS[tag.toLowerCase()] ?? tag;
}

export default function ArticleAdminList({
  posts,
}: {
  posts: ArticleAdminListItem[];
}) {
  const [activeTag, setActiveTag] = useState(ALL_TAGS);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingDelete, setPendingDelete] =
    useState<ArticleAdminListItem | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deletedSlugs, setDeletedSlugs] = useState<string[]>([]);
  const [result, setResult] = useState<DeleteResult | null>(null);

  const tagCounts = new Map<string, number>();

  for (const post of posts) {
    const tag = post.tags?.[0]?.trim() || "未分类";
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const tags = Array.from(tagCounts.entries()).sort(
    (left, right) =>
      right[1] - left[1] || left[0].localeCompare(right[0]),
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visiblePosts = posts
    .filter((post) => !deletedSlugs.includes(post.slug))
    .filter((post) => {
      const tag = post.tags?.[0]?.trim() || "未分类";
      return activeTag === ALL_TAGS || tag === activeTag;
    })
    .filter((post) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.slug.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((left, right) => {
      const comparison = right.date.localeCompare(left.date);
      return sort === "newest" ? comparison : -comparison;
    });

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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <div className="scrollbar-hide flex min-w-0 items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTag(ALL_TAGS)}
            className={
              activeTag === ALL_TAGS
                ? "shrink-0 rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-950"
                : "shrink-0 rounded-full px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            }
          >
            全部 <span className="ml-1 text-xs opacity-60">{posts.length}</span>
          </button>
          {tags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={
                activeTag === tag
                  ? "shrink-0 rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-950"
                  : "shrink-0 rounded-full px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              }
            >
              {formatTagLabel(tag)}{" "}
              <span className="ml-1 text-xs opacity-60">{count}</span>
            </button>
          ))}
        </div>

        <ArticleCategoryButton />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            aria-label="搜索文章标题"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文章标题..."
            className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-9 pr-9 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
          {query ? (
            <button
              type="button"
              aria-label="清除搜索"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
          className={
            filtersOpen
              ? "inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-950"
              : "inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          }
        >
          <Filter className="size-4" aria-hidden="true" />
          筛选
        </button>
      </div>

      {filtersOpen ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-neutral-500 dark:text-neutral-400">排序：</span>
          <button
            type="button"
            onClick={() => setSort("newest")}
            className={
              sort === "newest"
                ? "rounded-full bg-neutral-950 px-3 py-1 text-xs text-white dark:bg-white dark:text-neutral-950"
                : "rounded-full px-3 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }
          >
            最新发布
          </button>
          <button
            type="button"
            onClick={() => setSort("oldest")}
            className={
              sort === "oldest"
                ? "rounded-full bg-neutral-950 px-3 py-1 text-xs text-white dark:bg-white dark:text-neutral-950"
                : "rounded-full px-3 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }
          >
            最早发布
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300">
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
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {visiblePosts.map((post) => (
            <li
              key={post.slug}
              className="group flex items-center gap-3 px-4 py-4 sm:px-5"
            >
              <FileText
                className="size-5 shrink-0 text-neutral-400 dark:text-neutral-500"
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/articles/${post.slug}/edit`}
                  className="block truncate text-sm font-medium text-neutral-950 hover:underline dark:text-neutral-100"
                >
                  {post.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {formatTagLabel(
                      post.tags?.[0]?.trim() || "未分类",
                    )}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {post.date}
                  </span>
                </div>
              </div>

              <Link
                href={`/posts/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`查看已发布文章 ${post.title}`}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>

              <button
                type="button"
                aria-label={`删除 ${post.title}`}
                onClick={() => setPendingDelete(post)}
                disabled={deletingSlug === post.slug}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                <span className="sr-only">删除</span>
              </button>

              <Link
                href={`/admin/articles/${post.slug}/edit`}
                aria-label={`编辑文章 ${post.title}`}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          没有匹配的文章
        </div>
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

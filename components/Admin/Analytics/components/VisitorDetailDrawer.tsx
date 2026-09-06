"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { AnalyticsVisitorDetail } from "../types/analytics";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

type VisitorDetailViewProps = {
  detail: AnalyticsVisitorDetail;
  onClose: () => void;
};

type VisitorDetailDrawerProps = {
  detail: AnalyticsVisitorDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
};

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function getPostLabel(postSlug: string, title: string | null) {
  return title ?? postSlug + "（文章不存在）";
}

export function VisitorDetailView({
  detail,
  onClose,
}: VisitorDetailViewProps) {
  return (
    <aside
      onClick={(event) => event.stopPropagation()}
      className="absolute inset-y-0 right-0 flex h-full w-full max-w-2xl flex-col border-l border-gray-200 bg-white text-gray-950 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 p-5 dark:border-gray-800">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">访客详情</p>
          <h2 id="visitor-detail-title" className="mt-1 text-xl font-semibold">
            {detail.displayId}
          </h2>
        </div>
        <button
          type="button"
          aria-label="关闭访客详情"
          onClick={onClose}
          className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-5">
        <section aria-labelledby="visitor-summary-title">
          <h3 id="visitor-summary-title" className="font-semibold">
            访问摘要
          </h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <dt className="text-sm text-gray-500 dark:text-gray-400">浏览量</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {detail.pageViews.toLocaleString("zh-CN")}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                访问文章
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {detail.visitedPosts.toLocaleString("zh-CN")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                首次访问
              </dt>
              <dd className="mt-1 text-sm">{formatDate(detail.firstVisitedAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                最近访问
              </dt>
              <dd className="mt-1 text-sm">{formatDate(detail.lastVisitedAt)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="visitor-posts-title">
          <div className="flex items-baseline justify-between gap-4">
            <h3 id="visitor-posts-title" className="font-semibold">
              文章排行
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {detail.posts.length} 篇
            </span>
          </div>
          {detail.posts.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              当前时间范围内没有文章访问记录
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
              {detail.posts.map((post, index) => (
                <li
                  key={post.postSlug}
                  className="flex items-start justify-between gap-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {index + 1}. {getPostLabel(post.postSlug, post.title)}
                    </p>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      最近访问 {formatDate(post.lastVisitedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                    {post.pageViews.toLocaleString("zh-CN")} 次
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="visitor-timeline-title">
          <div className="flex items-baseline justify-between gap-4">
            <h3 id="visitor-timeline-title" className="font-semibold">
              最近访问记录
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              最近 {Math.min(detail.recentVisits.length, 100)} 条
            </span>
          </div>
          {detail.recentVisits.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              暂无最近访问记录
            </p>
          ) : (
            <ol className="mt-4 border-l border-gray-200 pl-5 dark:border-gray-800">
              {detail.recentVisits.slice(0, 100).map((visit, index) => (
                <li
                  key={visit.postSlug + "-" + visit.visitedAt + "-" + index}
                  className="relative pb-5 text-sm last:pb-0"
                >
                  <span className="absolute -left-[23px] top-1.5 size-1.5 rounded-full bg-blue-500" />
                  <p className="font-medium">
                    {getPostLabel(visit.postSlug, visit.title)}
                  </p>
                  <time
                    dateTime={visit.visitedAt}
                    className="mt-1 block text-gray-500 dark:text-gray-400"
                  >
                    {formatDate(visit.visitedAt)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </aside>
  );
}

export default function VisitorDetailDrawer({
  detail,
  loading,
  error,
  onClose,
  onRetry,
}: VisitorDetailDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.show();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (dialog.open) dialog.close();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitor-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-black/45 p-0"
    >
      {loading ? (
        <aside
          onClick={(event) => event.stopPropagation()}
          className="absolute inset-y-0 right-0 flex h-full w-full max-w-2xl items-center justify-center border-l border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
        >
          <h2 id="visitor-detail-title" className="sr-only">
            访客详情
          </h2>
          正在加载访客详情...
        </aside>
      ) : error ? (
        <aside
          onClick={(event) => event.stopPropagation()}
          className="absolute inset-y-0 right-0 flex h-full w-full max-w-2xl flex-col items-center justify-center border-l border-gray-200 bg-white p-5 text-center shadow-2xl dark:border-gray-800 dark:bg-gray-950"
        >
          <h2 id="visitor-detail-title" className="text-lg font-semibold">
            访客详情
          </h2>
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white dark:bg-white dark:text-gray-900"
            >
              重新加载
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            >
              关闭
            </button>
          </div>
        </aside>
      ) : detail ? (
        <VisitorDetailView detail={detail} onClose={onClose} />
      ) : null}
    </dialog>
  );
}

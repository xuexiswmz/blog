import type {
  AnalyticsVisitorListItem,
  AnalyticsVisitorPage,
} from "../types/analytics";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type VisitorMonitorViewProps = {
  visitors: AnalyticsVisitorListItem[];
  pagination: AnalyticsVisitorPage["pagination"];
  loading: boolean;
  error: string;
  onSelectVisitor: (visitorId: string) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
};

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function getFavoritePost(visitor: AnalyticsVisitorListItem) {
  if (!visitor.favoritePost) return "暂无";

  const label =
    visitor.favoritePost.title ??
    visitor.favoritePost.postSlug + "（文章不存在）";
  return (
    label +
    " · " +
    visitor.favoritePost.pageViews.toLocaleString("zh-CN") +
    " 次"
  );
}

function VisitorAction({
  visitor,
  onSelectVisitor,
}: {
  visitor: AnalyticsVisitorListItem;
  onSelectVisitor: (visitorId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelectVisitor(visitor.visitorId)}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
    >
      查看详情
    </button>
  );
}

export function VisitorMonitorView({
  visitors,
  pagination,
  loading,
  error,
  onSelectVisitor,
  onPageChange,
  onRetry,
}: VisitorMonitorViewProps) {
  const previousDisabled = loading || pagination.page <= 1;
  const nextDisabled =
    loading ||
    pagination.totalPages === 0 ||
    pagination.page >= pagination.totalPages;

  return (
    <section
      aria-labelledby="visitor-monitor-title"
      className="rounded-xl border border-gray-200 dark:border-gray-800"
    >
      <div className="border-b border-gray-200 p-5 dark:border-gray-800">
        <h2 id="visitor-monitor-title" className="text-lg font-semibold">
          访客监控
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          匿名展示访客的访问频次和文章偏好
        </p>
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          正在加载访客数据...
        </div>
      ) : error ? (
        <div role="alert" className="p-5 text-sm text-red-600 dark:text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md bg-gray-900 px-3 py-2 text-white dark:bg-white dark:text-gray-900"
          >
            重新加载访客
          </button>
        </div>
      ) : visitors.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          当前时间范围内还没有访客数据
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">访客</th>
                  <th className="px-5 py-3 font-medium">首次访问</th>
                  <th className="px-5 py-3 font-medium">最近访问</th>
                  <th className="px-5 py-3 font-medium">浏览量</th>
                  <th className="px-5 py-3 font-medium">访问文章</th>
                  <th className="px-5 py-3 font-medium">偏好文章</th>
                  <th className="px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {visitors.map((visitor) => (
                  <tr key={visitor.visitorId}>
                    <td className="px-5 py-4 font-medium">{visitor.displayId}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                      {formatDate(visitor.firstVisitedAt)}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                      {formatDate(visitor.lastVisitedAt)}
                    </td>
                    <td className="px-5 py-4 tabular-nums">
                      {visitor.pageViews.toLocaleString("zh-CN")} 次访问
                    </td>
                    <td className="px-5 py-4 tabular-nums">
                      {visitor.visitedPosts.toLocaleString("zh-CN")} 篇
                    </td>
                    <td
                      className="max-w-64 truncate px-5 py-4"
                      title={getFavoritePost(visitor)}
                    >
                      {getFavoritePost(visitor)}
                    </td>
                    <td className="px-5 py-4">
                      <VisitorAction
                        visitor={visitor}
                        onSelectVisitor={onSelectVisitor}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-gray-200 md:hidden dark:divide-gray-800">
            {visitors.map((visitor) => (
              <article key={visitor.visitorId} className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{visitor.displayId}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {visitor.pageViews.toLocaleString("zh-CN")} 次访问 ·{" "}
                      {visitor.visitedPosts.toLocaleString("zh-CN")} 篇文章
                    </p>
                  </div>
                  <VisitorAction
                    visitor={visitor}
                    onSelectVisitor={onSelectVisitor}
                  />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-gray-500 dark:text-gray-400">首次访问</dt>
                  <dd>{formatDate(visitor.firstVisitedAt)}</dd>
                  <dt className="text-gray-500 dark:text-gray-400">最近访问</dt>
                  <dd>{formatDate(visitor.lastVisitedAt)}</dd>
                  <dt className="text-gray-500 dark:text-gray-400">偏好文章</dt>
                  <dd className="min-w-0 break-words">
                    {getFavoritePost(visitor)}
                  </dd>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}

      {!loading && !error ? (
        <footer className="flex items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            共 {pagination.total.toLocaleString("zh-CN")} 位访客 · 第{" "}
            {pagination.page} / {Math.max(pagination.totalPages, 1)} 页
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={previousDisabled}
              onClick={() => onPageChange(pagination.page - 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={nextDisabled}
              onClick={() => onPageChange(pagination.page + 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
            >
              下一页
            </button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}

export default VisitorMonitorView;

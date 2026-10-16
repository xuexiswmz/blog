import type { ArticleNavigationGroup } from "@/lib/articleCategories/types";
import Link from "next/link";

export default function ArticleNavigation({
  groups,
  currentSlug,
}: {
  groups: ArticleNavigationGroup[];
  currentSlug: string;
}) {
  return (
    <nav aria-label="文章导航" className="space-y-6">
      {groups.map((group) => (
        <section key={group.id ?? "uncategorized"}>
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {group.name}
          </h2>
          {group.posts.length > 0 ? (
            <ul className="space-y-1">
              {group.posts.map((post) => {
                const current = post.slug === currentSlug;
                return (
                  <li key={post.slug}>
                    <Link
                      href={`/posts/${encodeURIComponent(post.slug)}`}
                      aria-current={current ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
                        current
                          ? "bg-slate-100 font-medium text-slate-950 dark:bg-white/10 dark:text-white"
                          : "text-muted-foreground hover:bg-slate-100/70 hover:text-foreground dark:hover:bg-white/5"
                      }`}
                    >
                      {post.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3 text-xs text-muted-foreground/70">暂无文章</p>
          )}
        </section>
      ))}
    </nav>
  );
}

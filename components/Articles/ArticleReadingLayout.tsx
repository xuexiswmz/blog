"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ArticleNavigationGroup } from "@/lib/articleCategories/types";
import ArticleNavigation from "./ArticleNavigation";
import ArticleTableOfContents from "./ArticleTableOfContents";
import {
  calculateReadingProgress,
  collectArticleHeadings,
  findActiveHeading,
  type TableOfContentsItem,
} from "./articleReading";

const articleClassName = `
  prose prose-sm prose-slate
  w-full min-w-0 max-w-none
  sm:prose-base
  dark:prose-invert

  prose-h1:text-3xl
  sm:prose-h1:text-4xl

  prose-h2:text-2xl
  sm:prose-h2:text-3xl

  wrap-anywhere

  [&_pre]:max-w-full
  [&_pre]:overflow-x-auto
  [&_pre]:rounded-xl
  [&_pre]:border
  [&_pre]:border-slate-200
  dark:[&_pre]:border-[#303030]

  [&_table]:block
  [&_table]:max-w-full
  [&_table]:overflow-x-auto

  [&_img]:h-auto
  [&_img]:max-w-full
`;

export default function ArticleReadingLayout({
  groups,
  currentSlug,
  children,
}: {
  groups: ArticleNavigationGroup[];
  currentSlug: string;
  children: ReactNode;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<TableOfContentsItem[]>([]);
  const [items, setItems] = useState<TableOfContentsItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const main = article.closest("main");
    const scrollTarget: Window | HTMLElement = main ?? window;
    let frameId: number | null = null;
    let headingsCollected = false;

    const measure = () => {
      frameId = null;
      if (!headingsCollected) {
        itemsRef.current = collectArticleHeadings(article);
        headingsCollected = true;
        setItems(itemsRef.current);
      }

      const viewportRect = main?.getBoundingClientRect();
      const viewportTop = viewportRect?.top ?? 0;
      const viewportHeight =
        main?.clientHeight || viewportRect?.height || window.innerHeight;
      const headingTops = new Map(
        itemsRef.current.map((item) => [
          item.id,
          document.getElementById(item.id)?.getBoundingClientRect().top ??
            Number.POSITIVE_INFINITY,
        ]),
      );
      const articleRect = article.getBoundingClientRect();

      setActiveId(
        findActiveHeading(itemsRef.current, headingTops, viewportTop + 80),
      );
      setProgress(
        calculateReadingProgress({
          articleTop: articleRect.top,
          articleHeight: articleRect.height,
          viewportTop,
          viewportHeight,
        }),
      );
    };

    const scheduleMeasure = () => {
      if (frameId !== null) return;
      frameId = requestAnimationFrame(measure);
    };

    scheduleMeasure();
    scrollTarget.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });

    return () => {
      scrollTarget.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [children]);

  const handleNavigate = useCallback((id: string) => {
    const heading = document.getElementById(id);
    if (!heading || !articleRef.current?.contains(heading)) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    heading.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const toc = (
    <ArticleTableOfContents
      items={items}
      activeId={activeId}
      progress={progress}
      onNavigate={handleNavigate}
    />
  );

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 sm:py-10 xl:grid xl:grid-cols-[minmax(13rem,16rem)_minmax(0,50rem)_minmax(12rem,15rem)] xl:items-start xl:gap-8 xl:px-8">
      <div className="mb-6 grid gap-3 xl:hidden">
        <details className="rounded-xl border border-border bg-background px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            文章导航
          </summary>
          <div className="mt-4 border-t border-border pt-4">
            <ArticleNavigation groups={groups} currentSlug={currentSlug} />
          </div>
        </details>
        <details className="rounded-xl border border-border bg-background px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            本文目录
          </summary>
          <div className="mt-4 border-t border-border pt-4">{toc}</div>
        </details>
      </div>

      <aside className="hidden xl:block xl:sticky xl:top-6 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:pr-2">
        <ArticleNavigation groups={groups} currentSlug={currentSlug} />
      </aside>

      <div className="min-w-0">
        <article
          ref={articleRef}
          data-article-content
          className={articleClassName}
        >
          {children}
        </article>
      </div>

      <aside className="hidden xl:block xl:sticky xl:top-6 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:pl-2">
        {toc}
      </aside>
    </div>
  );
}

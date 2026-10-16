export type TableOfContentsItem = {
  id: string;
  label: string;
  level: 2 | 3;
};

function slugifyHeading(label: string): string {
  const slug = label
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/\p{Mark}+/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function uniqueId(baseId: string, usedIds: Set<string>): string {
  if (!usedIds.has(baseId)) return baseId;
  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

export function collectArticleHeadings(
  article: HTMLElement,
): TableOfContentsItem[] {
  const usedIds = new Set<string>();
  return Array.from(article.querySelectorAll<HTMLHeadingElement>("h2, h3")).map(
    (heading) => {
      const label = (heading.textContent ?? "").replace(/\s+/g, " ").trim();
      const baseId = heading.id.trim() || slugifyHeading(label);
      const id = uniqueId(baseId, usedIds);
      usedIds.add(id);
      heading.id = id;
      return {
        id,
        label,
        level: heading.tagName === "H3" ? 3 : 2,
      };
    },
  );
}

export function findActiveHeading(
  items: TableOfContentsItem[],
  headingTops: ReadonlyMap<string, number>,
  activationTop: number,
): string | null {
  if (items.length === 0) return null;
  let activeId = items[0].id;
  for (const item of items) {
    const top = headingTops.get(item.id);
    if (top !== undefined && top <= activationTop) activeId = item.id;
  }
  return activeId;
}

export function calculateReadingProgress({
  articleTop,
  articleHeight,
  viewportTop,
  viewportHeight,
}: {
  articleTop: number;
  articleHeight: number;
  viewportTop: number;
  viewportHeight: number;
}): number {
  const readableDistance = articleHeight - viewportHeight;
  if (readableDistance <= 0) return articleTop <= viewportTop ? 100 : 0;
  const progress = ((viewportTop - articleTop) / readableDistance) * 100;
  return Math.round(Math.min(100, Math.max(0, progress)));
}

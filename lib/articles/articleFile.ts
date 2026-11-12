import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ARTICLE_SLUG_PATTERN } from "./helpers";
import { getArticleFilePath, type ArticleInput } from "./articleInput";

const EDITABLE_FRONTMATTER_KEYS = new Set([
  "title",
  "date",
  "description",
  "tags",
  "related",
]);

export async function getArticleFrontmatterExtras(
  slug: string,
): Promise<Record<string, unknown>> {
  if (!ARTICLE_SLUG_PATTERN.test(slug)) {
    return {};
  }

  try {
    const absolutePath = path.join(process.cwd(), getArticleFilePath(slug));
    const source = await readFile(absolutePath, "utf8");
    const { data } = matter(source);
    const extras: Record<string, unknown> = { ...data };

    for (const key of EDITABLE_FRONTMATTER_KEYS) {
      delete extras[key];
    }

    return extras;
  } catch {
    return {};
  }
}

export async function getArticleForEdit(
  slug: string,
): Promise<ArticleInput | null> {
  if (!ARTICLE_SLUG_PATTERN.test(slug)) {
    return null;
  }

  const absolutePath = path.join(process.cwd(), getArticleFilePath(slug));

  try {
    const source = await readFile(absolutePath, "utf8");
    const { data, content } = matter(source);
    const frontmatterTitle =
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : slug;
    const trimmedContent = content.trimStart();
    const headingMatch = trimmedContent.match(/^#\s+(.+?)\r?\n+/);
    const title = headingMatch?.[1]?.trim() || frontmatterTitle;
    const body = headingMatch
      ? trimmedContent.slice(headingMatch[0].length).trim()
      : trimmedContent.trim();
    const date =
      typeof data.date === "string"
        ? data.date
        : data.date instanceof Date
          ? data.date.toISOString().slice(0, 10)
          : "";

    return {
      slug,
      title,
      date,
      description:
        typeof data.description === "string" ? data.description : "",
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      related: Array.isArray(data.related) ? data.related.map(String) : [],
      content: body,
    };
  } catch {
    return null;
  }
}

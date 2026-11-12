import matter from "gray-matter";
import {
  ARTICLE_SLUG_PATTERN,
  slugifyArticleTitle,
} from "./helpers";

export const MAX_ARTICLE_CONTENT_LENGTH = 200_000;

export type ArticleInput = {
  title: string;
  slug: string;
  date: string;
  description: string;
  tags: string[];
  related: string[];
  content: string;
};

export type ArticleValidationResult =
  | {
      ok: true;
      value: ArticleInput;
    }
  | {
      ok: false;
      errors: Record<string, string>;
    };

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateArticleInput(input: unknown): ArticleValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: { form: "请求内容格式不正确" } };
  }

  const raw = input as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  const content =
    typeof raw.content === "string" ? raw.content.trim() : "";
  const tags = normalizeStringList(raw.tags);
  const related = normalizeStringList(raw.related);
  const errors: Record<string, string> = {};

  if (!title) {
    errors.title = "请输入文章标题";
  } else if (title.length > 120) {
    errors.title = "文章标题不能超过 120 个字符";
  }

  if (!slug) {
    errors.slug = "请输入文章 slug";
  } else if (!ARTICLE_SLUG_PATTERN.test(slug)) {
    errors.slug = "slug 只能包含小写字母、数字和连字符";
  } else if (slug.length > 80) {
    errors.slug = "slug 不能超过 80 个字符";
  }

  if (!isValidDate(date)) {
    errors.date = "请选择有效的日期";
  }

  if (description.length > 300) {
    errors.description = "描述不能超过 300 个字符";
  }

  if (!content) {
    errors.content = "请填写文章正文";
  } else if (content.length > MAX_ARTICLE_CONTENT_LENGTH) {
    errors.content = "文章正文过长";
  }

  if (tags.length > 10) {
    errors.tags = "标签不能超过 10 个";
  }

  if (related.length > 20) {
    errors.related = "关联文章不能超过 20 个";
  }

  if (related.includes(slug)) {
    errors.related = "不能关联文章自身";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title,
      slug,
      date,
      description,
      tags,
      related,
      content,
    },
  };
}

export function withArticleHeading(title: string, content: string): string {
  if (/^#\s+/.test(content.trimStart())) {
    return content;
  }

  return `# ${title}\n\n${content}`;
}

export function buildArticleMdx(
  input: ArticleInput,
  extraFrontmatter: Record<string, unknown> = {},
): string {
  const body = withArticleHeading(input.title, input.content);

  return matter.stringify(body, {
    ...extraFrontmatter,
    title: input.title,
    date: input.date,
    ...(input.description ? { description: input.description } : {}),
    tags: input.tags,
    ...(input.related.length > 0 ? { related: input.related } : {}),
  });
}

export function getArticleFilePath(slug: string): string {
  return `content/posts/${slug}.mdx`;
}

export { slugifyArticleTitle };

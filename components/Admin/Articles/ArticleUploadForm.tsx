"use client";

import {
  Eye,
  FilePlus2,
  Loader2,
  PenLine,
  Upload,
} from "lucide-react";
import { type ChangeEvent, FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import MarkdownContent from "@/components/Comments/Markdown/MarkdownContent";
import {
  getTodayDate,
  slugifyArticleTitle,
  stripMdxFrontmatter,
} from "@/lib/articles/helpers";

export type ArticleUploadPostOption = {
  slug: string;
  title: string;
};

type ArticleUploadResult = {
  slug: string;
  path: string;
  commitUrl: string;
  fileUrl: string;
};

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500";

const labelClass =
  "mb-1.5 block text-sm font-medium text-neutral-800 dark:text-neutral-200";

export default function ArticleUploadForm({
  posts,
}: {
  posts: ArticleUploadPostOption[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [date, setDate] = useState(getTodayDate);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [related, setRelated] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ArticleUploadResult | null>(null);

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!slugTouched) {
      setSlug(slugifyArticleTitle(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(value);
  }

  function toggleRelated(postSlug: string) {
    setRelated((current) =>
      current.includes(postSlug)
        ? current.filter((item) => item !== postSlug)
        : [...current, postSlug],
    );
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const source = await file.text();
    const body = stripMdxFrontmatter(source);
    const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();

    setContent(body);
    setMode("write");
    setResult(null);

    if (!title && heading) {
      handleTitleChange(heading);
    }

    if (!slugTouched) {
      setSlug(slugifyArticleTitle(file.name.replace(/\.mdx$/i, "")));
    }

    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setResult(null);

    try {
      const response = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          date,
          description,
          tags: tags
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
          related,
          content,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        errors?: Record<string, string>;
        slug?: string;
        path?: string;
        commitUrl?: string;
        fileUrl?: string;
      };

      if (!response.ok) {
        setFieldErrors(payload.errors ?? {});
        toast.error(payload.message ?? "提交文章失败");
        return;
      }

      toast.success("已提交到 GitHub");
      setResult({
        slug: payload.slug ?? slug,
        path: payload.path ?? "",
        commitUrl: payload.commitUrl ?? "",
        fileUrl: payload.fileUrl ?? "",
      });
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setDate(getTodayDate());
    setDescription("");
    setTags("");
    setRelated([]);
    setContent("");
    setMode("write");
    setResult(null);
    setFieldErrors({});
  }

  if (result) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
            <FilePlus2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-neutral-950 dark:text-neutral-100">
              已提交到 GitHub
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {result.path}。部署构建完成后，文章和 /graph 关联才会生效。
            </p>

            {result.commitUrl ? (
              <a
                href={result.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex text-sm font-medium text-neutral-950 underline underline-offset-4 dark:text-neutral-100"
              >
                查看 GitHub commit
              </a>
            ) : null}

            <div className="mt-5">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                继续上传
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="article-title" className={labelClass}>
              标题
            </label>
            <input
              id="article-title"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="例如：重新理解 useEffect"
              className={inputClass}
              required
            />
            {fieldErrors.title ? (
              <p className="mt-1 text-xs text-rose-500">{fieldErrors.title}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="article-slug" className={labelClass}>
              slug
            </label>
            <input
              id="article-slug"
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="react-useeffect"
              className={inputClass}
              required
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              仅小写字母、数字和连字符；中文标题请手动填写。
            </p>
            {fieldErrors.slug ? (
              <p className="mt-1 text-xs text-rose-500">{fieldErrors.slug}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="article-date" className={labelClass}>
              日期
            </label>
            <input
              id="article-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
              required
            />
            {fieldErrors.date ? (
              <p className="mt-1 text-xs text-rose-500">{fieldErrors.date}</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="article-description" className={labelClass}>
              描述
            </label>
            <textarea
              id="article-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="用于首页卡片和文章描述"
              className={inputClass}
            />
            {fieldErrors.description ? (
              <p className="mt-1 text-xs text-rose-500">
                {fieldErrors.description}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="article-tags" className={labelClass}>
              标签
            </label>
            <input
              id="article-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="react, hooks, 状态管理（用逗号分隔）"
              className={inputClass}
            />
            {fieldErrors.tags ? (
              <p className="mt-1 text-xs text-rose-500">{fieldErrors.tags}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-neutral-950 dark:text-neutral-100">
              正文
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              支持 MDX；如果正文没有 H1，会自动用标题补上。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full border border-neutral-200 p-1 dark:border-neutral-700">
              <button
                type="button"
                aria-pressed={mode === "write"}
                onClick={() => setMode("write")}
                className={
                  mode === "write"
                    ? "inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-950"
                    : "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }
              >
                <PenLine className="size-3.5" aria-hidden="true" />
                编辑
              </button>
              <button
                type="button"
                aria-pressed={mode === "preview"}
                onClick={() => setMode("preview")}
                className={
                  mode === "preview"
                    ? "inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-950"
                    : "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }
              >
                <Eye className="size-3.5" aria-hidden="true" />
                预览
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".mdx,text/markdown"
              onChange={handleFileChange}
              className="sr-only"
              id="article-file"
            />
            <label
              htmlFor="article-file"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Upload className="size-4" aria-hidden="true" />
              上传 .mdx
            </label>
          </div>
        </div>

        {mode === "write" ? (
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={16}
            placeholder={"## 小节标题\n\n正文内容…"}
            className={`${inputClass} mt-4 min-h-72 font-mono text-[13px] leading-6`}
            required
          />
        ) : (
          <div className="mt-4 min-h-72 max-h-[32rem] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-950">
            {content.trim() ? (
              <div className="prose prose-neutral max-w-none dark:prose-invert">
                <MarkdownContent content={content} />
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                没有可以预览的内容
              </p>
            )}
          </div>
        )}
        {fieldErrors.content ? (
          <p className="mt-1 text-xs text-rose-500">{fieldErrors.content}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="font-semibold text-neutral-950 dark:text-neutral-100">
          关联文章
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          写入 frontmatter 的 related 字段，/graph 会据此生成边。
        </p>

        {posts.length > 0 ? (
          <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            {posts.map((post) => (
              <label
                key={post.slug}
                className="flex cursor-pointer items-start gap-3 border-b border-neutral-100 px-3 py-2.5 last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60"
              >
                <input
                  type="checkbox"
                  checked={related.includes(post.slug)}
                  onChange={() => toggleRelated(post.slug)}
                  className="mt-0.5 size-4 accent-neutral-950 dark:accent-white"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-neutral-900 dark:text-neutral-100">
                    {post.title}
                  </span>
                  <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {post.slug}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            还没有可关联的文章。
          </p>
        )}

        {fieldErrors.related ? (
          <p className="mt-2 text-xs text-rose-500">{fieldErrors.related}</p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500 dark:text-neutral-400"></p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <FilePlus2 className="size-4" aria-hidden="true" />
          )}
          {submitting ? "提交中…" : "提交文章"}
        </button>
      </div>
    </form>
  );
}

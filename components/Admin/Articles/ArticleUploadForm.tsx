"use client";

import Link from "next/link";
import {
  Bold,
  Code2,
  Eye,
  FilePlus2,
  Italic,
  Link2,
  List,
  Loader2,
  PenLine,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  FormEvent,
  type KeyboardEvent,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import MarkdownContent from "@/components/Comments/Markdown/MarkdownContent";
import ArticleCategoryDialog from "@/components/Admin/ArticleCategories/components/ArticleCategoryDialog";
import useArticleCategories from "@/components/Admin/ArticleCategories/hooks/useArticleCategories";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getTodayDate,
  slugifyArticleTitle,
  stripMdxFrontmatter,
} from "@/lib/articles/helpers";

export type ArticleUploadPostOption = {
  slug: string;
  title: string;
};

export type ArticleUploadInitial = {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  related: string[];
  content: string;
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

const iconButtonClass =
  "inline-flex size-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

export default function ArticleUploadForm({
  posts,
  variant = "create",
  initialArticle,
}: {
  posts: ArticleUploadPostOption[];
  variant?: "create" | "edit";
  initialArticle?: ArticleUploadInitial;
}) {
  const isEdit = variant === "edit" && Boolean(initialArticle);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(initialArticle?.title ?? "");
  const [slug, setSlug] = useState(initialArticle?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialArticle));
  const [date, setDate] = useState(initialArticle?.date || getTodayDate());
  const [description, setDescription] = useState(
    initialArticle?.description ?? "",
  );
  const [tags, setTags] = useState<string[]>(initialArticle?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [related, setRelated] = useState<string[]>(
    initialArticle?.related ?? [],
  );
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [relatedSearch, setRelatedSearch] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [content, setContent] = useState(initialArticle?.content ?? "");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ArticleUploadResult | null>(null);
  const categories = useArticleCategories();
  const currentCategoryId =
    (isEdit
      ? categories.state?.categories.find(
          (category) =>
            typeof category.id === "string" &&
            category.posts.some((post) => post.slug === initialArticle?.slug),
        )?.id
      : null) ?? "";

  const selectedRelatedPosts = posts.filter((post) =>
    related.includes(post.slug),
  );
  const filteredRelatedPosts = posts.filter((post) => {
    const query = relatedSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      post.title.toLowerCase().includes(query) ||
      post.slug.toLowerCase().includes(query)
    );
  });

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

  function handleCategoryChange(categoryId: string) {
    if (!isEdit || !initialArticle) {
      return;
    }

    void categories.assignCategory(initialArticle.slug, categoryId || null);
  }

  function addTag() {
    const nextTag = tagInput.trim().replace(/[,，]$/, "");

    if (!nextTag) {
      return;
    }

    setTags((current) =>
      current.includes(nextTag) ? current : [...current, nextTag],
    );
    setTagInput("");
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === "，") {
      event.preventDefault();
      addTag();
    }
  }

  function toggleRelated(postSlug: string) {
    setRelated((current) =>
      current.includes(postSlug)
        ? current.filter((item) => item !== postSlug)
        : [...current, postSlug],
    );
  }

  function removeRelated(postSlug: string) {
    setRelated((current) => current.filter((item) => item !== postSlug));
  }

  function insertMarkdown(prefix: string, suffix: string, placeholder: string) {
    const textarea = bodyRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const inserted = selected || placeholder;
    const nextContent =
      content.slice(0, start) + prefix + inserted + suffix + content.slice(end);

    setContent(nextContent);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + inserted.length,
      );
    });
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

    const pendingTag = tagInput.trim();
    const submitTags =
      pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags;

    try {
      const endpoint = isEdit
        ? `/api/admin/articles/${encodeURIComponent(initialArticle!.slug)}`
        : "/api/admin/articles";
      const response = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          date,
          description,
          tags: submitTags,
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

      toast.success(isEdit ? "修改已提交到 GitHub" : "已提交到 GitHub");
      setTags(submitTags);
      setTagInput("");
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
    setTags([]);
    setTagInput("");
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
              {isEdit ? "修改已提交到 GitHub" : "已提交到 GitHub"}
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

            <div className="mt-5 flex flex-wrap gap-2">
              {isEdit ? (
                <Link
                  href={`/posts/${initialArticle!.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                  查看文章
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                  继续新建
                </button>
              )}
              <Link
                href="/admin/articles"
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                返回文章管理
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/admin/articles"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            ← 返回文章管理
          </Link>
          {isEdit ? (
            <Link
              href={`/posts/${initialArticle!.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              查看文章
            </Link>
          ) : null}
        </div>

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
          {submitting ? "提交中…" : isEdit ? "保存修改" : "发布文章"}
        </button>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <input
            id="article-title"
            aria-label="文章标题"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="文章标题"
            className="w-full border-0 bg-transparent text-3xl font-bold leading-tight text-neutral-950 outline-none placeholder:text-neutral-300 dark:text-neutral-100 dark:placeholder:text-neutral-600"
            required
          />
          {fieldErrors.title ? (
            <p className="mt-1 text-xs text-rose-500">{fieldErrors.title}</p>
          ) : null}

          <textarea
            id="article-description"
            aria-label="文章描述"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="文章简介：用于首页卡片、归档和 SEO 描述"
            className="mt-2 w-full resize-none border-0 bg-transparent text-sm leading-6 text-neutral-500 outline-none placeholder:text-neutral-400 dark:text-neutral-400 dark:placeholder:text-neutral-500"
          />
          {fieldErrors.description ? (
            <p className="mt-1 text-xs text-rose-500">
              {fieldErrors.description}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
            {mode === "write" ? (
              <>
                <button
                  type="button"
                  aria-label="加粗"
                  title="加粗"
                  onClick={() => insertMarkdown("**", "**", "加粗文字")}
                  className={iconButtonClass}
                >
                  <Bold className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="斜体"
                  title="斜体"
                  onClick={() => insertMarkdown("*", "*", "斜体")}
                  className={iconButtonClass}
                >
                  <Italic className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="插入链接"
                  title="插入链接"
                  onClick={() => insertMarkdown("[", "](https://)", "链接文字")}
                  className={iconButtonClass}
                >
                  <Link2 className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="插入列表"
                  title="插入列表"
                  onClick={() => insertMarkdown("- ", "", "列表项")}
                  className={iconButtonClass}
                >
                  <List className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="插入代码"
                  title="插入代码"
                  onClick={() => insertMarkdown("`", "`", "code")}
                  className={iconButtonClass}
                >
                  <Code2 className="size-4" aria-hidden="true" />
                </button>
              </>
            ) : null}

            <button
              type="button"
              aria-label={mode === "write" ? "预览" : "编辑"}
              title={mode === "write" ? "预览" : "编辑"}
              onClick={() => setMode(mode === "write" ? "preview" : "write")}
              className={iconButtonClass}
            >
              {mode === "write" ? (
                <Eye className="size-4" aria-hidden="true" />
              ) : (
                <PenLine className="size-4" aria-hidden="true" />
              )}
            </button>

            <span className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

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
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <Upload className="size-3.5" aria-hidden="true" />
              上传 .mdx
            </label>
          </div>

          {mode === "write" ? (
            <textarea
              ref={bodyRef}
              aria-label="正文"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={"## 小节标题\n\n正文内容…"}
              className="mt-4 min-h-[32rem] w-full resize-y border-0 bg-transparent font-mono text-[13px] leading-6 text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              required
            />
          ) : (
            <div className="mt-4 min-h-[32rem] rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 dark:border-neutral-800 dark:bg-neutral-950/40">
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

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="font-semibold text-neutral-950 dark:text-neutral-100">
              文章属性
            </h2>

            <div className="mt-4">
              <label htmlFor="article-date" className={labelClass}>
                发布日期
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

            <div className="mt-4">
              <label htmlFor="article-slug" className={labelClass}>
                Slug
              </label>
              <input
                id="article-slug"
                value={slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="react-useeffect"
                readOnly={isEdit}
                className={`${inputClass} ${isEdit ? "bg-neutral-50 text-neutral-500 dark:bg-neutral-800" : ""}`}
                required
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {isEdit
                  ? "slug 创建后不可修改。"
                  : "小写字母、数字和连字符；中文标题请手动填写。"}
              </p>
              {fieldErrors.slug ? (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.slug}</p>
              ) : null}
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="article-category"
                  className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
                >
                  分类
                </label>
                <button
                  type="button"
                  onClick={() => setCategoryDialogOpen(true)}
                  className="text-xs text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  管理分类
                </button>
              </div>
              <select
                id="article-category"
                value={currentCategoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                disabled={
                  !isEdit ||
                  categories.loading ||
                  Boolean(categories.error) ||
                  Boolean(categories.pendingKey)
                }
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 dark:disabled:bg-neutral-800`}
              >
                <option value="">未分类</option>
                {(categories.state?.categories ?? [])
                  .filter((category) => typeof category.id === "string")
                  .map((category) => (
                    <option key={category.id} value={category.id ?? ""}>
                      {category.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {isEdit
                  ? "修改后立即生效，不需要发布文章。"
                  : "新文章发布并部署后，可在编辑页设置分类。"}
              </p>
            </div>

            <div className="mt-4">
              <label htmlFor="article-tags" className={labelClass}>
                标签
              </label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`移除标签 ${tag}`}
                      onClick={() =>
                        setTags((current) =>
                          current.filter((item) => item !== tag),
                        )
                      }
                      className="text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <input
                  id="article-tags"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                  placeholder={tags.length ? "继续添加…" : "react, hooks"}
                  className="min-w-24 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                回车或逗号添加
              </p>
              {fieldErrors.tags ? (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.tags}</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-neutral-950 dark:text-neutral-100">
                关联文章
              </h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                已关联 {selectedRelatedPosts.length} 篇
              </span>
            </div>

            {selectedRelatedPosts.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {selectedRelatedPosts.map((post) => (
                  <li
                    key={post.slug}
                    className="flex items-center justify-between gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    <span className="truncate">{post.title}</span>
                    <button
                      type="button"
                      aria-label={`取消关联 ${post.title}`}
                      onClick={() => removeRelated(post.slug)}
                      className="shrink-0 text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                暂未关联文章
              </p>
            )}

            <button
              type="button"
              onClick={() => setRelatedOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-100"
            >
              <Plus className="size-4" aria-hidden="true" />
              添加关联
            </button>
          </section>
        </aside>
      </div>

      <Dialog open={relatedOpen} onOpenChange={setRelatedOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle>关联文章</DialogTitle>
          <DialogDescription>
            搜索并选择要和这篇文章建立图谱关联的文章。
          </DialogDescription>

          <div className="mt-4 flex flex-wrap gap-2">
            {selectedRelatedPosts.length > 0 ? (
              selectedRelatedPosts.map((post) => (
                <span
                  key={post.slug}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {post.title}
                  <button
                    type="button"
                    aria-label={`取消关联 ${post.title}`}
                    onClick={() => removeRelated(post.slug)}
                    className="text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                已选择 0 篇
              </span>
            )}
          </div>

          <div className="relative mt-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              value={relatedSearch}
              onChange={(event) => setRelatedSearch(event.target.value)}
              placeholder="搜索并关联文章..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            {filteredRelatedPosts.length > 0 ? (
              filteredRelatedPosts.map((post) => (
                <label
                  key={post.slug}
                  className="flex cursor-pointer items-start gap-3 border-b border-neutral-100 px-3 py-3 last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60"
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
              ))
            ) : (
              <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
                没有匹配的文章
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                完成
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <ArticleCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        state={categories.state}
        loading={categories.loading}
        error={categories.error}
        pendingKey={categories.pendingKey}
        retry={categories.retry}
        createCategory={categories.createCategory}
        renameCategory={categories.renameCategory}
        deleteCategory={categories.deleteCategory}
        moveCategory={categories.moveCategory}
      />
    </form>
  );
}

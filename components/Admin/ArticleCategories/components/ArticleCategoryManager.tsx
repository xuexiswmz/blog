"use client";

import type {
  ArticleNavigationGroup,
  ArticleNavigationPost,
} from "@/lib/articleCategories/types";
import { FormEvent, useState } from "react";
import useArticleCategories from "../hooks/useArticleCategories";

type CategoryActions = ReturnType<typeof useArticleCategories>;

function CategorySelect({
  post,
  categoryId,
  categories,
  actions,
}: {
  post: ArticleNavigationPost;
  categoryId: string | null;
  categories: ArticleNavigationGroup[];
  actions: CategoryActions;
}) {
  return (
    <select
      aria-label={`设置文章 ${post.title} 的分类`}
      value={categoryId ?? ""}
      disabled={actions.pendingKey === `post:${post.slug}:assign`}
      onChange={(event) =>
        void actions.assignCategory(post.slug, event.target.value || null)
      }
      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
    >
      <option value="">未分类</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id ?? ""}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

function ArticleRow({
  post,
  category,
  categories,
  index,
  actions,
}: {
  post: ArticleNavigationPost;
  category: ArticleNavigationGroup | null;
  categories: ArticleNavigationGroup[];
  index: number;
  actions: CategoryActions;
}) {
  const moving = actions.pendingKey === `post:${post.slug}:move`;
  return (
    <li className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-3 first:border-t-0">
      <span className="min-w-48 flex-1 text-sm font-medium">{post.title}</span>
      <CategorySelect
        post={post}
        categoryId={category?.id ?? null}
        categories={categories}
        actions={actions}
      />
      {category ? (
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={`上移文章 ${post.title}`}
            disabled={moving || index === 0}
            onClick={() => void actions.movePost(post.slug, "up")}
            className="rounded border border-border px-2 py-1 disabled:opacity-35"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`下移文章 ${post.title}`}
            disabled={moving || index === category.posts.length - 1}
            onClick={() => void actions.movePost(post.slug, "down")}
            className="rounded border border-border px-2 py-1 disabled:opacity-35"
          >
            ↓
          </button>
        </div>
      ) : null}
    </li>
  );
}

function CategorySection({
  category,
  categories,
  index,
  actions,
}: {
  category: ArticleNavigationGroup;
  categories: ArticleNavigationGroup[];
  index: number;
  actions: CategoryActions;
}) {
  const [name, setName] = useState(category.name);
  const moving = actions.pendingKey === `category:${category.id}:move`;
  const renaming = actions.pendingKey === `category:${category.id}:rename`;
  const deleting = actions.pendingKey === `category:${category.id}:delete`;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2 bg-muted/60 p-3">
        <input
          aria-label={`分类 ${category.name} 名称`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-w-40 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={renaming || !name.trim() || name.trim() === category.name}
          onClick={() => void actions.renameCategory(category.id!, name)}
          className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-35"
        >
          保存名称
        </button>
        <button
          type="button"
          aria-label={`上移分类 ${category.name}`}
          disabled={moving || index === 0}
          onClick={() => void actions.moveCategory(category.id!, "up")}
          className="rounded border border-border px-2 py-1 disabled:opacity-35"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`下移分类 ${category.name}`}
          disabled={moving || index === categories.length - 1}
          onClick={() => void actions.moveCategory(category.id!, "down")}
          className="rounded border border-border px-2 py-1 disabled:opacity-35"
        >
          ↓
        </button>
        <button
          type="button"
          aria-label={`删除分类 ${category.name}`}
          disabled={deleting || category.posts.length > 0}
          onClick={() => void actions.deleteCategory(category.id!)}
          className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-35 dark:border-red-900 dark:text-red-400"
        >
          删除
        </button>
      </div>
      {category.posts.length > 0 ? (
        <>
          <p className="px-3 pt-3 text-xs text-muted-foreground">
            移动全部文章后才能删除分类
          </p>
          <ul>
            {category.posts.map((post, articleIndex) => (
              <ArticleRow
                key={post.slug}
                post={post}
                category={category}
                categories={categories}
                index={articleIndex}
                actions={actions}
              />
            ))}
          </ul>
        </>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">该分类暂无文章</p>
      )}
    </section>
  );
}

export default function ArticleCategoryManager() {
  const actions = useArticleCategories();
  const [newName, setNewName] = useState("");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) return;
    if (await actions.createCategory(newName.trim())) setNewName("");
  }

  if (actions.loading && !actions.state) {
    return <p className="mt-6 text-sm text-muted-foreground">正在读取分类…</p>;
  }

  if (!actions.state) {
    return (
      <div className="mt-6 rounded-xl border border-red-200 p-4 dark:border-red-900">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {actions.error || "读取文章分类失败"}
        </p>
        <button
          type="button"
          onClick={actions.retry}
          className="mt-3 rounded-md bg-foreground px-3 py-2 text-sm text-background"
        >
          重试
        </button>
      </div>
    );
  }

  const { categories, unassignedPosts } = actions.state;
  return (
    <div className="mt-6 space-y-8">
      {actions.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {actions.error}
        </p>
      ) : null}
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="new-category-name">
          新分类名称
        </label>
        <input
          id="new-category-name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="新分类名称"
          className="min-w-56 flex-1 rounded-md border border-border bg-background px-3 py-2"
        />
        <button
          type="submit"
          disabled={actions.pendingKey === "category:create" || !newName.trim()}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
        >
          创建分类
        </button>
      </form>

      <div className="space-y-4">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有分类，请先创建。</p>
        ) : (
          categories.map((category, index) => (
            <CategorySection
              key={`${category.id}:${category.name}`}
              category={category}
              categories={categories}
              index={index}
              actions={actions}
            />
          ))
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-border">
        <div className="bg-muted/60 p-3">
          <h2 className="font-semibold">未分类文章</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            选择分类后，文章会追加到该分类末尾。
          </p>
        </div>
        {unassignedPosts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">没有未分类文章</p>
        ) : (
          <ul>
            {unassignedPosts.map((post, index) => (
              <ArticleRow
                key={post.slug}
                post={post}
                category={null}
                categories={categories}
                index={index}
                actions={actions}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

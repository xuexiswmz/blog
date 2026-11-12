"use client";

import { type FormEvent, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  ArticleCategoryAdminState,
  ArticleNavigationGroup,
} from "@/lib/articleCategories/types";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type ArticleCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: ArticleCategoryAdminState | null;
  loading: boolean;
  error: string;
  pendingKey: string | null;
  retry: () => void;
  createCategory: (name: string) => Promise<boolean>;
  renameCategory: (categoryId: string, name: string) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  moveCategory: (
    categoryId: string,
    direction: "up" | "down",
  ) => Promise<boolean>;
};

type CategoryWithId = ArticleNavigationGroup & { id: string };

function getCategories(
  state: ArticleCategoryAdminState | null,
): CategoryWithId[] {
  return (state?.categories ?? []).filter(
    (category): category is CategoryWithId =>
      typeof category.id === "string",
  );
}

export default function ArticleCategoryDialog({
  open,
  onOpenChange,
  state,
  loading,
  error,
  pendingKey,
  retry,
  createCategory,
  renameCategory,
  deleteCategory,
  moveCategory,
}: ArticleCategoryDialogProps) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draftName, setDraftName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const categories = getCategories(state);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(normalizedQuery),
  );
  const formPending =
    editingId === "new"
      ? pendingKey === "category:create"
      : editingId
        ? pendingKey === `category:${editingId}:rename`
        : false;

  function resetLocalState() {
    setEditingId(null);
    setDraftName("");
    setDeleteId(null);
    setQuery("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetLocalState();
    }

    onOpenChange(nextOpen);
  }

  function startCreate() {
    setEditingId("new");
    setDraftName("");
    setDeleteId(null);
  }

  function startRename(category: CategoryWithId) {
    setEditingId(category.id);
    setDraftName(category.name);
    setDeleteId(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftName("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();

    if (!name || !editingId) {
      return;
    }

    const success =
      editingId === "new"
        ? await createCategory(name)
        : await renameCategory(editingId, name);

    if (success) {
      cancelEditing();
    }
  }

  async function handleDelete(categoryId: string) {
    const success = await deleteCategory(categoryId);

    if (success) {
      setDeleteId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between gap-3 pr-6">
          <DialogTitle>分类管理</DialogTitle>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            新增分类
          </button>
        </div>

        <DialogDescription className="mt-1 text-xs">
          分类下有文章时不能删除。
        </DialogDescription>

        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索分类"
            aria-label="搜索分类"
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            正在加载分类...
          </p>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <p>{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-2 text-xs font-medium underline underline-offset-4"
            >
              重试
            </button>
          </div>
        ) : (
          <ul className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            {editingId === "new" ? (
              <li className="border-b border-neutral-100 px-3 py-2 last:border-b-0 dark:border-neutral-800">
                <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
                  <input
                    id="category-name"
                    autoFocus
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="新分类名称"
                    className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-950 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    type="submit"
                    aria-label="保存新分类"
                    disabled={formPending || !draftName.trim()}
                    className="inline-flex size-8 items-center justify-center rounded-full bg-neutral-950 text-white transition-colors hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-neutral-950"
                  >
                    {formPending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Check className="size-4" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="取消新增"
                    disabled={formPending}
                    onClick={cancelEditing}
                    className="inline-flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-40 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </form>
              </li>
            ) : null}

            {visibleCategories.map((category, index) => {
              const categoryPending =
                pendingKey?.startsWith(`category:${category.id}:`) ?? false;
              const isEditing = editingId === category.id;

              return (
                <li
                  key={category.id}
                  className="border-b border-neutral-100 px-3 py-2 last:border-b-0 dark:border-neutral-800"
                >
                  {isEditing ? (
                    <form
                      onSubmit={handleSubmit}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        id="category-name"
                        autoFocus
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-950 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      />
                      <button
                        type="submit"
                        aria-label="保存分类名称"
                        disabled={formPending || !draftName.trim()}
                        className="inline-flex size-8 items-center justify-center rounded-full bg-neutral-950 text-white transition-colors hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-neutral-950"
                      >
                        {formPending ? (
                          <Loader2
                            className="size-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Check className="size-4" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="取消修改"
                        disabled={formPending}
                        onClick={cancelEditing}
                        className="inline-flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-40 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-neutral-900 dark:text-neutral-100">
                          {category.name}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          {category.posts.length} 篇文章
                        </p>
                      </div>

                      <button
                        type="button"
                        aria-label={`上移分类 ${category.name}`}
                        disabled={categoryPending || index === 0}
                        onClick={() => void moveCategory(category.id, "up")}
                        className="inline-flex size-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      >
                        <ChevronUp className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`下移分类 ${category.name}`}
                        disabled={
                          categoryPending ||
                          index === visibleCategories.length - 1
                        }
                        onClick={() => void moveCategory(category.id, "down")}
                        className="inline-flex size-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      >
                        <ChevronDown className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`重命名分类 ${category.name}`}
                        disabled={categoryPending}
                        onClick={() => startRename(category)}
                        className="inline-flex size-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`删除分类 ${category.name}`}
                        disabled={categoryPending}
                        onClick={() => setDeleteId(category.id)}
                        className="inline-flex size-7 items-center justify-center rounded-full text-neutral-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {deleteId === category.id && !isEditing ? (
                    <div className="mt-1.5 flex items-center justify-end gap-2 text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        确认删除？
                      </span>
                      <button
                        type="button"
                        aria-label={`确认删除分类 ${category.name}`}
                        disabled={categoryPending}
                        onClick={() => void handleDelete(category.id)}
                        className="font-medium text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400"
                      >
                        删除
                      </button>
                      <button
                        type="button"
                        disabled={categoryPending}
                        onClick={() => setDeleteId(null)}
                        className="text-neutral-500 hover:underline disabled:opacity-50 dark:text-neutral-400"
                      >
                        取消
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}

            {visibleCategories.length === 0 && editingId !== "new" ? (
              <li className="px-3 py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
                {query ? "没有匹配的分类" : "还没有分类"}
              </li>
            ) : null}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <button
              type="button"
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              完成
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

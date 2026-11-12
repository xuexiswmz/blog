"use client";

import { useState } from "react";
import { FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";
import useArticleCategories from "../hooks/useArticleCategories";
import ArticleCategoryDialog from "./ArticleCategoryDialog";

function CategoryDialogContainer({ onClose }: { onClose: () => void }) {
  const categories = useArticleCategories();

  return (
    <ArticleCategoryDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
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
  );
}

export default function ArticleCategoryButton({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
          className,
        )}
      >
        <FolderTree className="size-4" aria-hidden="true" />
        分类管理
      </button>

      {open ? (
        <CategoryDialogContainer onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

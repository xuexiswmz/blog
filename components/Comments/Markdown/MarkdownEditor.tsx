"use client";

import {
  Bold,
  Code,
  Code2,
  Italic,
  TextQuote,
  List,
  ListOrdered,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import MarkdownContent from "./MarkdownContent";

type MarkdownEditorProps = {
  id: string;
  value: string;
  placeholder: string;
  maxLength?: number;
  onChange: (value: string) => void;
  variant?: "default" | "composer";
  footerActions?: ReactNode;
  className?: string;
};

type SelectionContext = {
  selectedText: string;
  beforeText: string;
  afterText: string;
};

type SelectionEdit = {
  replacement: string;
  selectionStart: number;
  selectionEnd: number;
};

type ListType = "ordered" | "unordered";

function FormatButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="shrink-0 rounded-full p-2 text-sky-500 transition-colors hover:bg-sky-500/10"
    >
      {children}
    </button>
  );
}

function CharacterCounter({ count, max }: { count: number; max: number }) {
  const remaining = Math.max(max - count, 0);
  const progress = Math.min(count / max, 1);
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const nearLimit = remaining <= 20;

  return (
    <span
      className="relative inline-flex size-6 shrink-0 items-center justify-center"
      title={`${count}/${max}`}
      aria-label={`已输入 ${count} 个字符，最多 ${max} 个`}
    >
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          strokeWidth="2"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={nearLimit ? "stroke-rose-500" : "stroke-sky-500"}
        />
      </svg>

      {nearLimit && (
        <span className="absolute text-[9px] font-semibold tabular-nums text-rose-500">
          {remaining}
        </span>
      )}
    </span>
  );
}

export default function MarkdownEditor({
  id,
  value,
  placeholder,
  maxLength = 1000,
  onChange,
  variant = "default",
  footerActions,
  className,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const characterCount = [...value.trim()].length;
  const isComposer = variant === "composer";

  function applySelectionEdit(
    createEdit: (context: SelectionContext) => SelectionEdit,
  ) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeText = value.slice(0, start);
    const selectedText = value.slice(start, end);
    const afterText = value.slice(end);

    const edit = createEdit({
      beforeText,
      selectedText,
      afterText,
    });

    const nextValue = beforeText + edit.replacement + afterText;

    if (nextValue.length > maxLength) {
      return;
    }

    onChange(nextValue);

    requestAnimationFrame(() => {
      const currentTextarea = textareaRef.current;

      if (!currentTextarea) {
        return;
      }

      currentTextarea.focus();

      currentTextarea.setSelectionRange(
        start + edit.selectionStart,
        start + edit.selectionEnd,
      );
    });
  }

  function insertMarkdown({
    prefix,
    suffix,
    placeholder,
  }: {
    prefix: string;
    suffix: string;
    placeholder: string;
  }) {
    applySelectionEdit(({ selectedText }) => {
      const insertedContent = selectedText || placeholder;

      return {
        replacement: prefix + insertedContent + suffix,
        selectionStart: prefix.length,
        selectionEnd: prefix.length + insertedContent.length,
      };
    });
  }

  function insertBold() {
    insertMarkdown({
      prefix: "**",
      suffix: "**",
      placeholder: "加粗文字",
    });
  }

  function insertItalic() {
    insertMarkdown({
      prefix: "*",
      suffix: "*",
      placeholder: "斜体",
    });
  }

  function insertInlineCode() {
    insertMarkdown({
      prefix: "`",
      suffix: "`",
      placeholder: "code",
    });
  }

  function insertCodeBlock() {
    insertMarkdown({
      prefix: "\n\n```tsx\n",
      suffix: "\n```\n\n",
      placeholder: "// 在这里输入代码",
    });
  }

  function insertQuote() {
    applySelectionEdit(({ selectedText, beforeText, afterText }) => {
      const sourceText = selectedText || "引用内容";
      const quotedText = sourceText
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");

      const leadingNewLine =
        beforeText && !beforeText.endsWith("\n") ? "\n" : "";

      const trailingNewLine =
        afterText && !afterText.startsWith("\n") ? "\n" : "";

      const quoteStart = leadingNewLine.length;

      return {
        replacement: leadingNewLine + quotedText + trailingNewLine,
        selectionStart: selectedText ? quoteStart : quoteStart + 2,
        selectionEnd: selectedText
          ? quoteStart + quotedText.length
          : quoteStart + 2 + sourceText.length,
      };
    });
  }

  function insertList(listType: ListType) {
    applySelectionEdit(({ selectedText, beforeText, afterText }) => {
      const sourceText = selectedText || "列表项";

      const listText = sourceText
        .split("\n")
        .map((line, index) => {
          const prefix = listType === "ordered" ? `${index + 1}.` : "- ";
          return prefix + line;
        })
        .join("\n");

      const leadingNewLine =
        beforeText && !beforeText.endsWith("\n") ? "\n" : "";

      const trailingNewLine =
        afterText && !afterText.startsWith("\n") ? "\n" : "";

      const listStart = leadingNewLine.length;

      const firstPrefixLength =
        listType === "ordered" ? "1. ".length : "- ".length;

      return {
        replacement: leadingNewLine + listText + trailingNewLine,
        selectionStart: selectedText
          ? listStart
          : listStart + firstPrefixLength,
        selectionEnd: selectedText
          ? listStart + listText.length
          : listStart + firstPrefixLength + sourceText.length,
      };
    });
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        isComposer
          ? "h-full flex-1"
          : "overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-sky-500 dark:border-[#333333] dark:bg-[#181818]",
        className,
      )}
    >
      {mode === "write" ? (
        <textarea
          id={id}
          ref={textareaRef}
          value={value}
          rows={3}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className={cn(
            "w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-400",
            isComposer
              ? "min-h-0 flex-1 resize-none px-0 py-3 text-lg leading-7"
              : "scrollbar-hide min-h-24 resize-y px-4 py-2 text-base",
          )}
        />
      ) : (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            isComposer ? "py-3" : "min-h-24 px-4 py-2",
          )}
        >
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-base text-slate-400">没有可以预览的内容</p>
          )}
        </div>
      )}

      <div
        className={cn(
          isComposer
            ? "mt-auto flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
            : "flex items-center justify-between border-t border-slate-200 px-2 py-2 dark:border-[#303030]",
        )}
      >
        <div className="scrollbar-hide flex min-w-0 items-center gap-0.5 overflow-x-auto">
          {mode === "write" && (
            <>
              <FormatButton label="加粗" onClick={insertBold}>
                <Bold className="size-5" />
              </FormatButton>
              <FormatButton label="斜体" onClick={insertItalic}>
                <Italic className="size-5" />
              </FormatButton>
              <FormatButton label="插入行内代码" onClick={insertInlineCode}>
                <Code className="size-5" />
              </FormatButton>
              <FormatButton label="插入代码块" onClick={insertCodeBlock}>
                <Code2 className="size-5" />
              </FormatButton>
              <FormatButton label="插入引用" onClick={insertQuote}>
                <TextQuote className="size-5" />
              </FormatButton>
              <FormatButton
                label="插入无序列表"
                onClick={() => {
                  insertList("unordered");
                }}
              >
                <List className="size-5" />
              </FormatButton>
              <FormatButton
                label="插入有序列表"
                onClick={() => {
                  insertList("ordered");
                }}
              >
                <ListOrdered className="size-5" />
              </FormatButton>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {isComposer ? (
            <CharacterCounter count={characterCount} max={maxLength} />
          ) : (
            <span className="text-xs text-slate-400">
              {characterCount}/{maxLength}
            </span>
          )}

          {isComposer ? (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "write" ? "preview" : "write");
              }}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#242424]"
            >
              {mode === "write" ? "预览" : "编辑"}
            </button>
          ) : (
            <div className="flex items-center rounded-full bg-slate-100 p-1 dark:bg-[#242424]">
              <button
                type="button"
                aria-pressed={mode === "write"}
                onClick={() => setMode("write")}
                className={
                  mode === "write"
                    ? "rounded-full bg-white px-3 py-1 text-sm shadow-sm dark:bg-[#3a3a3a] dark:text-zinc-100"
                    : "rounded-full px-3 py-1 text-sm text-slate-500 dark:text-zinc-400"
                }
              >
                编辑
              </button>
              <button
                type="button"
                aria-pressed={mode === "preview"}
                onClick={() => setMode("preview")}
                className={
                  mode === "preview"
                    ? "rounded-full bg-white px-3 py-1 text-sm shadow-sm dark:bg-[#3a3a3a] dark:text-zinc-100"
                    : "rounded-full px-3 py-1 text-sm text-slate-500 dark:text-zinc-400"
                }
              >
                预览
              </button>
            </div>
          )}

          {isComposer && footerActions}
        </div>
      </div>
    </div>
  );
}

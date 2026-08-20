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
import { useRef, useState } from "react";
import MarkdownContent from "./MarkdownContent";

type MarkdownEditorProps = {
  id: string;
  value: string;
  placeholder: string;
  maxLength?: number;
  onChange: (value: string) => void;
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

export default function MarkdownEditor({
  id,
  value,
  placeholder,
  maxLength = 1000,
  onChange,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const characterCount = [...value.trim()].length;

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
    <div className=" overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-sky-500 dark:border-[#333333] dark:bg-[#181818]">
      {/* 输入框 */}
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
          className="scrollbar-hide min-h-24 w-full resize-y bg-transparent px-4 py-2 text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-400"
        />
      ) : (
        <div className="min-h-24 px-4 py-2">
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-slate-400 text-base">没有可以预览的内容</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-200 px-2 py-2 dark:border-[#303030]">
        {/* 加粗、斜体、行内代码、代码块 */}
        <div className="flex items-center gap-1">
          {mode === "write" && (
            <>
              <button
                type="button"
                aria-label="加粗"
                title="加粗"
                onClick={insertBold}
                className="rounded-full p-2 text-sky-500 transition-colors hover:bg-sky-500/10"
              >
                <Bold className="size-5" />
              </button>

              <button
                type="button"
                aria-label="斜体"
                title="斜体"
                onClick={insertItalic}
                className="rounded-full p-2 text-sky-500 transition-colors hover:bg-sky-500/10"
              >
                <Italic className="size-5" />
              </button>

              <button
                type="button"
                aria-label="插入行内代码"
                title="插入行内代码"
                onClick={insertInlineCode}
                className="rounded-full p-2 text-sky-500 transition-colors hover:bg-sky-500/10"
              >
                <Code className="size-5" />
              </button>

              <button
                type="button"
                aria-label="插入代码块"
                title="插入代码块"
                onClick={insertCodeBlock}
                className="rounded-full p-2 text-sky-500 transition-colors hover:bg-sky-500/10"
              >
                <Code2 className="size-5" />
              </button>

              <button
                type="button"
                aria-label="插入引用"
                title="插入引用"
                onClick={insertQuote}
                className="rounded-full p-2 text-sky-500 transition-colors hover:bg-sky-500/10"
              >
                <TextQuote className="size-5" />
              </button>

              <button
                type="button"
                aria-label="插入无序列表"
                title="无序列表"
                onClick={() => {
                  insertList("unordered");
                }}
                className=" rounded-full p-2 text-sky-500 transition-colors hover:bg-sky-500/10"
              >
                <List className="size-5" />
              </button>

              <button
                type="button"
                aria-label="插入有序列表"
                title="有序列表"
                onClick={() => {
                  insertList("ordered");
                }}
                className=" rounded-full p-2 text-sky-500 transition-colors hover:bg-sky-500/10"
              >
                <ListOrdered className="size-5" />
              </button>
            </>
          )}
        </div>

        {/* 编辑和预览按钮 */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {characterCount}/{maxLength}
          </span>
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
        </div>
      </div>
    </div>
  );
}

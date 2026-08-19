import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
};

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div
      className=" 
        max-w-none 
        wrap-break-word 
        text-slate-700
       dark:text-slate-200

        [&_p]:my-1
        [&_blockquote]: my-3
        [&_blockquote]:border-l-4
      [&_blockquote]:border-sky-400
      [&_blockquote]:bg-sky-50/60
        [&_blockquote]:py-1
        [&_blockquote]:pl-4
      [&_blockquote]:text-slate-600

      dark:[&_blockquote]:border-sky-500
      dark:[&_blockquote]:bg-[#1d1d1d]
      dark:[&_blockquote]:text-slate-300

        [&_code]:rounded
      [&_code]:bg-slate-100
        [&_code]:px-1.5
        [&_code]:py-0.5
        [&_code]:font-mono
        [&_code]:text-[0.9em]

        dark:[&_code]:bg-[#2a2a2a]
        dark:[&_code]:text-zinc-100

        [&_pre]:my-3
        [&_pre]:overflow-x-auto
        [&_pre]:rounded-xl
      [&_pre]:bg-[#0d0d0d]
        [&_pre]:p-4
      [&_pre]:text-slate-100
        [&_pre]:border
      [&_pre]:border-slate-200
      dark:[&_pre]:border-[#303030]

        [&_pre_code]:bg-transparent
        [&_pre_code]:p-0
        [&_pre_code]:text-inherit
        "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  );
}

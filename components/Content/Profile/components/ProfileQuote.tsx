import type { ProfileQuoteProps } from "../types/profile";

export default function ProfileQuote({
  isEnglish,
  text,
  author,
}: ProfileQuoteProps) {
  return (
    <div data-profile-item className="w-full transform-3d">
      <blockquote
        className={`border-t border-slate-200/80 pt-4 font-serif text-slate-500 dark:border-white/10 dark:text-slate-400 ${
          isEnglish
            ? "transform-[translateZ(7px)]"
            : "transform-[translate3d(0,-40px,7px)]"
        }`}
      >
        <p
          className={`text-pretty ${
            isEnglish ? "text-sm leading-6" : "text-[15px] leading-7"
          }`}
        >
          {text}
        </p>

        <footer className="mt-2 text-right text-xs tracking-wide text-slate-400 dark:text-slate-500">
          {author}
        </footer>
      </blockquote>
    </div>
  );
}

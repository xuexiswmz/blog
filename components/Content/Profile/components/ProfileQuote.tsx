import type { ProfileQuoteProps } from "../types/profile";

export default function ProfileQuote({
  isEnglish,
  text,
  author,
}: ProfileQuoteProps) {
  return (
    <div data-profile-item className="w-full transform-3d">
      <blockquote
        className={`border-t border-slate-200/80 pt-[clamp(0.625rem,1.8vh,1rem)] font-serif text-slate-500 dark:border-white/10 dark:text-slate-400 ${
          isEnglish
            ? "transform-[translateZ(7px)]"
            : "transform-[translateZ(6px)]"
        }`}
      >
        <p
          className={`text-pretty ${
            isEnglish
              ? "text-[clamp(0.75rem,1.65vh,0.875rem)] leading-[clamp(1.125rem,2.6vh,1.5rem)]"
              : "text-[clamp(0.8125rem,1.75vh,0.9375rem)] leading-[clamp(1.25rem,2.9vh,1.75rem)]"
          }`}
        >
          {text}
        </p>

        <footer className="mt-[clamp(0.375rem,1vh,0.5rem)] text-right text-[clamp(0.625rem,1.35vh,0.75rem)] tracking-wide text-slate-400 dark:text-slate-500">
          {author}
        </footer>
      </blockquote>
    </div>
  );
}

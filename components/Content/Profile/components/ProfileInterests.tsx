import { PROFILE_SKILLS } from "../constants/profile";
import type { ProfileInterestsProps } from "../types/profile";

/** 技术栈和写作方向共享同一个进入动画分组。 */
export default function ProfileInterests({
  isEnglish,
  skillsTitle,
  writingTitle,
  writingTopics,
}: ProfileInterestsProps) {
  return (
    <div data-profile-item className="w-full space-y-3 transform-3d">
      <section
        className={
          isEnglish
            ? "transform-[translateZ(15px)]"
            : "transform-[translate3d(0,-32px,15px)]"
        }
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          {skillsTitle}
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {PROFILE_SKILLS.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-blue-100 bg-blue-50/80 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:border-blue-400/15 dark:bg-blue-400/10 dark:text-blue-200"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>

      <section
        className={
          isEnglish
            ? "transform-[translateZ(11px)]"
            : "transform-[translate3d(0,-22px,11px)]"
        }
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          {writingTitle}
        </h3>

        <div className="flex flex-wrap gap-x-3 gap-y-2 text-[13px] leading-5 text-slate-600 dark:text-slate-300">
          {writingTopics.map((topic) => (
            <span
              key={topic}
              className="whitespace-nowrap rounded-md bg-slate-100/80 px-2 py-1 dark:bg-white/6"
            >
              #{topic}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

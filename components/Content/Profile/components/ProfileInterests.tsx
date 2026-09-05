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
    <div
      data-profile-item
      className="w-full space-y-[clamp(0.625rem,1.6vh,0.75rem)] transform-3d"
    >
      <section
        className={
          isEnglish
            ? "transform-[translateZ(15px)]"
            : "transform-[translateZ(14px)]"
        }
      >
        <h3 className="mb-[clamp(0.375rem,1vh,0.5rem)] text-[clamp(0.5625rem,1.15vh,0.625rem)] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          {skillsTitle}
        </h3>

        <div className="flex flex-wrap gap-[clamp(0.25rem,0.7vh,0.375rem)]">
          {PROFILE_SKILLS.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-blue-100 bg-blue-50/80 px-[clamp(0.5rem,1.1vh,0.625rem)] py-[clamp(0.125rem,0.55vh,0.25rem)] text-[clamp(0.625rem,1.35vh,0.6875rem)] font-medium text-blue-700 dark:border-blue-400/15 dark:bg-blue-400/10 dark:text-blue-200"
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
            : "transform-[translateZ(10px)]"
        }
      >
        <h3 className="mb-[clamp(0.375rem,1vh,0.5rem)] text-[clamp(0.5625rem,1.15vh,0.625rem)] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          {writingTitle}
        </h3>

        <div className="flex flex-wrap gap-x-[clamp(0.5rem,1.4vh,0.75rem)] gap-y-[clamp(0.375rem,1vh,0.5rem)] text-[clamp(0.6875rem,1.55vh,0.8125rem)] leading-[clamp(1rem,2.3vh,1.25rem)] text-slate-600 dark:text-slate-300">
          {writingTopics.map((topic) => (
            <span
              key={topic}
              className="whitespace-nowrap rounded-md bg-slate-100/80 px-[clamp(0.375rem,0.9vh,0.5rem)] py-[clamp(0.125rem,0.55vh,0.25rem)] dark:bg-white/6"
            >
              #{topic}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

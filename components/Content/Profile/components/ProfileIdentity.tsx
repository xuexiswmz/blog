import type { ProfileIdentityProps } from "../types/profile";

export default function ProfileIdentity({
  isEnglish,
  role,
}: ProfileIdentityProps) {
  return (
    <div data-profile-item className="w-full transform-3d">
      <div className="text-center transform-[translateZ(22px)]">
        <h2 className="text-[clamp(1rem,2.4vh,1.25rem)] font-bold tracking-tight text-slate-950 dark:text-white">
          xuexiswmz
        </h2>

        <p
          className={`mt-[clamp(0.125rem,0.6vh,0.25rem)] font-medium text-slate-500 dark:text-slate-400 ${
            isEnglish
              ? "text-[clamp(0.6875rem,1.55vh,0.8125rem)] tracking-tight"
              : "text-[clamp(0.75rem,1.7vh,0.875rem)]"
          }`}
        >
          {role}
        </p>
      </div>
    </div>
  );
}

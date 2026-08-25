import type { ProfileIdentityProps } from "../types/profile";

export default function ProfileIdentity({
  isEnglish,
  role,
}: ProfileIdentityProps) {
  return (
    <div data-profile-item className="w-full transform-3d">
      <div className="text-center transform-[translateZ(22px)]">
        <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
          xuexiswmz
        </h2>

        <p
          className={`mt-1 font-medium text-slate-500 dark:text-slate-400 ${
            isEnglish ? "text-[13px] tracking-tight" : "text-sm"
          }`}
        >
          {role}
        </p>
      </div>
    </div>
  );
}

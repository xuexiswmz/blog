import Image from "next/image";
import type { ProfileLanguageProps } from "../types/profile";

export default function ProfileAvatar({ isEnglish }: ProfileLanguageProps) {
  return (
    <div data-profile-avatar className="transform-3d">
      <div
        className={`relative ${
          isEnglish
            ? "transform-[translateZ(30px)]"
            : "transform-[translateZ(28px)]"
        }`}
      >
        <div className="absolute inset-1 rounded-2xl bg-blue-400/25 blur-xl dark:bg-blue-500/20" />

        <Image
          src="/avatar.jpeg"
          width={88}
          height={88}
          sizes="(max-height: 700px) 56px, 80px"
          alt="xuexiswmz 的头像"
          className="relative size-[clamp(3.5rem,10vh,5rem)] rounded-[clamp(0.625rem,1.6vh,0.75rem)] object-cover ring-[clamp(2px,0.5vh,4px)] ring-white/80 dark:ring-white/10"
          priority
        />

        <span className="absolute -bottom-1 -right-1 size-[clamp(0.75rem,2vh,1rem)] rounded-full border-2 border-white bg-emerald-400 dark:border-[#0d1117]" />
      </div>
    </div>
  );
}

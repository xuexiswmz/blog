import Image from "next/image";
import type { ProfileLanguageProps } from "../types/profile";

export default function ProfileAvatar({ isEnglish }: ProfileLanguageProps) {
  return (
    <div data-profile-avatar className="transform-3d">
      <div
        className={`relative ${
          isEnglish
            ? "transform-[translateZ(30px)]"
            : "transform-[translate3d(0,32px,30px)]"
        }`}
      >
        <div className="absolute inset-1 rounded-2xl bg-blue-400/25 blur-xl dark:bg-blue-500/20" />

        <Image
          src="/avatar.jpeg"
          width={88}
          height={88}
          sizes="80px"
          alt="xuexiswmz 的头像"
          className="relative size-20 rounded-xl object-cover ring-4 ring-white/80 dark:ring-white/10"
          priority
        />

        <span className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white bg-emerald-400 dark:border-[#0d1117]" />
      </div>
    </div>
  );
}

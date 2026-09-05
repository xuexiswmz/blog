import type { ProfileCardProps } from "../types/profile";

/** Profile 的稳定感应区域和 3D 卡片外壳。 */
export default function ProfileCard({
  children,
  rootRef,
  entryRef,
  cardRef,
  onPointerMove,
  onPointerLeave,
}: ProfileCardProps) {
  return (
    <aside
      ref={rootRef}
      className="hidden h-full w-[clamp(15rem,20vw,18rem)] flex-none shrink-0 self-start md:flex perspective-distant"
    >
      <div
        ref={entryRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="h-full w-full transform-3d"
      >
        <div
          ref={cardRef}
          className="scrollbar-hide relative isolate h-full w-full overflow-x-hidden overflow-y-auto rounded-md border border-slate-200/90 bg-white/70 px-[clamp(0.75rem,1.2vw,1.25rem)] py-[clamp(0.75rem,1.8vh,1rem)] backdrop-blur-xl transition-transform ease-out will-change-transform transform-3d dark:border-white/10 dark:bg-[#0d1117]/70"
        >
          <div className="relative z-10 flex flex-col items-center justify-start gap-[clamp(0.625rem,1.5vh,1rem)] transform-3d">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
}

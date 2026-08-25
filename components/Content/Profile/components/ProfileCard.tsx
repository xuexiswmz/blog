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
      className="hidden h-full w-72 flex-none shrink-0 self-start px-3 md:flex lg:w-80 perspective-distant"
    >
      <div
        ref={entryRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="mt-4 h-[90%] w-full transform-3d"
      >
        <div
          ref={cardRef}
          className="relative isolate h-full w-full overflow-hidden rounded-md border border-slate-200/90 bg-white/75 px-5 py-4 backdrop-blur-xl transition-transform ease-out will-change-transform [transform-style:preserve-3d] dark:border-white/10 dark:bg-[#0d1117]/85"
        >
          <div className="relative z-10 flex h-full flex-col items-center justify-between gap-2 transform-3d">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
}

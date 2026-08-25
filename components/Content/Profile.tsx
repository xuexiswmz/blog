"use client";

import {
  animate,
  createScope,
  set,
  stagger,
} from "animejs";
import Image from "next/image";
import {
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useHomeAnimationReady } from "./HomeAnimationContext";

const SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "PostgreSQL",
  "AI",
];

export default function Profile() {
  const { t, i18n } = useTranslation();
  const homeAnimationReady = useHomeAnimationReady();
  const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false;

  const root = useRef<HTMLElement>(null);
  const entry = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  const tiltFrame = useRef<number | null>(null);
  const canTilt = useRef(false);
  const interactionReady = useRef(false);

  const writingTopics = [
    t("topic.frontend"),
    t("topic.performance"),
    t("topic.backend"),
    t("topic.ai"),
    t("topic.testing"),
    t("topic.refactoring"),
  ];

  useEffect(() => {
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    canTilt.current = finePointer && !prefersReducedMotion;

    return () => {
      if (tiltFrame.current !== null) {
        cancelAnimationFrame(tiltFrame.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const rootElement = root.current;
    const entryElement = entry.current;

    if (!rootElement || !entryElement) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const avatar = rootElement.querySelector(".profile-avatar");
    const items = rootElement.querySelectorAll(".profile-item");

    interactionReady.current = false;

    if (!homeAnimationReady) {
      if (!prefersReducedMotion) {
        set(entryElement, {
          opacity: 0,
          x: -36,
          rotateY: -8,
          scale: 0.97,
        });

        if (avatar) {
          set(avatar, {
            opacity: 0,
            scale: 0.78,
            y: 14,
          });
        }

        set(items, {
          opacity: 0,
          y: 18,
        });
      }

      return;
    }

    if (prefersReducedMotion) {
      set(entryElement, {
        opacity: 1,
        x: 0,
        rotateY: 0,
        scale: 1,
      });

      const visibleTargets = avatar
        ? [avatar, ...items]
        : [...items];

      set(visibleTargets, {
        opacity: 1,
        y: 0,
        scale: 1,
      });

      interactionReady.current = true;
      return;
    }

    const scope = createScope({
      root,
    }).add(() => {
      animate(entryElement, {
        opacity: 1,
        x: 0,
        rotateY: 0,
        scale: 1,
        duration: 900,
        ease: "out(4)",
        onComplete: () => {
          interactionReady.current = true;
        },
      });

      animate(".profile-avatar", {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 850,
        delay: 100,
        ease: "out(4)",
      });

      animate(".profile-item", {
        opacity: 1,
        y: 0,
        duration: 620,
        delay: stagger(85, {
          start: 210,
        }),
        ease: "out(3)",
      });
    });

    return () => {
      scope.revert();
    };
  }, [homeAnimationReady]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const cardElement = card.current;

    if (
      !cardElement ||
      !canTilt.current ||
      !interactionReady.current
    ) {
      return;
    }

    // 使用不参与倾斜的外层作为感应区域，避免卡片旋转后反复触发
    // pointerleave / pointerenter，造成边缘频闪。
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    );
    const pointerY = Math.min(
      1,
      Math.max(0, (event.clientY - bounds.top) / bounds.height),
    );

    const rotateX = (0.5 - pointerY) * 8;
    const rotateY = (pointerX - 0.5) * 12;

    if (tiltFrame.current !== null) {
      cancelAnimationFrame(tiltFrame.current);
    }

    tiltFrame.current = requestAnimationFrame(() => {
      cardElement.style.transitionDuration = "120ms";
      cardElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
  };

  const handlePointerLeave = () => {
    const cardElement = card.current;

    if (!cardElement || !canTilt.current) {
      return;
    }

    if (tiltFrame.current !== null) {
      cancelAnimationFrame(tiltFrame.current);
    }

    tiltFrame.current = requestAnimationFrame(() => {
      cardElement.style.transitionDuration = "550ms";
      cardElement.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
  };

  return (
    <aside
      ref={root}
      className="hidden h-full w-72 flex-none shrink-0 self-start px-3 md:flex lg:w-80 [perspective:1200px]"
    >
      <div
        ref={entry}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="mt-4 h-[90%] w-full [transform-style:preserve-3d]"
      >
        <div
          ref={card}
          className="
            relative isolate h-full w-full overflow-hidden rounded-md
            border border-slate-200/90 bg-white/75 px-5 py-4
            backdrop-blur-xl transition-transform ease-out
            will-change-transform [transform-style:preserve-3d]
            dark:border-white/10 dark:bg-[#0d1117]/85
          "
        >
          <div className="relative z-10 flex h-full flex-col items-center justify-between gap-2 [transform-style:preserve-3d]">
            <div className="profile-avatar [transform-style:preserve-3d]">
              <div
                className={`relative ${
                  isEnglish
                    ? "[transform:translateZ(30px)]"
                    : "[transform:translate3d(0,32px,30px)]"
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

            <div className="profile-item w-full [transform-style:preserve-3d]">
              <div className="text-center [transform:translateZ(22px)]">
                <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                  xuexiswmz
                </h2>

                <p
                  className={`mt-1 font-medium text-slate-500 dark:text-slate-400 ${
                    isEnglish
                      ? "text-[13px] tracking-tight"
                      : "text-sm"
                  }`}
                >
                  {t("profile.role")}
                </p>
              </div>
            </div>

            <div className="profile-item w-full space-y-3 [transform-style:preserve-3d]">
              <section
                className={
                  isEnglish
                    ? "[transform:translateZ(15px)]"
                    : "[transform:translate3d(0,-32px,15px)]"
                }
              >
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  {t("profile.skills")}
                </h3>

                <div className="flex flex-wrap gap-1.5">
                  {SKILLS.map((skill) => (
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
                    ? "[transform:translateZ(11px)]"
                    : "[transform:translate3d(0,-22px,11px)]"
                }
              >
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  {t("profile.writing")}
                </h3>

                <div
                  className="flex flex-wrap gap-x-3 gap-y-2 text-[13px] leading-5 text-slate-600 dark:text-slate-300"
                >
                  {writingTopics.map((topic) => (
                    <span
                      key={topic}
                      className="whitespace-nowrap rounded-md bg-slate-100/80 px-2 py-1 dark:bg-white/[0.06]"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            <div className="profile-item w-full [transform-style:preserve-3d]">
              <blockquote
                className={`border-t border-slate-200/80 pt-4 font-serif text-slate-500 dark:border-white/10 dark:text-slate-400 ${
                  isEnglish
                    ? "[transform:translateZ(7px)]"
                    : "[transform:translate3d(0,-40px,7px)]"
                }`}
              >
                <p
                  className={`text-pretty ${
                    isEnglish
                      ? "text-sm leading-6"
                      : "text-[15px] leading-7"
                  }`}
                >
                  {t("quote.text")}
                </p>

                <footer className="mt-2 text-right text-xs tracking-wide text-slate-400 dark:text-slate-500">
                  {t("quote.author")}
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

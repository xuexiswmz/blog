"use client";

import { Letters } from "@kumailnanji/letters";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { HomeAnimationProvider } from "./HomeAnimationContext";

type HomeWelcomeProps = {
  children: ReactNode;
};

type IntroPhase = "writing" | "leaving" | "hidden";

const STORAGE_KEY = "home-welcome-seen";

export default function HomeWelcome({ children }: HomeWelcomeProps) {
  const [phase, setPhase] = useState<IntroPhase>("writing");
  const [showSubtitle, setShowSubtitle] = useState(false);

  // 手写结束后，等待字幕展示的定时器
  const subtitleTimerRef = useRef<number | null>(null);

  // 退出动画结束后，彻底删除遮罩的定时器
  const removeTimerRef = useRef<number | null>(null);

  // 防止动画异常导致遮罩永远不消失
  const failSafeTimerRef = useRef<number | null>(null);

  /**
   * 彻底结束欢迎动画。
   * 清除全部定时器、记录本次会话已经播放过，然后卸载遮罩。
   */
  const hideIntro = useCallback(() => {
    if (subtitleTimerRef.current !== null) {
      window.clearTimeout(subtitleTimerRef.current);
      subtitleTimerRef.current = null;
    }

    if (removeTimerRef.current !== null) {
      window.clearTimeout(removeTimerRef.current);
      removeTimerRef.current = null;
    }

    if (failSafeTimerRef.current !== null) {
      window.clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = null;
    }

    sessionStorage.setItem(STORAGE_KEY, "true");
    setPhase("hidden");
  }, []);

  /**
   * 字幕展示完成后开始淡出整个欢迎界面。
   */
  const handleWritingComplete = useCallback(() => {
    if (failSafeTimerRef.current !== null) {
      window.clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = null;
    }

    setPhase("leaving");

    // transitionend 没有触发时的兜底
    removeTimerRef.current = window.setTimeout(hideIntro, 900);
  }, [hideIntro]);

  /**
   * welcome 手写完成：
   * 先显示副标题，停留一段时间后再退出。
   */
  const handleWelcomeComplete = useCallback(() => {
    setShowSubtitle(true);

    subtitleTimerRef.current = window.setTimeout(handleWritingComplete, 1200);
  }, [handleWritingComplete]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const alreadySeen = sessionStorage.getItem(STORAGE_KEY) === "true";

    // 用户不希望显示动画，或者本次会话已经播放过
    if (prefersReducedMotion || alreadySeen) {
      const frame = requestAnimationFrame(hideIntro);

      return () => {
        cancelAnimationFrame(frame);
      };
    }

    // 即使手写动画出现异常，6.5 秒后也一定关闭遮罩
    failSafeTimerRef.current = window.setTimeout(hideIntro, 6500);

    return () => {
      if (subtitleTimerRef.current !== null) {
        window.clearTimeout(subtitleTimerRef.current);
      }

      if (removeTimerRef.current !== null) {
        window.clearTimeout(removeTimerRef.current);
      }

      if (failSafeTimerRef.current !== null) {
        window.clearTimeout(failSafeTimerRef.current);
      }
    };
  }, [hideIntro]);

  return (
    <>
      {/*
       * 首页内容始终挂载在动画遮罩下方。
       * 即使动画异常，也不会出现首页内容没有渲染的白屏。
       */}
      <HomeAnimationProvider ready={phase !== "writing"}>
        {children}
      </HomeAnimationProvider>

      {phase !== "hidden" && (
        <div
          role="status"
          aria-label="欢迎进入博客"
          aria-live="polite"
          onTransitionEnd={(event) => {
            // 只处理最外层遮罩自身的 transitionend
            if (event.target === event.currentTarget && phase === "leaving") {
              hideIntro();
            }
          }}
          className={`
            fixed inset-0 z-[100]
            flex items-center justify-center
            overflow-hidden

            bg-[#f7f9fc]
            dark:bg-[#07090d]

            transition-[opacity,filter,transform]
            duration-700
            ease-[cubic-bezier(0.22,1,0.36,1)]

            ${
              phase === "leaving"
                ? "scale-[1.015] opacity-0 blur-[2px]"
                : "scale-100 opacity-100 blur-0"
            }
          `}
        >
          <div className="flex flex-col items-center justify-center gap-5">
            <Letters
              text="welcome"
              autoPlay
              variant="complex"
              overlap={0.2}
              strokeWidth={1.35}
              color="currentColor"
              animation={{
                type: "tween",
                duration: 2.6,
                ease: "easeInOut",
              }}
              className="
                h-auto
                w-[58vw]
                max-w-[620px]
                overflow-visible

                text-[#2997ff]
                opacity-80
                [filter:drop-shadow(0_0_12px_rgba(41,151,255,0.16))]

                dark:text-[#64b5ff]
                dark:opacity-90
                dark:[filter:drop-shadow(0_0_18px_rgba(59,130,246,0.3))]
              "
              onComplete={handleWelcomeComplete}
            />

            <p
              className={`
                text-sm
                font-medium
                tracking-[0.28em]

                text-slate-500
                dark:text-slate-400

                transition-[opacity,transform]
                duration-700
                ease-out

                sm:text-base

                ${
                  showSubtitle
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }
              `}
            >
              TO XUEXISWMZ BLOG
            </p>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import {
  animate,
  createScope,
  set,
  stagger,
} from "animejs";
import { useLayoutEffect, useRef } from "react";
import { PROFILE_ANIMATION_SELECTORS } from "../constants/profile";

/**
 * 管理 Profile 首次进入首页时的动画状态。
 *
 * 外层 entry 独占 Anime.js 的位移和旋转，内层 card 留给鼠标倾斜效果，
 * 避免两个动画系统同时覆盖同一个元素的 transform。
 */
export default function useProfileEntranceAnimation(
  homeAnimationReady: boolean,
) {
  const rootRef = useRef<HTMLElement>(null);
  const entryRef = useRef<HTMLDivElement>(null);
  const interactionReadyRef = useRef(false);

  useLayoutEffect(() => {
    const rootElement = rootRef.current;
    const entryElement = entryRef.current;

    if (!rootElement || !entryElement) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const avatar = rootElement.querySelector(
      PROFILE_ANIMATION_SELECTORS.avatar,
    );
    const items = rootElement.querySelectorAll(
      PROFILE_ANIMATION_SELECTORS.item,
    );

    interactionReadyRef.current = false;

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

      interactionReadyRef.current = true;
      return;
    }

    const scope = createScope({
      root: rootRef,
    }).add(() => {
      animate(entryElement, {
        opacity: 1,
        x: 0,
        rotateY: 0,
        scale: 1,
        duration: 900,
        ease: "out(4)",
        onComplete: () => {
          interactionReadyRef.current = true;
        },
      });

      animate(PROFILE_ANIMATION_SELECTORS.avatar, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 850,
        delay: 100,
        ease: "out(4)",
      });

      animate(PROFILE_ANIMATION_SELECTORS.item, {
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

  return {
    rootRef,
    entryRef,
    interactionReadyRef,
  };
}

"use client";

import {
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
} from "react";

/**
 * 管理桌面端鼠标跟随的 3D 倾斜效果。
 *
 * 事件绑定在不会旋转的 entry 上，实际 transform 写入 card，防止鼠标靠近
 * 边缘时命中区域跟着卡片移动，从而反复触发 pointerleave 造成频闪。
 */
export default function useProfileTilt(
  interactionReadyRef: RefObject<boolean>,
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltFrameRef = useRef<number | null>(null);
  const canTiltRef = useRef(false);

  useEffect(() => {
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    canTiltRef.current = finePointer && !prefersReducedMotion;

    return () => {
      if (tiltFrameRef.current !== null) {
        cancelAnimationFrame(tiltFrameRef.current);
      }
    };
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const cardElement = cardRef.current;

    if (
      !cardElement ||
      !canTiltRef.current ||
      !interactionReadyRef.current
    ) {
      return;
    }

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

    if (tiltFrameRef.current !== null) {
      cancelAnimationFrame(tiltFrameRef.current);
    }

    tiltFrameRef.current = requestAnimationFrame(() => {
      cardElement.style.transitionDuration = "120ms";
      cardElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
  }

  function handlePointerLeave() {
    const cardElement = cardRef.current;

    if (!cardElement || !canTiltRef.current) {
      return;
    }

    if (tiltFrameRef.current !== null) {
      cancelAnimationFrame(tiltFrameRef.current);
    }

    tiltFrameRef.current = requestAnimationFrame(() => {
      cardElement.style.transitionDuration = "550ms";
      cardElement.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
  }

  return {
    cardRef,
    handlePointerMove,
    handlePointerLeave,
  };
}

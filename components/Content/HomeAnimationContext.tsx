"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";

type HomeAnimationProviderProps = {
  children: ReactNode;
  ready: boolean;
};

// 默认值使用 true，避免组件脱离首页 Provider 使用时被永久隐藏。
const HomeAnimationContext = createContext(true);

export function HomeAnimationProvider({
  children,
  ready,
}: HomeAnimationProviderProps) {
  return (
    <HomeAnimationContext.Provider value={ready}>
      {children}
    </HomeAnimationContext.Provider>
  );
}

export function useHomeAnimationReady() {
  return useContext(HomeAnimationContext);
}

export const PROFILE_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "PostgreSQL",
  "AI",
] as const;

export const PROFILE_TOPIC_KEYS = [
  "topic.frontend",
  "topic.performance",
  "topic.backend",
  "topic.ai",
  "topic.testing",
  "topic.refactoring",
] as const;

/**
 * 进入动画通过这些 data 属性定位节点，避免 hook 依赖纯样式 className。
 */
export const PROFILE_ANIMATION_SELECTORS = {
  avatar: "[data-profile-avatar]",
  item: "[data-profile-item]",
} as const;

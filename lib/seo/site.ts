export const SITE_NAME = "xuexiswmz 的技术博客";

export const SITE_DESCRIPTION =
  "记录前端开发、JavaScript、CSS、React 与工程实践的个人技术博客。";

export function normalizeSiteUrl(value: string): string {
  const configuredUrl = value.trim();
  const absoluteUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  return new URL(absoluteUrl).toString().replace(/\/+$/, "");
}

export function resolveSiteUrl(
  value: string | undefined,
  environment: string | undefined,
): string {
  if (!value?.trim()) {
    if (environment === "production") {
      throw new Error(
        "生产环境缺少站点地址，请配置 NEXT_PUBLIC_SITE_URL",
      );
    }

    return "http://localhost:3000";
  }

  return normalizeSiteUrl(value);
}

export const SITE_URL = resolveSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL,
  process.env.NODE_ENV,
);

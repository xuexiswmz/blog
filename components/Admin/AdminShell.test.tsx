import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/analytics",
}));

vi.mock("./SignOutButton", () => ({
  default: () => <div>退出登录</div>,
}));

import AdminShell from "./AdminShell";

describe("AdminShell", () => {
  it("renders sidebar navigation, active state and user info", () => {
    const markup = renderToStaticMarkup(
      <AdminShell
        user={{
          name: "测试管理员",
          email: "admin@example.com",
        }}
      >
        <div>页面内容</div>
      </AdminShell>,
    );

    expect(markup).toContain("管理中心");
    expect(markup).not.toContain(">概览<");
    expect(markup).toContain('href="/admin/analytics"');
    expect(markup).toContain('href="/admin/articles"');
    expect(markup).toContain('href="/admin/comments"');
    expect(markup).toContain('href="/admin/categories"');
    expect(markup).toContain("测试管理员");
    expect(markup).toContain("admin@example.com");
    expect(markup).toContain("页面内容");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("bg-neutral-950 text-white");

    expect(markup.indexOf('href="/admin/analytics"')).toBeLessThan(
      markup.indexOf('href="/admin/articles"'),
    );
    expect(markup.indexOf('href="/admin/articles"')).toBeLessThan(
      markup.indexOf('href="/admin/comments"'),
    );
  });
});

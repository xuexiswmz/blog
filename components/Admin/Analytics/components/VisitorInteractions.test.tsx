// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsVisitorDetail } from "../types/analytics";
import VisitorDetailDrawer from "./VisitorDetailDrawer";
import { VisitorMonitorView } from "./VisitorMonitor";

const detailFixture: AnalyticsVisitorDetail = {
  visitorId: "11111111-1111-4111-8111-111111111111",
  displayId: "访客 11111111",
  firstVisitedAt: "2026-09-01T00:00:00.000Z",
  lastVisitedAt: "2026-09-05T00:00:00.000Z",
  pageViews: 2,
  visitedPosts: 1,
  posts: [],
  recentVisits: [],
};

const visitorFixture = {
  visitorId: "11111111-1111-4111-8111-111111111111",
  displayId: "访客 11111111",
  firstVisitedAt: "2026-09-01T00:00:00.000Z",
  lastVisitedAt: "2026-09-05T00:00:00.000Z",
  pageViews: 2,
  visitedPosts: 1,
  favoritePost: null,
};

let container: HTMLDivElement;
let root: Root;
const showSpy = vi.fn();
const showModalSpy = vi.fn();

function LoadingDrawerHost({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        打开访客详情
      </button>
      {open ? (
        <VisitorDetailDrawer
          detail={null}
          loading
          error=""
          onClose={() => {
            setOpen(false);
            onClose();
          }}
          onRetry={() => undefined}
        />
      ) : null}
    </>
  );
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  showSpy.mockReset();
  showModalSpy.mockReset();
  Object.defineProperty(HTMLDialogElement.prototype, "show", {
    configurable: true,
    value(this: HTMLDialogElement) {
      showSpy();
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      showModalSpy();
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });

  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("VisitorDetailDrawer", () => {
  it("closes on Escape and backdrop while containing panel clicks", async () => {
    const onClose = vi.fn();
    const onOutsideClick = vi.fn();

    await act(async () => {
      root.render(
        <div onClick={onOutsideClick}>
          <VisitorDetailDrawer
            detail={detailFixture}
            loading={false}
            error=""
            onClose={onClose}
            onRetry={() => undefined}
          />
        </div>,
      );
    });

    const dialog = container.querySelector("dialog");
    const panel = container.querySelector("aside");
    const closeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="关闭访客详情"]',
    );
    expect(dialog).not.toBeNull();
    expect(panel).not.toBeNull();
    expect(showModalSpy).toHaveBeenCalledTimes(1);
    expect(showSpy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(closeButton);

    await act(async () => {
      panel?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(onOutsideClick).not.toHaveBeenCalled();

    await act(async () => {
      dialog?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("provides a focused close control while loading and restores focus", async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(<LoadingDrawerHost onClose={onClose} />);
    });

    const opener = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "打开访客详情",
    );
    opener?.focus();
    await act(async () => opener?.click());

    const closeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="关闭访客详情"]',
    );
    expect(closeButton).not.toBeNull();
    expect(document.activeElement).toBe(closeButton);

    await act(async () => closeButton?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(opener);
  });
});

describe("VisitorMonitorView pagination", () => {
  it("disables boundary controls and requests the adjacent page", async () => {
    const onPageChange = vi.fn();
    const renderPage = async (page: number) => {
      await act(async () => {
        root.render(
          <VisitorMonitorView
            visitors={[visitorFixture]}
            pagination={{ page, pageSize: 20, total: 41, totalPages: 3 }}
            loading={false}
            error=""
            onSelectVisitor={() => undefined}
            onPageChange={onPageChange}
            onRetry={() => undefined}
          />,
        );
      });
    };
    const findButton = (label: string) =>
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === label,
      );

    await renderPage(1);
    expect(findButton("上一页")?.disabled).toBe(true);
    expect(findButton("下一页")?.disabled).toBe(false);

    await act(async () => findButton("下一页")?.click());
    expect(onPageChange).toHaveBeenLastCalledWith(2);

    await renderPage(3);
    expect(findButton("上一页")?.disabled).toBe(false);
    expect(findButton("下一页")?.disabled).toBe(true);

    await act(async () => findButton("上一页")?.click());
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it("hides stale pagination metadata while loading or showing an error", async () => {
    const renderState = async (loading: boolean, error: string) => {
      await act(async () => {
        root.render(
          <VisitorMonitorView
            visitors={[]}
            pagination={{ page: 2, pageSize: 20, total: 41, totalPages: 1 }}
            loading={loading}
            error={error}
            onSelectVisitor={() => undefined}
            onPageChange={() => undefined}
            onRetry={() => undefined}
          />,
        );
      });
    };

    await renderState(true, "");
    expect(container.textContent).not.toContain("第 2 / 1 页");
    expect(container.textContent).not.toContain("41 位访客");

    await renderState(false, "读取访客列表失败");
    expect(container.textContent).not.toContain("第 2 / 1 页");
    expect(container.textContent).not.toContain("41 位访客");
  });
});

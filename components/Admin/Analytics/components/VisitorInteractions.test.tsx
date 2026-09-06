// @vitest-environment jsdom

import { act } from "react";
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

beforeEach(() => {
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  Object.defineProperty(HTMLDialogElement.prototype, "show", {
    configurable: true,
    value(this: HTMLDialogElement) {
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
    expect(dialog).not.toBeNull();
    expect(panel).not.toBeNull();

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
});

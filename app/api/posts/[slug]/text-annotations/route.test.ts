import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  sql: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}));

vi.mock("@/lib/db", () => ({
  sql: Object.assign(mocks.sql, {
    transaction: mocks.transaction,
  }),
}));

import { GET, POST } from "./route";
import { DELETE, PATCH } from "./[annotationId]/route";

const routeContext = {
  params: Promise.resolve({
    slug: "css-centering",
  }),
};

const annotationRouteContext = {
  params: Promise.resolve({
    slug: "css-centering",
    annotationId: "550e8400-e29b-41d4-a716-446655440000",
  }),
};

const annotationRow = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  post_slug: "css-centering",
  paragraph_id: "p-123456789abc",
  start_offset: 0,
  end_offset: 4,
  selected_text: "测试文字",
  line_style: "double",
  color: "amber",
  created_at: "2026-08-27T00:00:00.000Z",
};

beforeEach(() => {
  mocks.getSession.mockReset();
  mocks.sql.mockReset();
  mocks.transaction.mockReset();
});

describe("text annotations GET", () => {
  it("游客可以读取文章画线", async () => {
    mocks.sql.mockResolvedValue([annotationRow]);

    const response = await GET(
      new Request("http://localhost/api/posts/css-centering/text-annotations"),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      annotations: [
        {
          id: annotationRow.id,
          postSlug: "css-centering",
          paragraphId: "p-123456789abc",
          startOffset: 0,
          endOffset: 4,
          selectedText: "测试文字",
          lineStyle: "double",
          color: "amber",
          createdAt: "2026-08-27T00:00:00.000Z",
        },
      ],
    });

    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});

describe("text annotations POST", () => {
  it("游客不能创建画线", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/posts/css-centering/text-annotations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          paragraphId: "p-123456789abc",
          startOffset: 0,
          endOffset: 4,
          selectedText: "测试文字",
          lineStyle: "double",
          color: "amber",
        }),
      }),
      routeContext,
    );

    expect(response.status).toBe(401);
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("前端范围没有完整覆盖旧画线时返回409", async () => {
    mocks.getSession.mockResolvedValue({
      user: {
        id: "admin",
      },
    });

    mocks.sql.mockResolvedValue([
      {
        id: "old-annotation",
        start_offset: 20,
        end_offset: 50,
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/posts/css-centering/text-annotations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          paragraphId: "p-123456789abc",
          startOffset: 15,
          endOffset: 40,
          selectedText: "a".repeat(25),
          lineStyle: "solid",
          color: "sky",
        }),
      }),
      routeContext,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: "画线范围已经变化，请刷新后重试",
      mergedRange: {
        startOffset: 15,
        endOffset: 50,
      },
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("管理员可以创建画线", async () => {
    mocks.getSession.mockResolvedValue({
      user: {
        id: "admin",
      },
    });

    mocks.sql.mockResolvedValue([]);
    mocks.transaction.mockResolvedValue([[], [annotationRow]]);

    const response = await POST(
      new Request("http://localhost/api/posts/css-centering/text-annotations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          paragraphId: "p-123456789abc",
          startOffset: 0,
          endOffset: 4,
          selectedText: "测试文字",
          lineStyle: "double",
          color: "amber",
        }),
      }),
      routeContext,
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.annotation.id).toBe(annotationRow.id);
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
});

describe("text annotations PATCH/DELETE", () => {
  it("游客不能修改画线", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/annotations/id", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          lineStyle: "wavy",
          color: "rose",
        }),
      }),
      annotationRouteContext,
    );

    expect(response.status).toBe(401);
  });

  it("游客不能删除画线", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/annotations/id", {
        method: "DELETE",
      }),
      annotationRouteContext,
    );

    expect(response.status).toBe(401);
  });

  it("管理员可以修改整条画线样式", async () => {
    mocks.getSession.mockResolvedValue({
      user: {
        id: "admin",
      },
    });

    mocks.sql.mockResolvedValue([
      {
        ...annotationRow,
        line_style: "wavy",
        color: "rose",
      },
    ]);

    const response = await PATCH(
      new Request("http://localhost/api/annotations/id", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          lineStyle: "wavy",
          color: "rose",
        }),
      }),
      annotationRouteContext,
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.annotation.lineStyle).toBe("wavy");
    expect(body.annotation.color).toBe("rose");
  });

  it("管理员可以删除整条画线", async () => {
    mocks.getSession.mockResolvedValue({
      user: {
        id: "admin",
      },
    });

    mocks.sql.mockResolvedValue([
      {
        id: annotationRow.id,
      },
    ]);

    const response = await DELETE(
      new Request("http://localhost/api/annotations/id", {
        method: "DELETE",
      }),
      annotationRouteContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "画线已删除",
    });
  });
});

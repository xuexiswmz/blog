import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  getOrCreateVisitorId: vi.fn(),
  moderateComment: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  sql: mocks.sql,
}));

vi.mock("@/lib/visitor", () => ({
  getOrCreateVisitorId: mocks.getOrCreateVisitorId,
  readVisitorID: vi.fn(),
}));

vi.mock("@/lib/ai/moderate-comment", () => ({
  moderateComment: mocks.moderateComment,
}));

import { POST } from "./route";

const VISITOR_ID = "11111111-1111-4111-8111-111111111111";

const routeContext = {
  params: Promise.resolve({
    slug: "react-useeffect-setstate",
  }),
};

function createRequest(body: unknown) {
  return new Request(
    "http://localhost/api/posts/react-useeffect-setstate/comments",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

const validBody = {
  blockId: "p-a1b2c3d4e5f6",
  username: "user_ab12cd34",
  content: "测试评论",
  replyToId: null,
};

beforeEach(() => {
  mocks.sql.mockReset();
  mocks.getOrCreateVisitorId.mockReset();
  mocks.moderateComment.mockReset();

  mocks.getOrCreateVisitorId.mockResolvedValue(VISITOR_ID);
  mocks.moderateComment.mockResolvedValue({
    decision: "publish",
    reason: "正常的技术讨论",
    model: "test-model",
    fallback: false,
  });

  mocks.sql.mockImplementation(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join(" ");

      if (query.includes("too_frequent")) {
        return Promise.resolve([{ too_frequent: false }]);
      }

      if (query.includes("insert into paragraph_comments")) {
        return Promise.resolve([
          {
            id: "comment-id",
            username: values[5],
            content: values[6],
            root_id: null,
            reply_to_id: null,
            created_at: new Date("2026-11-11T00:00:00.000Z"),
            status: values[7],
          },
        ]);
      }

      return Promise.resolve([]);
    },
  );
});

describe("POST paragraph comments username", () => {
  it.each([
    "博主",
    "admin",
    "user_ABC12345",
    "user_1234567",
    "user_ab12cd34x",
    "",
  ])("拒绝不是 user_xxxxxxxx 格式的用户名 %s", async (username) => {
    const response = await POST(
      createRequest({
        ...validBody,
        username,
      }),
      routeContext,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "用户名格式不合法",
    });
    expect(mocks.getOrCreateVisitorId).not.toHaveBeenCalled();
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("接受自动生成的 user_xxxxxxxx 用户名并写入数据库", async () => {
    const response = await POST(createRequest(validBody), routeContext);

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      comment: {
        username: "user_ab12cd34",
        content: "测试评论",
        status: "published",
      },
    });

    const insertCall = mocks.sql.mock.calls.find(([strings]) =>
      String(strings).includes("insert into paragraph_comments"),
    );

    expect(insertCall).toBeDefined();
    expect(insertCall?.slice(1)).toContain("user_ab12cd34");
  });
});

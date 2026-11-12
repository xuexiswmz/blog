import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const env = {
  GITHUB_TOKEN: "github-token",
  RELAY_SECRET: "relay-secret",
  GITHUB_OWNER: "xuexiswmz",
  GITHUB_REPO: "blog",
  GITHUB_BRANCH: "main",
};

function request(
  method: string,
  body?: unknown,
  authorized = true,
): Request {
  return new Request("https://relay.example.com/file", {
    method,
    headers: {
      ...(authorized
        ? { Authorization: "Bearer relay-secret" }
        : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitHub relay worker", () => {
  it("rejects requests without the relay secret", async () => {
    const response = await worker.fetch(
      request("GET", undefined, false),
      env,
    );

    expect(response.status).toBe(401);
  });

  it("rejects article paths outside content/posts", async () => {
    const response = await worker.fetch(
      new Request(
        "https://relay.example.com/file?path=content/other.mdx&branch=main",
        {
          headers: { Authorization: "Bearer relay-secret" },
        },
      ),
      env,
    );

    expect(response.status).toBe(400);
  });

  it("reads a file sha from GitHub", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sha: "abc123" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request(
        "https://relay.example.com/file?path=content/posts/new.mdx&branch=main",
        {
          headers: { Authorization: "Bearer relay-secret" },
        },
      ),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sha: "abc123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/xuexiswmz/blog/contents/content/posts/new.mdx?ref=main",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer github-token",
        }),
      }),
    );
  });

  it("writes an article with base64 content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          commit: { html_url: "https://github.com/commit/1" },
          content: {
            html_url: "https://github.com/file/1",
            sha: "new-sha",
          },
        }),
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      request("PUT", {
        path: "content/posts/new.mdx",
        content: "# 新文章\n",
        message: "docs: add new",
        branch: "main",
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      commitUrl: "https://github.com/commit/1",
      fileUrl: "https://github.com/file/1",
      sha: "new-sha",
    });

    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(options.body));

    expect(payload).toMatchObject({
      message: "docs: add new",
      branch: "main",
      content: Buffer.from("# 新文章\n", "utf8").toString("base64"),
    });
  });

  it("rejects a branch other than the configured branch", async () => {
    const response = await worker.fetch(
      request("PUT", {
        path: "content/posts/new.mdx",
        content: "content",
        message: "docs: add new",
        branch: "other",
      }),
      env,
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for a missing file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 404 })),
    );

    const response = await worker.fetch(
      new Request(
        "https://relay.example.com/file?path=content/posts/missing.mdx&branch=main",
        {
          headers: { Authorization: "Bearer relay-secret" },
        },
      ),
      env,
    );

    expect(response.status).toBe(404);
  });
});

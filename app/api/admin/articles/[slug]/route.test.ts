import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockGitHubContentConfigError extends Error {}
  class MockGitHubContentError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }

  return {
    getSession: vi.fn(),
    getGitHubContentConfig: vi.fn(),
    getRemoteFileSha: vi.fn(),
    commitRemoteFile: vi.fn(),
    deleteRemoteFile: vi.fn(),
    postExists: vi.fn(),
    MockGitHubContentConfigError,
    MockGitHubContentError,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/lib/github/githubContent", () => ({
  getGitHubContentConfig: mocks.getGitHubContentConfig,
  getRemoteFileSha: mocks.getRemoteFileSha,
  commitRemoteFile: mocks.commitRemoteFile,
  deleteRemoteFile: mocks.deleteRemoteFile,
  GitHubContentConfigError: mocks.MockGitHubContentConfigError,
  GitHubContentError: mocks.MockGitHubContentError,
}));

vi.mock("@/lib/posts", () => ({
  postExists: mocks.postExists,
}));

import { DELETE, PUT } from "./route";

const config = {
  token: "token",
  owner: "xuexiswmz",
  repo: "blog",
  branch: "main",
};

const context = {
  params: Promise.resolve({ slug: "old-article" }),
};

function deleteRequest(): Request {
  return new Request("http://localhost/api/admin/articles/old-article", {
    method: "DELETE",
  });
}

describe("DELETE /api/admin/articles/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: "admin" } });
    mocks.getGitHubContentConfig.mockReturnValue(config);
    mocks.getRemoteFileSha.mockResolvedValue("existing-sha");
    mocks.commitRemoteFile.mockResolvedValue({
      commitUrl: "https://github.com/commit/update",
      fileUrl: "https://github.com/file/update",
      sha: "new-sha",
    });
    mocks.deleteRemoteFile.mockResolvedValue({
      commitUrl: "https://github.com/commit/delete",
    });
    mocks.postExists.mockImplementation(async (slug: string) => {
      return slug === "css-box-model";
    });
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await DELETE(deleteRequest(), context);

    expect(response.status).toBe(401);
    expect(mocks.deleteRemoteFile).not.toHaveBeenCalled();
  });

  it("rejects invalid slugs", async () => {
    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ slug: "../secret" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.deleteRemoteFile).not.toHaveBeenCalled();
  });

  it("returns 404 when the remote file does not exist", async () => {
    mocks.deleteRemoteFile.mockResolvedValue(null);

    const response = await DELETE(deleteRequest(), context);

    expect(response.status).toBe(404);
  });

  it("commits the article deletion", async () => {
    const response = await DELETE(deleteRequest(), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      slug: "old-article",
      commitUrl: "https://github.com/commit/delete",
      deployRequired: true,
    });
    expect(mocks.deleteRemoteFile).toHaveBeenCalledWith({
      path: "content/posts/old-article.mdx",
      message: "docs: delete article old-article",
      config,
    });
  });

  it("returns a clear error when the token is missing", async () => {
    mocks.getGitHubContentConfig.mockImplementation(() => {
      throw new mocks.MockGitHubContentConfigError();
    });

    const response = await DELETE(deleteRequest(), context);

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("GITHUB_CONTENT_TOKEN"),
    });
  });

  it("maps GitHub API failures to 502", async () => {
    mocks.deleteRemoteFile.mockRejectedValue(
      new mocks.MockGitHubContentError("Bad credentials", 401),
    );

    const response = await DELETE(deleteRequest(), context);

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("Bad credentials"),
    });
  });

  it("updates an existing article with the current sha", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/articles/old-article", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "更新后的文章",
          date: "2026-11-12",
          description: "更新后的简介",
          tags: ["react"],
          related: ["css-box-model"],
          content: "## 新正文",
        }),
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      slug: "old-article",
      path: "content/posts/old-article.mdx",
      commitUrl: "https://github.com/commit/update",
      deployRequired: true,
    });
    expect(mocks.commitRemoteFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "content/posts/old-article.mdx",
        message: "docs: update article old-article",
        sha: "existing-sha",
        config,
      }),
    );

    const content = mocks.commitRemoteFile.mock.calls[0][0].content;
    expect(content).toContain("title: 更新后的文章");
    expect(content).toContain("related:");
    expect(content).toContain("# 更新后的文章");
  });

  it("returns 404 when updating a missing remote article", async () => {
    mocks.getRemoteFileSha.mockResolvedValue(null);

    const response = await PUT(
      new Request("http://localhost/api/admin/articles/missing-article", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "标题",
          date: "2026-11-12",
          tags: [],
          related: [],
          content: "正文",
        }),
      }),
      { params: Promise.resolve({ slug: "missing-article" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.commitRemoteFile).not.toHaveBeenCalled();
  });

  it("rejects updates with missing related articles", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/articles/old-article", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "标题",
          date: "2026-11-12",
          tags: [],
          related: ["missing-post"],
          content: "正文",
        }),
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("missing-post"),
    });
  });
});

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
    postExists: vi.fn(),
    getGitHubContentConfig: vi.fn(),
    getRemoteFileSha: vi.fn(),
    commitRemoteFile: vi.fn(),
    MockGitHubContentConfigError,
    MockGitHubContentError,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/lib/posts", () => ({
  postExists: mocks.postExists,
}));

vi.mock("@/lib/github/githubContent", () => ({
  getGitHubContentConfig: mocks.getGitHubContentConfig,
  getRemoteFileSha: mocks.getRemoteFileSha,
  commitRemoteFile: mocks.commitRemoteFile,
  GitHubContentConfigError: mocks.MockGitHubContentConfigError,
  GitHubContentError: mocks.MockGitHubContentError,
}));

import { POST } from "./route";

const config = {
  token: "token",
  owner: "xuexiswmz",
  repo: "blog",
  branch: "main",
};

const validPayload = {
  title: "新文章",
  slug: "new-article",
  date: "2026-11-11",
  description: "描述",
  tags: ["react"],
  related: ["css-box-model"],
  content: "## 正文\n\n内容。",
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: "admin" } });
    mocks.postExists.mockImplementation(async (slug: string) => {
      return slug === "css-box-model";
    });
    mocks.getGitHubContentConfig.mockReturnValue(config);
    mocks.getRemoteFileSha.mockResolvedValue(null);
    mocks.commitRemoteFile.mockResolvedValue({
      commitUrl: "https://github.com/commit/1",
      fileUrl: "https://github.com/file/1",
      sha: "sha",
    });
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await POST(jsonRequest(validPayload));

    expect(response.status).toBe(401);
    expect(mocks.commitRemoteFile).not.toHaveBeenCalled();
  });

  it("rejects invalid article fields", async () => {
    const response = await POST(
      jsonRequest({ ...validPayload, slug: "../bad", related: [] }),
    );

    expect(response.status).toBe(400);
    expect(mocks.commitRemoteFile).not.toHaveBeenCalled();
  });

  it("rejects related slugs that do not exist", async () => {
    const response = await POST(
      jsonRequest({ ...validPayload, related: ["missing-post"] }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("missing-post"),
    });
  });

  it("rejects a local article with the same slug", async () => {
    mocks.postExists.mockResolvedValue(true);

    const response = await POST(jsonRequest(validPayload));

    expect(response.status).toBe(409);
    expect(mocks.commitRemoteFile).not.toHaveBeenCalled();
  });

  it("rejects a remote article with the same slug", async () => {
    mocks.getRemoteFileSha.mockResolvedValue("existing-sha");

    const response = await POST(jsonRequest(validPayload));

    expect(response.status).toBe(409);
    expect(mocks.commitRemoteFile).not.toHaveBeenCalled();
  });

  it("commits a new MDX article with related frontmatter", async () => {
    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      slug: "new-article",
      path: "content/posts/new-article.mdx",
      commitUrl: "https://github.com/commit/1",
      deployRequired: true,
    });
    expect(mocks.commitRemoteFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "content/posts/new-article.mdx",
        message: "docs: add article new-article",
        config,
      }),
    );

    const content = mocks.commitRemoteFile.mock.calls[0][0].content;
    expect(content).toContain("related:");
    expect(content).toContain("- css-box-model");
    expect(content).toContain("# 新文章");
  });

  it("returns a clear error when the GitHub token is missing", async () => {
    mocks.getGitHubContentConfig.mockImplementation(() => {
      throw new mocks.MockGitHubContentConfigError();
    });

    const response = await POST(jsonRequest(validPayload));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("GITHUB_CONTENT_TOKEN"),
    });
  });

  it("maps GitHub API failures to 502", async () => {
    mocks.getRemoteFileSha.mockRejectedValue(
      new mocks.MockGitHubContentError("Bad credentials", 401),
    );

    const response = await POST(jsonRequest(validPayload));

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("Bad credentials"),
    });
  });
});

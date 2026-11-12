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
    deleteRemoteFile: vi.fn(),
    MockGitHubContentConfigError,
    MockGitHubContentError,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/lib/github/githubContent", () => ({
  getGitHubContentConfig: mocks.getGitHubContentConfig,
  deleteRemoteFile: mocks.deleteRemoteFile,
  GitHubContentConfigError: mocks.MockGitHubContentConfigError,
  GitHubContentError: mocks.MockGitHubContentError,
}));

import { DELETE } from "./route";

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
    mocks.deleteRemoteFile.mockResolvedValue({
      commitUrl: "https://github.com/commit/delete",
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
});

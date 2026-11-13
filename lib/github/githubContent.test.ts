import { afterEach, describe, expect, it, vi } from "vitest";
import {
  commitRemoteFile,
  deleteRemoteFile,
  GitHubContentConfigError,
  getGitHubContentConfig,
  getRemoteFileSha,
} from "./githubContent";

const config = {
  token: "token",
  owner: "xuexiswmz",
  repo: "blog",
  branch: "main",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("github content client", () => {
  it("reads direct configuration from environment variables", () => {
    expect(
      getGitHubContentConfig({
        NODE_ENV: "test",
        GITHUB_CONTENT_TOKEN: " env-token ",
        GITHUB_CONTENT_OWNER: "owner",
        GITHUB_CONTENT_REPO: "repo",
        GITHUB_CONTENT_BRANCH: "dev",
      }),
    ).toEqual({
      token: "env-token",
      owner: "owner",
      repo: "repo",
      branch: "dev",
    });
  });

  it("requires a token", () => {
    expect(() =>
      getGitHubContentConfig({ NODE_ENV: "test" }),
    ).toThrow(GitHubContentConfigError);
  });

  it("returns null when the remote file does not exist", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getRemoteFileSha("content/posts/new.mdx", config),
    ).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/xuexiswmz/blog/contents/content/posts/new.mdx?ref=main",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      }),
    );
  });

  it("returns the sha of an existing file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ sha: "abc123" }), { status: 200 }),
      ),
    );

    await expect(
      getRemoteFileSha("content/posts/existing.mdx", config),
    ).resolves.toBe("abc123");
  });

  it("commits a base64-encoded file and returns urls", async () => {
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

    const result = await commitRemoteFile({
      path: "content/posts/new.mdx",
      content: "# Hello\n",
      message: "docs: add new article",
      config,
    });

    expect(result).toEqual({
      commitUrl: "https://github.com/commit/1",
      fileUrl: "https://github.com/file/1",
      sha: "new-sha",
    });

    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(options.body));

    expect(payload).toMatchObject({
      message: "docs: add new article",
      content: Buffer.from("# Hello\n", "utf8").toString("base64"),
      branch: "main",
    });
    expect(payload.sha).toBeUndefined();
  });

  it("surfaces GitHub API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Resource not accessible" }), {
          status: 403,
        }),
      ),
    );

    await expect(
      getRemoteFileSha("content/posts/x.mdx", config),
    ).rejects.toMatchObject({
      name: "GitHubContentError",
      status: 403,
      message: "Resource not accessible",
    });
  });

});

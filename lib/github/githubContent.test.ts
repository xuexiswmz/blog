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

const relayConfig = {
  token: "",
  owner: "",
  repo: "",
  branch: "main",
  relay: {
    url: "https://relay.example.com",
    secret: "relay-secret",
  },
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

  it("prefers relay configuration when relay variables are set", () => {
    expect(
      getGitHubContentConfig({
        NODE_ENV: "test",
        GITHUB_CONTENT_RELAY_URL: "https://relay.example.com/",
        GITHUB_CONTENT_RELAY_SECRET: "secret",
        GITHUB_CONTENT_BRANCH: "main",
      }),
    ).toEqual({
      token: "",
      owner: "",
      repo: "",
      branch: "main",
      relay: {
        url: "https://relay.example.com",
        secret: "secret",
      },
    });
  });

  it("requires both relay variables", () => {
    expect(() =>
      getGitHubContentConfig({
        NODE_ENV: "test",
        GITHUB_CONTENT_RELAY_URL: "https://relay.example.com",
      }),
    ).toThrow(GitHubContentConfigError);
  });

  it("requires a token without relay", () => {
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

  it("uses the relay for file reads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sha: "relay-sha" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getRemoteFileSha("content/posts/new.mdx", relayConfig),
    ).resolves.toBe("relay-sha");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://relay.example.com/file?path=content%2Fposts%2Fnew.mdx&branch=main",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer relay-secret",
        }),
      }),
    );
  });

  it("uses the relay to commit files", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          commitUrl: "https://github.com/commit/relay",
          fileUrl: "https://github.com/file/relay",
          sha: "relay-sha",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      commitRemoteFile({
        path: "content/posts/new.mdx",
        content: "# Relay\n",
        message: "docs: add relay",
        config: relayConfig,
      }),
    ).resolves.toEqual({
      commitUrl: "https://github.com/commit/relay",
      fileUrl: "https://github.com/file/relay",
      sha: "relay-sha",
    });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://relay.example.com/file");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(String(options.body))).toMatchObject({
      path: "content/posts/new.mdx",
      content: "# Relay\n",
      message: "docs: add relay",
      branch: "main",
    });
  });

  it("uses the relay to delete files", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sha: "delete-sha" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ commitUrl: "https://github.com/commit/delete" }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      deleteRemoteFile({
        path: "content/posts/old.mdx",
        message: "docs: delete old",
        config: relayConfig,
      }),
    ).resolves.toEqual({
      commitUrl: "https://github.com/commit/delete",
    });

    const [, options] = fetchMock.mock.calls[1];
    expect(options.method).toBe("DELETE");
    expect(JSON.parse(String(options.body))).toMatchObject({
      path: "content/posts/old.mdx",
      message: "docs: delete old",
      sha: "delete-sha",
    });
  });
});

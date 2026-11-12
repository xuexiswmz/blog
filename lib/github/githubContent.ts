export type GitHubContentRelayConfig = {
  url: string;
  secret: string;
};

export type GitHubContentConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  relay?: GitHubContentRelayConfig;
};

export type GitHubCommitResult = {
  commitUrl: string;
  fileUrl: string;
  sha: string;
};

export type GitHubDeleteResult = {
  commitUrl: string;
};

export class GitHubContentConfigError extends Error {
  constructor(
    message = "未配置 GitHub 内容提交方式（GITHUB_CONTENT_RELAY_URL/GITHUB_CONTENT_RELAY_SECRET 或 GITHUB_CONTENT_TOKEN）",
  ) {
    super(message);
    this.name = "GitHubContentConfigError";
  }
}

export class GitHubContentError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubContentError";
    this.status = status;
  }
}

export function getGitHubContentConfig(
  env: NodeJS.ProcessEnv = process.env,
): GitHubContentConfig {
  const relayUrl = env.GITHUB_CONTENT_RELAY_URL?.trim();
  const relaySecret = env.GITHUB_CONTENT_RELAY_SECRET?.trim();
  const branch = env.GITHUB_CONTENT_BRANCH?.trim() || "main";

  if (relayUrl || relaySecret) {
    if (!relayUrl || !relaySecret) {
      throw new GitHubContentConfigError(
        "GITHUB_CONTENT_RELAY_URL 和 GITHUB_CONTENT_RELAY_SECRET 必须同时配置",
      );
    }

    return {
      token: "",
      owner: "",
      repo: "",
      branch,
      relay: {
        url: relayUrl.replace(/\/+$/, ""),
        secret: relaySecret,
      },
    };
  }

  const token = env.GITHUB_CONTENT_TOKEN?.trim();

  if (!token) {
    throw new GitHubContentConfigError();
  }

  return {
    token,
    owner: env.GITHUB_CONTENT_OWNER?.trim() || "xuexiswmz",
    repo: env.GITHUB_CONTENT_REPO?.trim() || "blog",
    branch,
  };
}

function encodeContentPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getHeaders(config: GitHubContentConfig): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${config.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function getRelayHeaders(config: GitHubContentConfig): HeadersInit {
  return {
    Authorization: `Bearer ${config.relay?.secret ?? ""}`,
    "Content-Type": "application/json",
  };
}

async function readError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // Ignore non-JSON error responses.
  }

  return `${fallback} (${response.status})`;
}

export async function getRemoteFileSha(
  path: string,
  config: GitHubContentConfig = getGitHubContentConfig(),
): Promise<string | null> {
  if (config.relay) {
    const url = `${config.relay.url}/file?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(config.branch)}`;
    const response = await fetch(url, {
      headers: getRelayHeaders(config),
      cache: "no-store",
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new GitHubContentError(
        await readError(response, "GitHub Relay 请求失败"),
        response.status,
      );
    }

    const body = (await response.json()) as { sha?: unknown };
    return typeof body.sha === "string" ? body.sha : null;
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeContentPath(path)}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(url, {
    headers: getHeaders(config),
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new GitHubContentError(
      await readError(response, "GitHub API 请求失败"),
      response.status,
    );
  }

  const body = (await response.json()) as { sha?: unknown };
  return typeof body.sha === "string" ? body.sha : null;
}

export async function commitRemoteFile({
  path,
  content,
  message,
  sha,
  config = getGitHubContentConfig(),
}: {
  path: string;
  content: string;
  message: string;
  sha?: string;
  config?: GitHubContentConfig;
}): Promise<GitHubCommitResult> {
  if (config.relay) {
    const response = await fetch(`${config.relay.url}/file`, {
      method: "PUT",
      headers: getRelayHeaders(config),
      body: JSON.stringify({
        path,
        content,
        message,
        branch: config.branch,
        ...(sha ? { sha } : {}),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new GitHubContentError(
        await readError(response, "GitHub Relay 提交失败"),
        response.status,
      );
    }

    const body = (await response.json()) as {
      commitUrl?: unknown;
      fileUrl?: unknown;
      sha?: unknown;
    };

    return {
      commitUrl:
        typeof body.commitUrl === "string" ? body.commitUrl : "",
      fileUrl: typeof body.fileUrl === "string" ? body.fileUrl : "",
      sha: typeof body.sha === "string" ? body.sha : "",
    };
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeContentPath(path)}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...getHeaders(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GitHubContentError(
      await readError(response, "GitHub API 请求失败"),
      response.status,
    );
  }

  const body = (await response.json()) as {
    commit?: { html_url?: unknown };
    content?: { html_url?: unknown; sha?: unknown };
  };

  return {
    commitUrl:
      typeof body.commit?.html_url === "string" ? body.commit.html_url : "",
    fileUrl:
      typeof body.content?.html_url === "string" ? body.content.html_url : "",
    sha: typeof body.content?.sha === "string" ? body.content.sha : "",
  };
}

export async function deleteRemoteFile({
  path,
  message,
  config = getGitHubContentConfig(),
}: {
  path: string;
  message: string;
  config?: GitHubContentConfig;
}): Promise<GitHubDeleteResult | null> {
  const sha = await getRemoteFileSha(path, config);

  if (!sha) {
    return null;
  }

  if (config.relay) {
    const response = await fetch(`${config.relay.url}/file`, {
      method: "DELETE",
      headers: getRelayHeaders(config),
      body: JSON.stringify({
        path,
        message,
        sha,
        branch: config.branch,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new GitHubContentError(
        await readError(response, "GitHub Relay 删除失败"),
        response.status,
      );
    }

    const body = (await response.json()) as {
      commitUrl?: unknown;
    };

    return {
      commitUrl:
        typeof body.commitUrl === "string" ? body.commitUrl : "",
    };
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeContentPath(path)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...getHeaders(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      sha,
      branch: config.branch,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GitHubContentError(
      await readError(response, "GitHub API 请求失败"),
      response.status,
    );
  }

  const body = (await response.json()) as {
    commit?: { html_url?: unknown };
  };

  return {
    commitUrl:
      typeof body.commit?.html_url === "string" ? body.commit.html_url : "",
  };
}

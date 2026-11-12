type Env = {
  GITHUB_TOKEN: string;
  RELAY_SECRET: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
};

type GitHubFileResponse = {
  sha?: string;
  content?: { html_url?: string; sha?: string };
  commit?: { html_url?: string };
  message?: string;
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function isAllowedToken(value: string | null | undefined, expected: string): boolean {
  if (!value || !expected) {
    return false;
  }

  const left = new TextEncoder().encode(value);
  const right = new TextEncoder().encode(expected);

  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

function isAllowedPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    /^content\/posts\/[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/.test(path)
  );
}

function isAllowedBranch(branch: unknown, expected: string): boolean {
  return branch === undefined || branch === expected;
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function readGitHubError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as GitHubFileResponse;

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // Ignore non-JSON responses.
  }

  return `GitHub API 请求失败 (${response.status})`;
}

function githubHeaders(env: Env): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function contentUrl(env: Env, path: string): string {
  return `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodePath(path)}`;
}

async function handleGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const branch = url.searchParams.get("branch") ?? env.GITHUB_BRANCH;

  if (!isAllowedPath(path) || !isAllowedBranch(branch, env.GITHUB_BRANCH)) {
    return json({ message: "不允许的文章路径或分支" }, 400);
  }

  const response = await fetch(
    `${contentUrl(env, path)}?ref=${encodeURIComponent(branch)}`,
    { headers: githubHeaders(env), cache: "no-store" },
  );

  if (response.status === 404) {
    return json({ message: "文件不存在" }, 404);
  }

  if (!response.ok) {
    return json({ message: await readGitHubError(response) }, 502);
  }

  const body = (await response.json()) as GitHubFileResponse;

  return json({ sha: body.sha });
}

async function handlePut(request: Request, env: Env): Promise<Response> {
  let payload: {
    path?: unknown;
    content?: unknown;
    message?: unknown;
    sha?: unknown;
    branch?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return json({ message: "请求内容不是合法 JSON" }, 400);
  }

  if (
    !isAllowedPath(payload.path) ||
    !isAllowedBranch(payload.branch, env.GITHUB_BRANCH) ||
    typeof payload.content !== "string" ||
    typeof payload.message !== "string" ||
    (payload.sha !== undefined && typeof payload.sha !== "string")
  ) {
    return json({ message: "文章路径、内容或分支不合法" }, 400);
  }

  const response = await fetch(contentUrl(env, payload.path), {
    method: "PUT",
    headers: {
      ...githubHeaders(env),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: payload.message,
      content: encodeBase64(payload.content),
      branch: env.GITHUB_BRANCH,
      ...(payload.sha ? { sha: payload.sha } : {}),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return json({ message: await readGitHubError(response) }, 502);
  }

  const body = (await response.json()) as GitHubFileResponse;

  return json({
    commitUrl: body.commit?.html_url ?? "",
    fileUrl: body.content?.html_url ?? "",
    sha: body.content?.sha ?? "",
  });
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
  let payload: {
    path?: unknown;
    message?: unknown;
    sha?: unknown;
    branch?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return json({ message: "请求内容不是合法 JSON" }, 400);
  }

  if (
    !isAllowedPath(payload.path) ||
    !isAllowedBranch(payload.branch, env.GITHUB_BRANCH) ||
    typeof payload.message !== "string" ||
    typeof payload.sha !== "string"
  ) {
    return json({ message: "文章路径、sha 或分支不合法" }, 400);
  }

  const response = await fetch(contentUrl(env, payload.path), {
    method: "DELETE",
    headers: {
      ...githubHeaders(env),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: payload.message,
      sha: payload.sha,
      branch: env.GITHUB_BRANCH,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return json({ message: await readGitHubError(response) }, 502);
  }

  const body = (await response.json()) as GitHubFileResponse;

  return json({
    commitUrl: body.commit?.html_url ?? "",
  });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const authorization = request.headers.get("Authorization");
    const expected = `Bearer ${env.RELAY_SECRET}`;

    if (!isAllowedToken(authorization, expected)) {
      return json({ message: "Unauthorized" }, 401);
    }

    const url = new URL(request.url);

    if (url.pathname !== "/file") {
      return json({ message: "Not Found" }, 404);
    }

    if (request.method === "GET") {
      return handleGet(request, env);
    }

    if (request.method === "PUT") {
      return handlePut(request, env);
    }

    if (request.method === "DELETE") {
      return handleDelete(request, env);
    }

    return json({ message: "Method Not Allowed" }, 405);
  },
};

export default worker;

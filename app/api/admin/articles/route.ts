import { auth } from "@/lib/auth";
import {
  buildArticleMdx,
  getArticleFilePath,
  validateArticleInput,
} from "@/lib/articles/articleInput";
import {
  commitRemoteFile,
  getGitHubContentConfig,
  getRemoteFileSha,
  GitHubContentConfigError,
  GitHubContentError,
} from "@/lib/github/githubContent";
import { postExists } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json(
      { message: "请先登录管理员账号" },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { message: "请求内容不是合法的 JSON" },
      { status: 400 },
    );
  }

  const validation = validateArticleInput(payload);

  if (!validation.ok) {
    return Response.json(
      {
        message: "请检查文章字段",
        errors: validation.errors,
      },
      { status: 400 },
    );
  }

  const article = validation.value;
  const missingRelated: string[] = [];

  for (const relatedSlug of article.related) {
    if (!(await postExists(relatedSlug))) {
      missingRelated.push(relatedSlug);
    }
  }

  if (missingRelated.length > 0) {
    return Response.json(
      {
        message: `关联文章不存在: ${missingRelated.join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (await postExists(article.slug)) {
    return Response.json(
      { message: `文章 ${article.slug} 已存在` },
      { status: 409 },
    );
  }

  const filePath = getArticleFilePath(article.slug);

  try {
    const config = getGitHubContentConfig();
    const existingSha = await getRemoteFileSha(filePath, config);

    if (existingSha) {
      return Response.json(
        { message: `远端仓库中已存在 ${filePath}` },
        { status: 409 },
      );
    }

    const mdx = buildArticleMdx(article);
    const result = await commitRemoteFile({
      path: filePath,
      content: mdx,
      message: `docs: add article ${article.slug}`,
      config,
    });

    return Response.json(
      {
        slug: article.slug,
        path: filePath,
        commitUrl: result.commitUrl,
        fileUrl: result.fileUrl,
        deployRequired: true,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof GitHubContentConfigError) {
      return Response.json(
        {
          message:
            "未配置文章提交方式（GITHUB_CONTENT_RELAY_URL/SECRET 或 GITHUB_CONTENT_TOKEN），无法提交文章",
        },
        { status: 500 },
      );
    }

    if (error instanceof GitHubContentError) {
      console.error("提交文章到 GitHub 失败:", error);
      return Response.json(
        { message: `提交到 GitHub 失败: ${error.message}` },
        { status: 502 },
      );
    }

    console.error("创建文章失败:", error);
    return Response.json(
      { message: "创建文章失败，请稍后重试" },
      { status: 500 },
    );
  }
}

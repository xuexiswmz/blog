import { auth } from "@/lib/auth";
import { ARTICLE_SLUG_PATTERN } from "@/lib/articles/helpers";
import {
  buildArticleMdx,
  getArticleFilePath,
  validateArticleInput,
} from "@/lib/articles/articleInput";
import { getArticleFrontmatterExtras } from "@/lib/articles/articleFile";
import {
  commitRemoteFile,
  deleteRemoteFile,
  getGitHubContentConfig,
  getRemoteFileSha,
  GitHubContentConfigError,
  GitHubContentError,
} from "@/lib/github/githubContent";
import { postExists } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ slug: string }>;
  },
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json(
      { message: "请先登录管理员账号" },
      { status: 401 },
    );
  }

  const { slug } = await context.params;

  if (!ARTICLE_SLUG_PATTERN.test(slug)) {
    return Response.json(
      { message: "文章 slug 格式不正确" },
      { status: 400 },
    );
  }

  try {
    const config = getGitHubContentConfig();
    const result = await deleteRemoteFile({
      path: getArticleFilePath(slug),
      message: `docs: delete article ${slug}`,
      config,
    });

    if (!result) {
      return Response.json(
        { message: `远端仓库中不存在文章 ${slug}` },
        { status: 404 },
      );
    }

    return Response.json({
      slug,
      commitUrl: result.commitUrl,
      deployRequired: true,
    });
  } catch (error) {
    if (error instanceof GitHubContentConfigError) {
      return Response.json(
        {
          message:
            "未配置文章提交方式（GITHUB_CONTENT_RELAY_URL/SECRET 或 GITHUB_CONTENT_TOKEN），无法删除文章",
        },
        { status: 500 },
      );
    }

    if (error instanceof GitHubContentError) {
      console.error("删除 GitHub 文章失败:", error);
      return Response.json(
        { message: `删除 GitHub 文章失败: ${error.message}` },
        { status: 502 },
      );
    }

    console.error("删除文章失败:", error);
    return Response.json(
      { message: "删除文章失败，请稍后重试" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  context: {
    params: Promise<{ slug: string }>;
  },
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json(
      { message: "请先登录管理员账号" },
      { status: 401 },
    );
  }

  const { slug } = await context.params;

  if (!ARTICLE_SLUG_PATTERN.test(slug)) {
    return Response.json(
      { message: "文章 slug 格式不正确" },
      { status: 400 },
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

  const validation = validateArticleInput({
    ...(payload && typeof payload === "object" ? payload : {}),
    slug,
  });

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

  const filePath = getArticleFilePath(slug);

  try {
    const config = getGitHubContentConfig();
    const sha = await getRemoteFileSha(filePath, config);

    if (!sha) {
      return Response.json(
        { message: `远端仓库中不存在文章 ${slug}` },
        { status: 404 },
      );
    }

    const extraFrontmatter = await getArticleFrontmatterExtras(slug);
    const result = await commitRemoteFile({
      path: filePath,
      content: buildArticleMdx(article, extraFrontmatter),
      message: `docs: update article ${slug}`,
      sha,
      config,
    });

    return Response.json({
      slug,
      path: filePath,
      commitUrl: result.commitUrl,
      fileUrl: result.fileUrl,
      deployRequired: true,
    });
  } catch (error) {
    if (error instanceof GitHubContentConfigError) {
      return Response.json(
        {
          message:
            "未配置文章提交方式（GITHUB_CONTENT_RELAY_URL/SECRET 或 GITHUB_CONTENT_TOKEN），无法修改文章",
        },
        { status: 500 },
      );
    }

    if (error instanceof GitHubContentError) {
      console.error("修改 GitHub 文章失败:", error);
      return Response.json(
        { message: `修改 GitHub 文章失败: ${error.message}` },
        { status: 502 },
      );
    }

    console.error("修改文章失败:", error);
    return Response.json(
      { message: "修改文章失败，请稍后重试" },
      { status: 500 },
    );
  }
}

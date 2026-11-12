import { auth } from "@/lib/auth";
import { ARTICLE_SLUG_PATTERN } from "@/lib/articles/helpers";
import { getArticleFilePath } from "@/lib/articles/articleInput";
import {
  deleteRemoteFile,
  getGitHubContentConfig,
  GitHubContentConfigError,
  GitHubContentError,
} from "@/lib/github/githubContent";

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
            "未配置 GITHUB_CONTENT_TOKEN，无法删除 GitHub 上的文章",
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

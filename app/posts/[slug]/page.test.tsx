import { describe, expect, it, vi } from "vitest";

const { navigation, getPublicArticleNavigation } = vi.hoisted(() => ({
  navigation: [
    {
      id: null,
      name: "全部文章",
      position: 0,
      posts: [
        {
          slug: "javascript-data-types",
          title: "Layout Test",
          date: "",
          position: 0,
        },
      ],
    },
  ],
  getPublicArticleNavigation: vi.fn(),
}));

getPublicArticleNavigation.mockResolvedValue(navigation);

vi.mock("@/lib/articleCategories/services/articleCategoryService", () => ({
  getPublicArticleNavigation,
}));
vi.mock("@/content/posts/javascript-data-types.mdx", () => ({
  default: function LayoutTestPost() {
    return null;
  },
}));

import ArticleVisitTracker from "@/components/Analytics/ArticleVisitTracker";
import ArticleCommentsProvider from "@/components/Comments/Article/providers/ArticleCommentsProvider";
import ArticleReadingLayout from "@/components/Articles/ArticleReadingLayout";
import PostPage, { dynamic } from "./page";

describe("PostPage", () => {
  it("dynamically composes navigation, comments, visits, and MDX content", async () => {
    const page = await PostPage({
      params: Promise.resolve({ slug: "javascript-data-types" }),
    });

    expect(dynamic).toBe("force-dynamic");
    expect(getPublicArticleNavigation).toHaveBeenCalledOnce();
    expect(page.type).toBe(ArticleReadingLayout);
    expect(page.props.groups).toEqual(navigation);
    expect(page.props.currentSlug).toBe("javascript-data-types");

    const provider = page.props.children;
    expect(provider.type).toBe(ArticleCommentsProvider);
    expect(provider.props.postSlug).toBe("javascript-data-types");
    const [tracker, post] = provider.props.children;
    expect(tracker.type).toBe(ArticleVisitTracker);
    expect(tracker.props.postSlug).toBe("javascript-data-types");
    expect(typeof post.type).toBe("function");
  });
});

import type { PostSummary } from "@/lib/posts";
import type {
  ArticleCategoryAssignmentRecord,
  ArticleCategoryRecord,
  ArticleNavigationGroup,
  ArticleNavigationPost,
} from "./types";

function toNavigationPost(
  post: PostSummary,
  position: number,
): ArticleNavigationPost {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    position,
  };
}

export function buildArticleNavigation(
  posts: PostSummary[],
  categories: ArticleCategoryRecord[],
  assignments: ArticleCategoryAssignmentRecord[],
): ArticleNavigationGroup[] {
  const postBySlug = new Map(posts.map((post) => [post.slug, post]));
  const sortedCategories = [...categories].sort(
    (left, right) =>
      left.position - right.position ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  );
  const categoryIds = new Set(sortedCategories.map((category) => category.id));
  const assignedSlugs = new Set<string>();
  const assignmentsByCategory = new Map<
    string,
    ArticleCategoryAssignmentRecord[]
  >();

  for (const assignment of assignments) {
    if (!postBySlug.has(assignment.postSlug)) continue;
    if (!categoryIds.has(assignment.categoryId)) continue;

    const categoryAssignments =
      assignmentsByCategory.get(assignment.categoryId) ?? [];
    categoryAssignments.push(assignment);
    assignmentsByCategory.set(assignment.categoryId, categoryAssignments);
    assignedSlugs.add(assignment.postSlug);
  }

  const groups: ArticleNavigationGroup[] = sortedCategories.map(
    (category, categoryPosition) => {
    const categoryAssignments = [
      ...(assignmentsByCategory.get(category.id) ?? []),
    ].sort(
      (left, right) =>
        left.position - right.position ||
        left.postSlug.localeCompare(right.postSlug),
    );

      return {
        id: category.id,
        name: category.name,
        position: categoryPosition,
        posts: categoryAssignments.map((assignment, articlePosition) =>
          toNavigationPost(
            postBySlug.get(assignment.postSlug)!,
            articlePosition,
          ),
        ),
      };
    },
  );

  const unassignedPosts = posts
    .filter((post) => !assignedSlugs.has(post.slug))
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) || left.slug.localeCompare(right.slug),
    );

  if (unassignedPosts.length > 0) {
    groups.push({
      id: null,
      name: "未分类",
      position: groups.length,
      posts: unassignedPosts.map(toNavigationPost),
    });
  }

  return groups;
}

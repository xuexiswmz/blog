export type ArticleCategoryRecord = {
  id: string;
  name: string;
  position: number;
};

export type ArticleCategoryAssignmentRecord = {
  postSlug: string;
  categoryId: string;
  position: number;
};

export type ArticleNavigationPost = {
  slug: string;
  title: string;
  date: string;
  position: number;
};

export type ArticleNavigationGroup = {
  id: string | null;
  name: string;
  position: number;
  posts: ArticleNavigationPost[];
};

export type ArticleCategoryAdminState = {
  categories: ArticleNavigationGroup[];
  unassignedPosts: ArticleNavigationPost[];
};

import { describe, expect, it } from "vitest";
import type { PostSummary } from "@/lib/posts";
import { buildArticleNavigation } from "./navigation";
import type {
  ArticleCategoryAssignmentRecord,
  ArticleCategoryRecord,
} from "./types";

function post(slug: string, title: string, date: string): PostSummary {
  return {
    slug,
    title,
    date,
    description: "",
    tags: [],
  };
}

describe("buildArticleNavigation", () => {
  it("uses persisted category and article order and keeps empty categories", () => {
    const posts = [
      post("react-effects", "React Effects", "2026-10-01"),
      post("react-state", "React State", "2026-09-01"),
    ];
    const categories: ArticleCategoryRecord[] = [
      { id: "react", name: "React", position: 2 },
      { id: "css", name: "CSS", position: 0 },
    ];
    const assignments: ArticleCategoryAssignmentRecord[] = [
      { postSlug: "react-state", categoryId: "react", position: 9 },
      { postSlug: "react-effects", categoryId: "react", position: 3 },
    ];

    expect(buildArticleNavigation(posts, categories, assignments)).toEqual([
      { id: "css", name: "CSS", position: 0, posts: [] },
      {
        id: "react",
        name: "React",
        position: 1,
        posts: [
          {
            slug: "react-effects",
            title: "React Effects",
            date: "2026-10-01",
            position: 0,
          },
          {
            slug: "react-state",
            title: "React State",
            date: "2026-09-01",
            position: 1,
          },
        ],
      },
    ]);
  });

  it("places unassigned posts last using date and slug fallback order", () => {
    const posts = [
      post("z-last", "Z", "2026-08-01"),
      post("b-tied", "B", "2026-10-01"),
      post("a-tied", "A", "2026-10-01"),
      post("assigned", "Assigned", "2026-01-01"),
    ];
    const categories: ArticleCategoryRecord[] = [
      { id: "javascript", name: "JavaScript", position: 0 },
    ];
    const assignments: ArticleCategoryAssignmentRecord[] = [
      { postSlug: "assigned", categoryId: "javascript", position: 0 },
      { postSlug: "deleted-post", categoryId: "javascript", position: 1 },
      { postSlug: "z-last", categoryId: "deleted-category", position: 0 },
    ];

    const groups = buildArticleNavigation(posts, categories, assignments);

    expect(groups.map((group) => group.name)).toEqual([
      "JavaScript",
      "未分类",
    ]);
    expect(groups[1]).toEqual({
      id: null,
      name: "未分类",
      position: 1,
      posts: [
        { slug: "a-tied", title: "A", date: "2026-10-01", position: 0 },
        { slug: "b-tied", title: "B", date: "2026-10-01", position: 1 },
        { slug: "z-last", title: "Z", date: "2026-08-01", position: 2 },
      ],
    });
  });

  it("returns only an unclassified group when no categories exist", () => {
    expect(
      buildArticleNavigation(
        [post("only-post", "Only Post", "")],
        [],
        [{ postSlug: "only-post", categoryId: "missing", position: 0 }],
      ),
    ).toEqual([
      {
        id: null,
        name: "未分类",
        position: 0,
        posts: [
          {
            slug: "only-post",
            title: "Only Post",
            date: "",
            position: 0,
          },
        ],
      },
    ]);
  });
});

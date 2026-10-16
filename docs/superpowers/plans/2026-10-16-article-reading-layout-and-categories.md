# Article Reading Layout and Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add administrator-managed, manually ordered single-category article navigation and a responsive three-column article reader with an active table of contents and circular reading progress.

**Architecture:** Keep MDX as the source of article content and metadata while PostgreSQL stores only category names, assignments, and ordering. A repository/service boundary supplies both the authenticated admin workflow and a failure-tolerant public navigation model; isolated client components enhance the rendered article with heading anchors, active-section tracking, and article-relative reading progress.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL via Neon, Tailwind CSS 4, MDX, Vitest, jsdom.

**Spec:** `docs/superpowers/specs/2026-10-16-article-reading-layout-and-categories-design.md`

## Global Constraints

- Each article belongs to zero or one category; multi-category assignment is out of scope.
- Category order and article order are manually controlled with up/down actions, not drag-and-drop.
- Unassigned real MDX files remain visible in a virtual `未分类` group after all persisted categories.
- Public navigation falls back to one `全部文章` group when category storage fails; article content must still render.
- At viewport widths of 1280px or more, render three columns of approximately 260px / max 800px / 240px; below 1280px use two native collapsible panels above the article.
- Left active-article styling is black, white, and gray in both themes; blue is reserved for active TOC links, interactive links, and the progress arc.
- The TOC contains rendered `h2` and `h3` elements only, with indented third-level entries and unique stable IDs.
- Reading progress is relative to the article body, clamped to 0–100%, and scroll work is coalesced with `requestAnimationFrame`.
- Existing comments, text annotations, code highlighting, theme switching, and article visit tracking remain mounted.
- Do not add a drag-and-drop or TOC parsing dependency.

## Review Focus

- A database assignment can reference an MDX slug deleted later; public/admin state must omit the orphan and never create a dead link (Task 1 test).
- Concurrent or repeated move requests can encounter equal or sparse positions; every successful move must normalize affected positions to contiguous zero-based integers (Task 2 test).
- Category names that differ only by casing or surrounding whitespace must conflict, while rename-to-self remains valid (Task 2 test).
- A heading may contain inline code, punctuation, duplicated text, or an author-provided ID; TOC collection must preserve readable labels, retain supplied IDs, and deterministically suffix duplicates (Task 5 test).
- Extremely short articles and scroll containers with shifted top edges can otherwise divide by zero or report negative progress; progress must remain finite and clamped (Task 5 test).

---

### Task 1: Category schema, shared models, and navigation merging

**Files:**
- Create: `database/migrations/005-article-categories.sql`
- Create: `lib/articleCategories/types.ts`
- Create: `lib/articleCategories/navigation.ts`
- Create: `lib/articleCategories/navigation.test.ts`
- Modify: `scripts/migrate.test.ts`

**Interfaces:**
- Consumes: `PostSummary` and `getPostSummaries()` from `lib/posts.ts`.
- Produces: `ArticleCategoryRecord`, `ArticleCategoryAssignmentRecord`, `ArticleNavigationPost`, `ArticleNavigationGroup`, `ArticleCategoryAdminState`, and `buildArticleNavigation(posts, categories, assignments)` for later service, API, admin UI, and page tasks.

```ts
type ArticleCategoryRecord = { id: string; name: string; position: number };
type ArticleCategoryAssignmentRecord = {
  postSlug: string;
  categoryId: string;
  position: number;
};
type ArticleNavigationPost = {
  slug: string;
  title: string;
  date: string;
  position: number;
};
type ArticleNavigationGroup = {
  id: string | null;
  name: string;
  position: number;
  posts: ArticleNavigationPost[];
};
type ArticleCategoryAdminState = {
  categories: ArticleNavigationGroup[];
  unassignedPosts: ArticleNavigationPost[];
};
```

- [ ] **Step 1: Add migration discovery and pure navigation tests**

Add a migration assertion for `database/migrations/005-article-categories.sql`. In `navigation.test.ts`, cover persisted category order, manual article order, unassigned articles after persisted groups, publication-date/slug fallback ordering, omitted orphan assignments, empty persisted categories, and the no-category-record case.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- scripts/migrate.test.ts lib/articleCategories/navigation.test.ts`

Expected: FAIL because migration `005`, shared models, and `buildArticleNavigation` do not exist.

- [ ] **Step 3: Add the category migration**

Create both tables and their indexes. Enforce UUID category IDs, case-insensitive unique trimmed names, non-negative positions, `post_slug` as the assignment primary key, and a restrictive category foreign key. Use timestamps with `now()` defaults.

- [ ] **Step 4: Define the shared models**

Add the five Task 1 types exactly as specified in the Interfaces block.

- [ ] **Step 5: Implement the navigation builder**

Implement:

```ts
export function buildArticleNavigation(
  posts: PostSummary[],
  categories: ArticleCategoryRecord[],
  assignments: ArticleCategoryAssignmentRecord[],
): ArticleNavigationGroup[];
```

Use `id: null` for virtual groups. Include empty persisted categories, place `未分类` last only when it has posts, ignore orphan assignment slugs, and expose article `slug`, `title`, `date`, and normalized display `position`.

- [ ] **Step 6: Run focused tests and verify they pass**

Run: `npm test -- scripts/migrate.test.ts lib/articleCategories/navigation.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add database/migrations/005-article-categories.sql scripts/migrate.test.ts lib/articleCategories/types.ts lib/articleCategories/navigation.ts lib/articleCategories/navigation.test.ts
git commit -m "feat: add article category data model"
```

### Task 2: Category repository and business service

**Files:**
- Create: `lib/articleCategories/repositories/articleCategoryRepository.ts`
- Create: `lib/articleCategories/services/articleCategoryService.ts`
- Create: `lib/articleCategories/services/articleCategoryService.test.ts`
- Modify: `lib/posts.ts`
- Create: `lib/posts.test.ts`

**Interfaces:**
- Consumes: Task 1 models and `buildArticleNavigation`; `getPostSummaries()` and `postExists(slug)` from `lib/posts.ts`.
- Produces:
  - `getPublicArticleNavigation(): Promise<ArticleNavigationGroup[]>`
  - `getArticleCategoryAdminState(): Promise<ArticleCategoryAdminState>`
  - `createArticleCategory(name: string): Promise<void>`
  - `renameArticleCategory(categoryId: string, name: string): Promise<void>`
  - `deleteArticleCategory(categoryId: string): Promise<void>`
  - `moveArticleCategory(categoryId: string, direction: "up" | "down"): Promise<void>`
  - `assignArticleToCategory(postSlug: string, categoryId: string | null): Promise<void>`
  - `moveArticleInCategory(postSlug: string, direction: "up" | "down"): Promise<void>`
  - `ArticleCategoryServiceError` with stable `code` values and HTTP-oriented `status` values.
- Repository exports consumed by the service:
  - `readArticleCategoryConfiguration(): Promise<{ categories: ArticleCategoryRecord[]; assignments: ArticleCategoryAssignmentRecord[] }>`
  - `insertArticleCategory(name: string): Promise<void>`
  - `updateArticleCategoryName(categoryId: string, name: string): Promise<void>`
  - `removeArticleCategory(categoryId: string): Promise<void>`
  - `putArticleCategoryAssignment(postSlug: string, categoryId: string): Promise<void>`
  - `removeArticleCategoryAssignment(postSlug: string): Promise<void>`
  - `shiftArticleCategory(categoryId: string, direction: "up" | "down"): Promise<boolean>`
  - `shiftArticleCategoryAssignment(postSlug: string, direction: "up" | "down"): Promise<boolean>`

- [ ] **Step 1: Add post metadata and service tests**

Test deterministic post-summary sorting when dates tie, post existence, public fallback after repository rejection, admin omission of orphan rows, whitespace/case-insensitive duplicate names, rename-to-self, missing categories/posts, protected non-empty deletion, assignment removal through `null`, append-to-destination behavior, boundary moves, and contiguous normalization after sparse/equal positions.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- lib/posts.test.ts lib/articleCategories/services/articleCategoryService.test.ts`

Expected: FAIL because repository/service exports and deterministic tie sorting are absent.

- [ ] **Step 3: Implement repository operations**

Implement the exact repository exports in the Interfaces block. Use atomic CTE statements where multiple rows change. Normalize the affected list to zero-based positions after moves and assignments. Translate database unique/foreign-key conflicts into repository errors without exposing raw SQL text.

- [ ] **Step 4: Implement validation and service orchestration**

Trim names, validate UUIDs and slugs, verify MDX existence before assignment, map expected conflicts to `ArticleCategoryServiceError`, and log then downgrade only `getPublicArticleNavigation()` failures to the `全部文章` fallback. Admin reads and writes must reject storage failures.

- [ ] **Step 5: Make post ordering deterministic**

Update `getPostSummaries()` to sort by descending date and then ascending slug. Keep all existing fields and archive behavior intact.

- [ ] **Step 6: Run focused tests and verify they pass**

Run: `npm test -- lib/posts.test.ts lib/articleCategories/navigation.test.ts lib/articleCategories/services/articleCategoryService.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add lib/posts.ts lib/posts.test.ts lib/articleCategories
git commit -m "feat: add article category service"
```

### Task 3: Authenticated category administration API

**Files:**
- Create: `app/api/admin/article-categories/route.ts`
- Create: `app/api/admin/article-categories/[categoryId]/route.ts`
- Create: `app/api/admin/article-categories/assignments/[slug]/route.ts`
- Create: `app/api/admin/article-categories/articleCategoryRoutes.test.ts`

**Interfaces:**
- Consumes: Task 2 service functions and existing `auth.api.getSession({ headers })`.
- Produces:
  - `GET /api/admin/article-categories`
  - `POST /api/admin/article-categories` with `{ name }`
  - `PATCH /api/admin/article-categories/:categoryId` with either `{ name }` or `{ direction: "up" | "down" }`
  - `DELETE /api/admin/article-categories/:categoryId`
  - `PUT /api/admin/article-categories/assignments/:slug` with `{ categoryId: string | null }`
  - `PATCH /api/admin/article-categories/assignments/:slug` with `{ direction: "up" | "down" }`.

- [ ] **Step 1: Write route tests**

Cover unauthenticated `401` for every route family, `Cache-Control: no-store`, malformed JSON, empty names, invalid UUIDs, invalid slugs, bodies containing both rename and move operations, invalid directions, service error status/message mapping, successful `200`/`201` responses, and encoded assignment slugs.

- [ ] **Step 2: Run route tests and verify they fail**

Run: `npm test -- app/api/admin/article-categories/articleCategoryRoutes.test.ts`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Implement the collection and category-item routes**

Authenticate before parsing or service access. Return JSON messages in Chinese, return current admin state from GET, use `201` for create, and ensure all responses opt out of caching.

- [ ] **Step 4: Implement assignment routes**

Decode the route slug through Next parameters, validate the exact body shape, call Task 2 assignment/move functions, and return `200` with a concise success message.

- [ ] **Step 5: Run route tests and verify they pass**

Run: `npm test -- app/api/admin/article-categories/articleCategoryRoutes.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add app/api/admin/article-categories
git commit -m "feat: add article category admin API"
```

### Task 4: Category management page

**Files:**
- Create: `components/Admin/ArticleCategories/api/articleCategoryApi.ts`
- Create: `components/Admin/ArticleCategories/api/articleCategoryApi.test.ts`
- Create: `components/Admin/ArticleCategories/hooks/useArticleCategories.ts`
- Create: `components/Admin/ArticleCategories/hooks/useArticleCategories.test.tsx`
- Create: `components/Admin/ArticleCategories/components/ArticleCategoryManager.tsx`
- Create: `components/Admin/ArticleCategories/components/ArticleCategoryManager.test.tsx`
- Create: `app/admin/categories/page.tsx`
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: Task 1 `ArticleCategoryAdminState` and Task 3 endpoints.
- Produces: `ArticleCategoryManager` plus client functions for load/create/rename/delete/category move/assignment/article move and a `useArticleCategories()` state facade.

- [ ] **Step 1: Write API adapter tests**

Assert exact HTTP methods, encoded IDs/slugs, JSON bodies, `cache: "no-store"`, valid JSON parsing, meaningful fallback messages, preserved HTTP status, and `AbortSignal` forwarding for reads.

- [ ] **Step 2: Run API adapter tests and verify they fail**

Run: `npm test -- components/Admin/ArticleCategories/api/articleCategoryApi.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the API adapter**

Expose a typed `ArticleCategoryApiError` and one function per Task 3 endpoint. Keep transport handling isolated from React state.

- [ ] **Step 4: Write hook and component tests**

Test initial load, abort on unmount, `401` redirect, retry after read failure, operation-specific pending state, refresh after successful mutations, retained state plus toast/error after mutation failure, disabled boundary move buttons, non-empty delete protection messaging, category selector changes, and rendering all unassigned posts.

- [ ] **Step 5: Run hook/component tests and verify they fail**

Run: `npm test -- components/Admin/ArticleCategories/hooks/useArticleCategories.test.tsx components/Admin/ArticleCategories/components/ArticleCategoryManager.test.tsx`

Expected: FAIL because the hook and manager do not exist.

- [ ] **Step 6: Implement the state hook**

Implement read/retry/mutation state, abort stale reads, redirect `401` responses to `/admin/login`, and refresh the admin state after every successful mutation.

- [ ] **Step 7: Implement the management UI**

Use accessible labels for every text field, select, and up/down/delete button. Render explicit loading, empty, and retryable error states; use `sonner` for mutation success/failure feedback. Disable only the active operation and impossible moves.

- [ ] **Step 8: Add the protected admin page and dashboard entry**

Follow the authentication/redirect pattern used by `/admin/comments` and `/admin/analytics`. Link `文章分类` from the management center.

- [ ] **Step 9: Run Task 4 tests and verify they pass**

Run: `npm test -- components/Admin/ArticleCategories app/admin/layout.test.tsx`

Expected: PASS.

- [ ] **Step 10: Commit Task 4**

```bash
git add components/Admin/ArticleCategories app/admin/categories/page.tsx app/admin/page.tsx
git commit -m "feat: add article category admin UI"
```

### Task 5: Table-of-contents and reading-progress primitives

**Files:**
- Create: `components/Articles/articleReading.ts`
- Create: `components/Articles/articleReading.test.ts`
- Create: `components/Articles/ReadingProgressRing.tsx`
- Create: `components/Articles/ReadingProgressRing.test.tsx`
- Create: `components/Articles/ArticleTableOfContents.tsx`
- Create: `components/Articles/ArticleTableOfContents.test.tsx`

**Interfaces:**
- Produces:
  - `TableOfContentsItem { id: string; label: string; level: 2 | 3 }`
  - `collectArticleHeadings(article: HTMLElement): TableOfContentsItem[]`
  - `calculateReadingProgress(input: { articleTop: number; articleHeight: number; viewportTop: number; viewportHeight: number }): number`
  - `findActiveHeading(items, headingTops, activationTop): string | null`
  - `ReadingProgressRing({ progress }: { progress: number })`
  - `ArticleTableOfContents({ items, activeId, progress, onNavigate })`.

- [ ] **Step 1: Write pure utility tests**

Use jsdom article fixtures to cover only `h2`/`h3`, inline markup labels, punctuation-only fallback IDs, non-Latin text, supplied IDs, duplicate generated and supplied IDs, deterministic suffixes, active-heading boundaries, progress at top/middle/bottom, a scrolled container top offset, zero-height content, and finite clamped results.

- [ ] **Step 2: Run utility tests and verify they fail**

Run: `npm test -- components/Articles/articleReading.test.ts`

Expected: FAIL because the reading utilities do not exist.

- [ ] **Step 3: Implement heading and progress utilities**

Generate URL-safe IDs with a deterministic `section` fallback, suffix collisions with `-2`, `-3`, and preserve the first valid author ID. Base progress on `(viewportTop - articleTop) / (articleHeight - viewportHeight)`, clamp the integer result to 0–100, and return 100 when the entire article fits in the readable viewport and its top has reached the viewport activation edge.

- [ ] **Step 4: Write ring and TOC rendering tests**

Assert the SVG accessible name/value, gray track, blue arc, clamped stroke offset, active blue TOC entry, left active indicator, `h3` indentation, click callback, empty list behavior, and no blue class on article-navigation concepts.

- [ ] **Step 5: Run component tests and verify they fail**

Run: `npm test -- components/Articles/ReadingProgressRing.test.tsx components/Articles/ArticleTableOfContents.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 6: Implement the presentational components**

Use an SVG circle with `strokeDasharray`/`strokeDashoffset`. Keep navigation side effects in the parent and make the TOC component render only the supplied model.

- [ ] **Step 7: Run Task 5 tests and verify they pass**

Run: `npm test -- components/Articles`

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add components/Articles/articleReading.ts components/Articles/articleReading.test.ts components/Articles/ReadingProgressRing.tsx components/Articles/ReadingProgressRing.test.tsx components/Articles/ArticleTableOfContents.tsx components/Articles/ArticleTableOfContents.test.tsx
git commit -m "feat: add article reading navigation primitives"
```

### Task 6: Responsive article navigation and reading layout integration

**Files:**
- Create: `components/Articles/ArticleNavigation.tsx`
- Create: `components/Articles/ArticleNavigation.test.tsx`
- Create: `components/Articles/ArticleReadingLayout.tsx`
- Create: `components/Articles/ArticleReadingLayout.test.tsx`
- Modify: `app/posts/[slug]/page.tsx`
- Create: `app/posts/[slug]/page.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: Task 1 public navigation types, Task 2 `getPublicArticleNavigation()`, and Task 5 utilities/components.
- Produces: `ArticleNavigation({ groups, currentSlug })` and `ArticleReadingLayout({ groups, currentSlug, children })` used by the post page.

- [ ] **Step 1: Write article-navigation tests**

Assert category/post order, current article `aria-current="page"`, light/dark monochrome active classes with no blue active class, empty category rendering, valid encoded post links, and keyboard-visible focus styling.

- [ ] **Step 2: Run navigation tests and verify they fail**

Run: `npm test -- components/Articles/ArticleNavigation.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement article navigation**

Render semantic navigation and category sections. Use the same component in the desktop sidebar and mobile disclosure to prevent state/style drift.

- [ ] **Step 4: Write layout and page integration tests**

Test three-column classes at `xl` (1280px), hidden desktop sidebars below `xl`, two mobile `<details>` panels, article ref/selector placement, initial heading collection, scroll-listener and `requestAnimationFrame` cleanup, reduced-motion navigation behavior, article-relative progress updates, current-section updates, dynamic page rendering, fallback navigation passed through, and continued rendering of `ArticleCommentsProvider` and `ArticleVisitTracker` around MDX content.

- [ ] **Step 5: Run layout/page tests and verify they fail**

Run: `npm test -- components/Articles/ArticleReadingLayout.test.tsx app/posts/'[slug]'/page.test.tsx`

Expected: FAIL because the layout is not integrated.

- [ ] **Step 6: Implement the client reading layout**

Locate the existing nearest scrolling `main`, coalesce scroll/resize work through one animation-frame token, collect headings after mount, update active ID and progress in one measurement pass, and clean up listeners/frame callbacks. Use instant `scrollIntoView` when reduced motion is requested and smooth behavior otherwise.

- [ ] **Step 7: Integrate the server article page**

Fetch `getPublicArticleNavigation()`, set `export const dynamic = "force-dynamic"`, preserve metadata/static slug generation, and move the existing prose classes onto the central `<article>`.

- [ ] **Step 8: Add responsive and sticky styling**

Use Tailwind for the 1280px three-column breakpoint, desktop sticky sidebars, monochrome active state, and mobile disclosure layout. Add only shared scrollbar/sticky-offset CSS that cannot be expressed clearly with existing utilities.

- [ ] **Step 9: Run Task 6 and existing article interaction tests**

Run: `npm test -- components/Articles app/posts/'[slug]'/page.test.tsx components/Comments/Article components/Analytics/api/articleVisitApi.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit Task 6**

```bash
git add components/Articles app/posts/[slug]/page.tsx app/posts/[slug]/page.test.tsx app/globals.css
git commit -m "feat: redesign article reading page"
```

### Task 7: Documentation, full regression, and visual acceptance

**Files:**
- Modify: `README.md`
- Modify only if verification exposes defects: files owned by Tasks 1–6 and their tests.

**Interfaces:**
- Consumes: the complete feature.
- Produces: documented category migration/management workflow and verified production behavior.

- [ ] **Step 1: Update project documentation**

Document the new article classification admin route, one-category rule, manual up/down ordering, required `npm run migrate`, three-column reader, TOC behavior, and responsive fallback.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 3: Run static analysis**

Run: `npm run lint`

Expected: exit 0 with no errors.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: exit 0 and successful generation/compilation of public, post, admin, and API routes.

- [ ] **Step 5: Inspect the migration plan**

Run: `npm run migrate -- --plan`

Expected: `database/migrations/005-article-categories.sql` appears after `004-article-visits.sql`.

- [ ] **Step 6: Perform browser acceptance checks**

Start the existing development server, then inspect one long article and one short article at desktop and mobile widths. Verify light/dark themes, monochrome current article, category ordering, sticky sidebars, independent long-sidebar scrolling, mobile disclosures, TOC links, active-section blue state, circular progress at start/middle/end, reduced-motion behavior, code blocks, comments/annotations, and visit tracking without console errors.

- [ ] **Step 7: Check the admin workflow in a real session**

Create and rename a temporary category, move it, assign/reorder an article, return the article to its original state, and delete the empty temporary category. Confirm public navigation reflects every saved change on the next request.

- [ ] **Step 8: Review the final diff and working tree**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intended Task 7 changes remain before commit.

- [ ] **Step 9: Commit Task 7**

```bash
git add README.md
git commit -m "docs: document article category workflow"
```

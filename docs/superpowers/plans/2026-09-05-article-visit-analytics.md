# Article Visit Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-party anonymous article visit tracking and an authenticated admin analytics dashboard with traffic trends, popular articles, visitor monitoring, and per-visitor article preferences.

**Architecture:** Article pages send a fire-and-forget visit event to a dedicated API. PostgreSQL stores one effective visit per anonymous visitor, article, and fixed 30-minute UTC window. Admin-only APIs aggregate overview and visitor data server-side; a client dashboard renders the small aggregated datasets with shadcn Chart primitives backed by Recharts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL/Neon, Better Auth, Vitest, Tailwind CSS, Recharts 3, shadcn Chart local components.

**Spec:** `docs/superpowers/specs/2026-09-05-article-visit-analytics-design.md`

## Global Constraints

- Anonymous identity is the existing `blog_visitor_id` UUID Cookie; do not introduce ordinary-user authentication.
- Do not collect or store IP address, User-Agent, device data, Referer, geolocation, or browser fingerprints.
- Do not count visits made while an administrator session is active.
- Store timestamps in UTC and group calendar days using `Asia/Shanghai`.
- Count at most one PV per visitor, article, and fixed UTC 30-minute window.
- Retain visit records indefinitely; do not add automatic cleanup.
- Supported ranges are exactly `7d`, `30d`, `90d`, `180d`, and `all`; default to `30d`.
- Admin endpoints must return `401` without a valid Better Auth session and must use `no-store` responses.
- Use Recharts through local shadcn Chart primitives; do not migrate unrelated UI to shadcn.
- Preserve the existing unrelated uncommitted `README.md` change. Do not stage, overwrite, or commit it unless the user separately requests that action.

## File Structure

- `database/migrations/004-article-visits.sql`: creates visit storage, deduplication constraint, and analytics indexes.
- `lib/analytics/types.ts`: shared server-side analytics range, overview, visitor, and row types.
- `lib/analytics/range.ts`: validates range and pagination parameters and calculates Shanghai date boundaries.
- `lib/analytics/range.test.ts`: pure range and pagination tests.
- `lib/analytics/visitWindow.ts`: calculates deterministic UTC 30-minute visit windows.
- `lib/analytics/visitWindow.test.ts`: boundary tests for visit deduplication windows.
- `lib/analytics/repositories/articleVisitRepository.ts`: inserts effective visits and runs overview/visitor SQL queries.
- `lib/analytics/services/analyticsService.ts`: enriches slugs with MDX titles and fills missing trend dates.
- `lib/analytics/services/analyticsService.test.ts`: aggregation mapping, title fallback, and trend tests.
- `lib/posts.ts`: adds safe post existence and title-map helpers.
- `app/api/posts/[slug]/visits/route.ts`: anonymous visit collection endpoint.
- `app/api/posts/[slug]/visits/route.test.ts`: collection authentication, validation, and write tests.
- `components/Analytics/api/articleVisitApi.ts`: browser-side fire-and-forget visit request.
- `components/Analytics/api/articleVisitApi.test.ts`: visit request contract tests.
- `components/Analytics/ArticleVisitTracker.tsx`: sends one request when an article mounts.
- `app/posts/[slug]/page.tsx`: renders the tracker on real article pages.
- `app/api/admin/analytics/route.ts`: authenticated overview endpoint.
- `app/api/admin/analytics/visitors/route.ts`: authenticated visitor list endpoint.
- `app/api/admin/analytics/visitors/[visitorId]/route.ts`: authenticated visitor detail endpoint.
- `app/api/admin/analytics/analyticsRoutes.test.ts`: admin API authentication and parameter tests.
- `components/Admin/Analytics/types/analytics.ts`: browser response and UI types.
- `components/Admin/Analytics/api/analyticsApi.ts`: fetches overview, visitor pages, and visitor details.
- `components/Admin/Analytics/api/analyticsApi.test.ts`: browser API contract tests.
- `components/Admin/Analytics/hooks/useAnalyticsDashboard.ts`: range, pagination, loading, error, and detail state.
- `components/ui/chart.tsx`: local shadcn Chart primitives backed by Recharts.
- `lib/utils.ts`: `cn` class-name helper required by shadcn Chart.
- `components/Admin/Analytics/components/AnalyticsSummaryCards.tsx`: UV/PV/post/returning-visitor cards.
- `components/Admin/Analytics/components/VisitTrendChart.tsx`: UV/PV line chart.
- `components/Admin/Analytics/components/TopPostsChart.tsx`: top-ten horizontal bar chart.
- `components/Admin/Analytics/components/VisitorMonitor.tsx`: responsive visitor table/card list and pagination.
- `components/Admin/Analytics/components/VisitorDetailDrawer.tsx`: visitor preferences and recent timeline.
- `components/Admin/Analytics/components/AnalyticsDashboard.tsx`: composes the complete dashboard.
- `components/Admin/Analytics/components/AnalyticsDashboard.test.tsx`: server-rendered empty and populated UI assertions.
- `app/admin/analytics/page.tsx`: authenticated analytics page shell.
- `app/admin/page.tsx`: adds the “访问分析” navigation entry.

---

### Task 1: Add the Article Visit Migration

**Files:**
- Create: `database/migrations/004-article-visits.sql`
- Modify: `scripts/migrate.test.ts`

**Interfaces:**
- Consumes: existing `scripts/migrate.mjs` ordered migration discovery.
- Produces: PostgreSQL table `article_visits(visitor_id, post_slug, visited_at, visit_window)`.

- [ ] **Step 1: Write the failing migration discovery test**

Add a real-project plan assertion to `scripts/migrate.test.ts`:

```ts
it("discovers the article visit migration", async () => {
  const migrateModule = await import("./migrate.mjs");
  const names = await migrateModule.discoverMigrationNames(process.cwd());

  expect(names).toContain("database/migrations/004-article-visits.sql");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- scripts/migrate.test.ts
```

Expected: FAIL because `database/migrations/004-article-visits.sql` does not exist.

- [ ] **Step 3: Create the migration**

Create `database/migrations/004-article-visits.sql`:

```sql
create table if not exists article_visits (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  post_slug text not null,
  visited_at timestamptz not null default now(),
  visit_window timestamptz not null default (
    to_timestamp(
      floor(extract(epoch from now()) / 1800) * 1800
    )
  ),

  constraint article_visits_post_slug
    check (post_slug <> ''),

  constraint article_visits_window_unique
    unique (visitor_id, post_slug, visit_window)
);

create index if not exists article_visits_visited_at_idx
on article_visits (visited_at desc);

create index if not exists article_visits_post_time_idx
on article_visits (post_slug, visited_at desc);

create index if not exists article_visits_visitor_time_idx
on article_visits (visitor_id, visited_at desc);
```

- [ ] **Step 4: Verify the migration plan and tests**

Run:

```bash
npm test -- scripts/migrate.test.ts
npm run migrate -- --plan
```

Expected: tests PASS and the final plan entry is `database/migrations/004-article-visits.sql`. Do not run the live migration in this task.

- [ ] **Step 5: Commit**

```bash
git add database/migrations/004-article-visits.sql scripts/migrate.test.ts
git commit -m "feat: add article visit schema"
```

---

### Task 2: Record Anonymous Article Visits

**Files:**
- Create: `lib/analytics/repositories/articleVisitRepository.ts`
- Create: `lib/analytics/visitWindow.ts`
- Create: `lib/analytics/visitWindow.test.ts`
- Create: `app/api/posts/[slug]/visits/route.ts`
- Create: `app/api/posts/[slug]/visits/route.test.ts`
- Create: `components/Analytics/api/articleVisitApi.ts`
- Create: `components/Analytics/api/articleVisitApi.test.ts`
- Create: `components/Analytics/ArticleVisitTracker.tsx`
- Modify: `lib/posts.ts`
- Modify: `app/posts/[slug]/page.tsx`

**Interfaces:**
- Consumes: `auth.api.getSession`, `getOrCreateVisitorId`, `sql`, and MDX files in `content/posts`.
- Produces: `getVisitWindowStart(now: Date): Date`, `recordArticleVisit(visitorId: string, postSlug: string, now?: Date): Promise<boolean>`, `postExists(slug: string): Promise<boolean>`, and `trackArticleVisit(postSlug: string): Promise<void>`.

- [ ] **Step 1: Write the failing 30-minute window tests**

Create `lib/analytics/visitWindow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getVisitWindowStart } from "./visitWindow";

describe("getVisitWindowStart", () => {
  it("rounds down to the current UTC half-hour", () => {
    expect(
      getVisitWindowStart(new Date("2026-09-05T08:29:59.999Z")),
    ).toEqual(new Date("2026-09-05T08:00:00.000Z"));
    expect(
      getVisitWindowStart(new Date("2026-09-05T08:30:00.000Z")),
    ).toEqual(new Date("2026-09-05T08:30:00.000Z"));
  });
});
```

- [ ] **Step 2: Run the window test and verify RED**

Run:

```bash
npm test -- lib/analytics/visitWindow.test.ts
```

Expected: FAIL because `visitWindow.ts` does not exist.

- [ ] **Step 3: Implement the window calculator**

Create `lib/analytics/visitWindow.ts`:

```ts
const VISIT_WINDOW_MS = 30 * 60 * 1000;

export function getVisitWindowStart(now: Date): Date {
  return new Date(
    Math.floor(now.getTime() / VISIT_WINDOW_MS) * VISIT_WINDOW_MS,
  );
}
```

- [ ] **Step 4: Run the window test and verify GREEN**

Run:

```bash
npm test -- lib/analytics/visitWindow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing Route tests**

Create `app/api/posts/[slug]/visits/route.test.ts`. Mock only authentication, visitor identity, post lookup, and the database repository boundary:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  getOrCreateVisitorId,
  postExists,
  recordArticleVisit,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getOrCreateVisitorId: vi.fn(),
  postExists: vi.fn(),
  recordArticleVisit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));
vi.mock("@/lib/visitor", () => ({ getOrCreateVisitorId }));
vi.mock("@/lib/posts", () => ({ postExists }));
vi.mock("@/lib/analytics/repositories/articleVisitRepository", () => ({
  recordArticleVisit,
}));

import { POST } from "./route";

describe("POST /api/posts/[slug]/visits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(null);
    postExists.mockResolvedValue(true);
    getOrCreateVisitorId.mockResolvedValue(
      "11111111-1111-4111-8111-111111111111",
    );
    recordArticleVisit.mockResolvedValue(true);
  });

  it("records a valid anonymous article visit", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "css-grid" }),
    });

    expect(response.status).toBe(204);
    expect(recordArticleVisit).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "css-grid",
    );
  });

  it("does not record administrator visits", async () => {
    getSession.mockResolvedValue({ user: { id: "admin" } });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "css-grid" }),
    });

    expect(response.status).toBe(204);
    expect(recordArticleVisit).not.toHaveBeenCalled();
  });

  it("rejects malformed slugs", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "../secret" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 for a missing article", async () => {
    postExists.mockResolvedValue(false);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "missing-post" }),
    });

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 6: Run the Route test and verify RED**

Run:

```bash
npm test -- 'app/api/posts/[slug]/visits/route.test.ts'
```

Expected: FAIL because the Route and repository do not exist.

- [ ] **Step 7: Implement post lookup and visit insertion**

Update the existing `node:fs/promises` import in `lib/posts.ts` to include `access`, then add:

```ts
export async function postExists(slug: string): Promise<boolean> {
  try {
    await access(path.join(postsDirectory, `${slug}.mdx`));
    return true;
  } catch {
    return false;
  }
}
```

Create `lib/analytics/repositories/articleVisitRepository.ts`:

```ts
import { sql } from "@/lib/db";
import { getVisitWindowStart } from "@/lib/analytics/visitWindow";

export async function recordArticleVisit(
  visitorId: string,
  postSlug: string,
  now = new Date(),
): Promise<boolean> {
  const visitWindow = getVisitWindowStart(now);
  const rows = await sql`
    insert into article_visits (
      visitor_id,
      post_slug,
      visited_at,
      visit_window
    )
    values (
      ${visitorId}::uuid,
      ${postSlug},
      ${now.toISOString()}::timestamptz,
      ${visitWindow.toISOString()}::timestamptz
    )
    on conflict (visitor_id, post_slug, visit_window) do nothing
    returning id
  `;

  return rows.length === 1;
}
```

- [ ] **Step 8: Implement the visit Route**

Create `app/api/posts/[slug]/visits/route.ts`:

```ts
import { recordArticleVisit } from "@/lib/analytics/repositories/articleVisitRepository";
import { auth } from "@/lib/auth";
import { postExists } from "@/lib/posts";
import { getOrCreateVisitorId } from "@/lib/visitor";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    if (!SLUG_PATTERN.test(slug)) {
      return Response.json({ message: "文章 slug 不合法" }, { status: 400 });
    }

    if (!(await postExists(slug))) {
      return Response.json({ message: "文章不存在" }, { status: 404 });
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (session) {
      return new Response(null, { status: 204 });
    }

    const visitorId = await getOrCreateVisitorId();
    await recordArticleVisit(visitorId, slug);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("记录文章访问失败:", error);
    return Response.json({ message: "记录文章访问失败" }, { status: 500 });
  }
}
```

- [ ] **Step 9: Run the Route tests and verify GREEN**

Run:

```bash
npm test -- 'app/api/posts/[slug]/visits/route.test.ts'
```

Expected: all four tests PASS.

- [ ] **Step 10: Write the failing browser request test**

Create `components/Analytics/api/articleVisitApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { trackArticleVisit } from "./articleVisitApi";

describe("trackArticleVisit", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts an encoded slug as a keepalive request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await trackArticleVisit("css/grid");

    expect(fetchMock).toHaveBeenCalledWith("/api/posts/css%2Fgrid/visits", {
      method: "POST",
      cache: "no-store",
      keepalive: true,
    });
  });

  it("swallows network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(trackArticleVisit("css-grid")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 11: Run the browser request test and verify RED**

Run:

```bash
npm test -- components/Analytics/api/articleVisitApi.test.ts
```

Expected: FAIL because `articleVisitApi.ts` does not exist.

- [ ] **Step 12: Implement the request helper and Tracker**

Create `components/Analytics/api/articleVisitApi.ts`:

```ts
export async function trackArticleVisit(postSlug: string): Promise<void> {
  try {
    await fetch(`/api/posts/${encodeURIComponent(postSlug)}/visits`, {
      method: "POST",
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // Analytics must never interrupt reading.
  }
}
```

Create `components/Analytics/ArticleVisitTracker.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { trackArticleVisit } from "./api/articleVisitApi";

export default function ArticleVisitTracker({ postSlug }: { postSlug: string }) {
  useEffect(() => {
    void trackArticleVisit(postSlug);
  }, [postSlug]);

  return null;
}
```

Render it inside `ArticleCommentsProvider` in `app/posts/[slug]/page.tsx`:

```tsx
<ArticleCommentsProvider postSlug={slug} key={slug}>
  <ArticleVisitTracker postSlug={slug} />
  <Post />
</ArticleCommentsProvider>
```

- [ ] **Step 13: Verify tracking tests and compilation**

Run:

```bash
npm test -- lib/analytics/visitWindow.test.ts 'app/api/posts/[slug]/visits/route.test.ts' components/Analytics/api/articleVisitApi.test.ts
npx tsc --noEmit
```

Expected: tests PASS and TypeScript exits 0.

- [ ] **Step 14: Commit**

```bash
git add app/api/posts/'[slug]'/visits components/Analytics lib/analytics/repositories/articleVisitRepository.ts lib/analytics/visitWindow.ts lib/analytics/visitWindow.test.ts lib/posts.ts app/posts/'[slug]'/page.tsx
git commit -m "feat: track anonymous article visits"
```

---

### Task 3: Add Analytics Range and Pagination Contracts

**Files:**
- Create: `lib/analytics/types.ts`
- Create: `lib/analytics/range.ts`
- Create: `lib/analytics/range.test.ts`

**Interfaces:**
- Produces: `AnalyticsRangeKey`, `AnalyticsRange`, `parseAnalyticsRange`, `parseAnalyticsPagination`, and `formatShanghaiDate`.
- Consumed by: all analytics repositories, services, APIs, and dashboard requests.

- [ ] **Step 1: Write failing pure-function tests**

Create `lib/analytics/range.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  formatShanghaiDate,
  parseAnalyticsPagination,
  parseAnalyticsRange,
} from "./range";

describe("parseAnalyticsRange", () => {
  const now = new Date("2026-09-05T08:30:00.000Z");

  it("defaults to the last 30 Shanghai calendar days", () => {
    expect(parseAnalyticsRange(null, now)).toEqual({
      key: "30d",
      start: new Date("2026-08-06T16:00:00.000Z"),
      end: now,
      timezone: "Asia/Shanghai",
    });
  });

  it("supports all without a start boundary", () => {
    expect(parseAnalyticsRange("all", now)).toEqual({
      key: "all",
      start: null,
      end: now,
      timezone: "Asia/Shanghai",
    });
  });

  it("rejects an unsupported range", () => {
    expect(parseAnalyticsRange("365d", now)).toBeNull();
  });
});

describe("parseAnalyticsPagination", () => {
  it("applies defaults and caps page size", () => {
    expect(parseAnalyticsPagination(null, null)).toEqual({ page: 1, pageSize: 20 });
    expect(parseAnalyticsPagination("2", "200")).toEqual({ page: 2, pageSize: 100 });
  });

  it("rejects invalid page numbers", () => {
    expect(parseAnalyticsPagination("0", "20")).toBeNull();
    expect(parseAnalyticsPagination("abc", "20")).toBeNull();
  });
});

it("formats dates using the Shanghai calendar day", () => {
  expect(formatShanghaiDate(new Date("2026-09-04T16:30:00.000Z"))).toBe(
    "2026-09-05",
  );
});
```

- [ ] **Step 2: Run the range tests and verify RED**

Run:

```bash
npm test -- lib/analytics/range.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Define analytics types**

Create `lib/analytics/types.ts` with these exact public types:

```ts
export const ANALYTICS_RANGE_KEYS = ["7d", "30d", "90d", "180d", "all"] as const;
export type AnalyticsRangeKey = (typeof ANALYTICS_RANGE_KEYS)[number];

export type AnalyticsRange = {
  key: AnalyticsRangeKey;
  start: Date | null;
  end: Date;
  timezone: "Asia/Shanghai";
};

export type AnalyticsTrendPoint = {
  date: string;
  uniqueVisitors: number;
  pageViews: number;
};

export type AnalyticsPostMetric = {
  postSlug: string;
  title: string | null;
  uniqueVisitors: number;
  pageViews: number;
};

export type AnalyticsOverview = {
  range: {
    key: AnalyticsRangeKey;
    start: string | null;
    end: string;
    timezone: "Asia/Shanghai";
  };
  summary: {
    uniqueVisitors: number;
    pageViews: number;
    visitedPosts: number;
    returningVisitors: number;
  };
  trend: AnalyticsTrendPoint[];
  topPosts: AnalyticsPostMetric[];
};

export type AnalyticsVisitorListItem = {
  visitorId: string;
  displayId: string;
  firstVisitedAt: string;
  lastVisitedAt: string;
  pageViews: number;
  visitedPosts: number;
  favoritePost: {
    postSlug: string;
    title: string | null;
    pageViews: number;
  } | null;
};

export type AnalyticsVisitorPage = {
  visitors: AnalyticsVisitorListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AnalyticsVisitorDetail = {
  visitorId: string;
  displayId: string;
  firstVisitedAt: string;
  lastVisitedAt: string;
  pageViews: number;
  visitedPosts: number;
  posts: Array<{
    postSlug: string;
    title: string | null;
    pageViews: number;
    lastVisitedAt: string;
  }>;
  recentVisits: Array<{
    postSlug: string;
    title: string | null;
    visitedAt: string;
  }>;
};
```

- [ ] **Step 4: Implement range and pagination parsing**

Create `lib/analytics/range.ts`:

```ts
import {
  ANALYTICS_RANGE_KEYS,
  type AnalyticsRange,
  type AnalyticsRangeKey,
} from "./types";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<Exclude<AnalyticsRangeKey, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
};

function shanghaiDayStart(date: Date) {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) - SHANGHAI_OFFSET_MS,
  );
}

export function parseAnalyticsRange(
  value: string | null,
  now = new Date(),
): AnalyticsRange | null {
  const key = (value ?? "30d") as AnalyticsRangeKey;

  if (!ANALYTICS_RANGE_KEYS.includes(key)) return null;
  if (key === "all") {
    return { key, start: null, end: now, timezone: "Asia/Shanghai" };
  }

  const start = new Date(
    shanghaiDayStart(now).getTime() - (RANGE_DAYS[key] - 1) * DAY_MS,
  );
  return { key, start, end: now, timezone: "Asia/Shanghai" };
}

export function parseAnalyticsPagination(
  pageValue: string | null,
  pageSizeValue: string | null,
) {
  const page = pageValue === null ? 1 : Number(pageValue);
  const requestedPageSize = pageSizeValue === null ? 20 : Number(pageSizeValue);

  if (!Number.isInteger(page) || page < 1) return null;
  if (!Number.isInteger(requestedPageSize) || requestedPageSize < 1) return null;

  return { page, pageSize: Math.min(requestedPageSize, 100) };
}

export function formatShanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
```

- [ ] **Step 5: Run the range tests and verify GREEN**

Run:

```bash
npm test -- lib/analytics/range.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/analytics/types.ts lib/analytics/range.ts lib/analytics/range.test.ts
git commit -m "feat: define analytics query ranges"
```

---

### Task 4: Build Overview Analytics Queries and Mapping

**Files:**
- Modify: `lib/analytics/repositories/articleVisitRepository.ts`
- Create: `lib/analytics/services/analyticsService.ts`
- Create: `lib/analytics/services/analyticsService.test.ts`
- Modify: `lib/posts.ts`

**Interfaces:**
- Consumes: `AnalyticsRange` from Task 3 and article metadata from `lib/posts.ts`.
- Produces: `getAnalyticsOverview(range: AnalyticsRange): Promise<AnalyticsOverview>`.

- [ ] **Step 1: Write failing service mapping tests**

Create `lib/analytics/services/analyticsService.test.ts` with an injected repository result so the test exercises title mapping and zero-date filling without a database:

```ts
import { describe, expect, it } from "vitest";
import { buildAnalyticsOverview } from "./analyticsService";

it("fills missing days and maps known post titles", () => {
  const overview = buildAnalyticsOverview({
    range: {
      key: "7d",
      start: new Date("2026-08-29T16:00:00.000Z"),
      end: new Date("2026-09-05T08:00:00.000Z"),
      timezone: "Asia/Shanghai",
    },
    summary: {
      uniqueVisitors: 2,
      pageViews: 3,
      visitedPosts: 1,
      returningVisitors: 1,
    },
    trendRows: [
      { date: "2026-09-01", uniqueVisitors: 2, pageViews: 3 },
    ],
    topPostRows: [
      { postSlug: "css-grid", uniqueVisitors: 2, pageViews: 3 },
    ],
    postTitles: new Map([["css-grid", "CSS Grid"]]),
  });

  expect(overview.trend).toHaveLength(7);
  expect(overview.trend[2]).toEqual({
    date: "2026-09-01",
    uniqueVisitors: 2,
    pageViews: 3,
  });
  expect(overview.topPosts[0]).toEqual({
    postSlug: "css-grid",
    title: "CSS Grid",
    uniqueVisitors: 2,
    pageViews: 3,
  });
});

it("fills missing dates for all-time data and keeps deleted titles null", () => {
  const overview = buildAnalyticsOverview({
    range: {
      key: "all",
      start: null,
      end: new Date("2026-09-05T08:00:00.000Z"),
      timezone: "Asia/Shanghai",
    },
    summary: {
      uniqueVisitors: 1,
      pageViews: 1,
      visitedPosts: 1,
      returningVisitors: 0,
    },
    trendRows: [
      { date: "2026-09-03", uniqueVisitors: 1, pageViews: 1 },
      { date: "2026-09-05", uniqueVisitors: 1, pageViews: 1 },
    ],
    topPostRows: [{ postSlug: "removed", uniqueVisitors: 1, pageViews: 1 }],
    postTitles: new Map(),
  });

  expect(overview.topPosts[0].title).toBeNull();
  expect(overview.trend).toEqual([
    { date: "2026-09-03", uniqueVisitors: 1, pageViews: 1 },
    { date: "2026-09-04", uniqueVisitors: 0, pageViews: 0 },
    { date: "2026-09-05", uniqueVisitors: 1, pageViews: 1 },
  ]);
});
```

- [ ] **Step 2: Run the service tests and verify RED**

Run:

```bash
npm test -- lib/analytics/services/analyticsService.test.ts
```

Expected: FAIL because `analyticsService.ts` does not exist.

- [ ] **Step 3: Add post title lookup**

Refactor `lib/posts.ts` so one internal `readPostSummaries()` reads every MDX file once per call. Keep `getPostArchives()` behavior unchanged and add:

```ts
export async function getPostTitleMap(): Promise<Map<string, string>> {
  const posts = await readPostSummaries();
  return new Map(posts.map((post) => [post.slug, post.title]));
}
```

- [ ] **Step 4: Add overview repository queries**

Add these exports to `articleVisitRepository.ts`:

```ts
export async function getOverviewSummary(range: AnalyticsRange) {
  const rows = await sql`
    with filtered as (
      select visitor_id, post_slug, visited_at
      from article_visits
      where (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
        and visited_at <= ${range.end.toISOString()}::timestamptz
    ), visitor_counts as (
      select visitor_id, count(*)::int as visits
      from filtered
      group by visitor_id
    )
    select
      count(distinct visitor_id)::int as unique_visitors,
      count(*)::int as page_views,
      count(distinct post_slug)::int as visited_posts,
      (select count(*)::int from visitor_counts where visits > 1)
        as returning_visitors
    from filtered
  `;
  return rows[0];
}

export async function getOverviewTrend(range: AnalyticsRange) {
  return sql`
    select
      to_char(visited_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD') as date,
      count(distinct visitor_id)::int as unique_visitors,
      count(*)::int as page_views
    from article_visits
    where (${range.start?.toISOString() ?? null}::timestamptz is null
      or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    group by 1
    order by 1
  `;
}

export async function getTopPosts(range: AnalyticsRange) {
  return sql`
    select
      post_slug,
      count(distinct visitor_id)::int as unique_visitors,
      count(*)::int as page_views
    from article_visits
    where (${range.start?.toISOString() ?? null}::timestamptz is null
      or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    group by post_slug
    order by page_views desc, unique_visitors desc, post_slug asc
    limit 10
  `;
}
```

Keep the SQL result types internal and map every numeric field with `Number(...)` in the service.

- [ ] **Step 5: Implement overview mapping and zero filling**

Create `analyticsService.ts` with:

```ts
const DAY_MS = 24 * 60 * 60 * 1000;

type BuildOverviewInput = {
  range: AnalyticsRange;
  summary: AnalyticsOverview["summary"];
  trendRows: AnalyticsTrendPoint[];
  topPostRows: Array<Omit<AnalyticsPostMetric, "title">>;
  postTitles: Map<string, string>;
};

function enumerateDateStrings(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }

  return dates;
}

export function buildAnalyticsOverview(input: BuildOverviewInput): AnalyticsOverview {
  const trendByDate = new Map(input.trendRows.map((row) => [row.date, row]));
  const firstDate = input.range.start
    ? formatShanghaiDate(input.range.start)
    : input.trendRows[0]?.date ?? null;
  const dates = firstDate
    ? enumerateDateStrings(firstDate, formatShanghaiDate(input.range.end))
    : [];
  const trend = dates.map((date) => ({
        date,
        uniqueVisitors: trendByDate.get(date)?.uniqueVisitors ?? 0,
        pageViews: trendByDate.get(date)?.pageViews ?? 0,
      }));

  return {
    range: {
      key: input.range.key,
      start: input.range.start?.toISOString() ?? null,
      end: input.range.end.toISOString(),
      timezone: "Asia/Shanghai",
    },
    summary: input.summary,
    trend,
    topPosts: input.topPostRows.map((row) => ({
      ...row,
      title: input.postTitles.get(row.postSlug) ?? null,
    })),
  };
}
```

Add `getAnalyticsOverview(range)` that runs the three repository queries and `getPostTitleMap()` in parallel, maps row names, and delegates to `buildAnalyticsOverview`.

- [ ] **Step 6: Run tests and verify GREEN**

Run:

```bash
npm test -- lib/analytics/services/analyticsService.test.ts lib/analytics/range.test.ts
npx tsc --noEmit
```

Expected: tests PASS and TypeScript exits 0.

- [ ] **Step 7: Commit**

```bash
git add lib/analytics lib/posts.ts
git commit -m "feat: aggregate article visit overview"
```

---

### Task 5: Build Visitor List and Detail Queries

**Files:**
- Modify: `lib/analytics/repositories/articleVisitRepository.ts`
- Modify: `lib/analytics/services/analyticsService.ts`
- Modify: `lib/analytics/services/analyticsService.test.ts`

**Interfaces:**
- Consumes: `AnalyticsRange`, page, page size, visitor UUID, and post title map.
- Produces: `getAnalyticsVisitors(range, page, pageSize)` and `getAnalyticsVisitorDetail(range, visitorId)`.

- [ ] **Step 1: Write failing visitor mapping tests**

Add tests proving stable favorite selection, deleted-title fallback, display IDs, pagination, and recent-visit limit:

```ts
it("maps visitor favorites and pagination", () => {
  const page = buildAnalyticsVisitorPage({
    page: 2,
    pageSize: 20,
    total: 41,
    visitorRows: [{
      visitorId: "11111111-1111-4111-8111-111111111111",
      firstVisitedAt: "2026-09-01T00:00:00.000Z",
      lastVisitedAt: "2026-09-05T00:00:00.000Z",
      pageViews: 5,
      visitedPosts: 2,
      favoritePostSlug: "css-grid",
      favoritePostViews: 3,
    }],
    postTitles: new Map([["css-grid", "CSS Grid"]]),
  });

  expect(page.pagination).toEqual({
    page: 2,
    pageSize: 20,
    total: 41,
    totalPages: 3,
  });
  expect(page.visitors[0].displayId).toBe("访客 11111111");
  expect(page.visitors[0].favoritePost?.title).toBe("CSS Grid");
});

it("limits the visitor timeline to 100 records", () => {
  const visits = Array.from({ length: 120 }, (_, index) => ({
    postSlug: "css-grid",
    visitedAt: new Date(2026, 0, 1, 0, index).toISOString(),
  }));
  const detail = buildAnalyticsVisitorDetail({
    visitorId: "11111111-1111-4111-8111-111111111111",
    summary: {
      firstVisitedAt: visits[0].visitedAt,
      lastVisitedAt: visits[119].visitedAt,
      pageViews: 120,
      visitedPosts: 1,
    },
    postRows: [{
      postSlug: "css-grid",
      pageViews: 120,
      lastVisitedAt: visits[119].visitedAt,
    }],
    recentVisitRows: visits.reverse(),
    postTitles: new Map([["css-grid", "CSS Grid"]]),
  });

  expect(detail.recentVisits).toHaveLength(100);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- lib/analytics/services/analyticsService.test.ts
```

Expected: FAIL because visitor builders do not exist.

- [ ] **Step 3: Add visitor repository queries**

Implement repository functions with these SQL responsibilities:

```ts
getVisitorCount(range): Promise<number>
getVisitorPageRows(range, limit, offset): Promise<VisitorPageRow[]>
getVisitorSummary(range, visitorId): Promise<VisitorSummaryRow | null>
getVisitorPostRows(range, visitorId): Promise<VisitorPostRow[]>
getRecentVisitorRows(range, visitorId, limit): Promise<RecentVisitRow[]>
```

`getVisitorPageRows` must use CTEs in this order:

1. `filtered`: visits inside the selected range.
2. `visitor_page`: group by visitor, calculate first/last/PV/distinct posts, sort `last_visited_at desc`, then `limit` and `offset`.
3. `post_preferences`: aggregate only visitors contained in `visitor_page`; rank with `row_number() over (partition by visitor_id order by page_views desc, last_visited_at desc, post_slug asc)`.
4. Return the rank-1 favorite joined to each visitor row.

Every visitor-specific query must filter with `${visitorId}::uuid`. `getRecentVisitorRows` must order by `visited_at desc` and use `limit 100`.

Use this concrete query shape for the paginated visitor rows:

```ts
export async function getVisitorPageRows(
  range: AnalyticsRange,
  limit: number,
  offset: number,
) {
  return sql`
    with filtered as (
      select visitor_id, post_slug, visited_at
      from article_visits
      where (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
        and visited_at <= ${range.end.toISOString()}::timestamptz
    ), visitor_page as (
      select
        visitor_id,
        min(visited_at) as first_visited_at,
        max(visited_at) as last_visited_at,
        count(*)::int as page_views,
        count(distinct post_slug)::int as visited_posts
      from filtered
      group by visitor_id
      order by last_visited_at desc, visitor_id asc
      limit ${limit}
      offset ${offset}
    ), post_counts as (
      select
        filtered.visitor_id,
        filtered.post_slug,
        count(*)::int as page_views,
        max(filtered.visited_at) as last_visited_at
      from filtered
      inner join visitor_page using (visitor_id)
      group by filtered.visitor_id, filtered.post_slug
    ), post_preferences as (
      select
        post_counts.*,
        row_number() over (
          partition by visitor_id
          order by page_views desc, last_visited_at desc, post_slug asc
        ) as preference_rank
      from post_counts
    )
    select
      visitor_page.visitor_id,
      visitor_page.first_visited_at,
      visitor_page.last_visited_at,
      visitor_page.page_views,
      visitor_page.visited_posts,
      post_preferences.post_slug as favorite_post_slug,
      post_preferences.page_views as favorite_post_views
    from visitor_page
    left join post_preferences
      on post_preferences.visitor_id = visitor_page.visitor_id
      and post_preferences.preference_rank = 1
    order by visitor_page.last_visited_at desc, visitor_page.visitor_id asc
  `;
}
```

Implement the remaining repository queries with these exact aggregates:

```ts
export async function getVisitorCount(range: AnalyticsRange) {
  const rows = await sql`
    select count(distinct visitor_id)::int as total
    from article_visits
    where (${range.start?.toISOString() ?? null}::timestamptz is null
      or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
  `;
  return Number(rows[0]?.total ?? 0);
}

export async function getVisitorSummary(
  range: AnalyticsRange,
  visitorId: string,
) {
  const rows = await sql`
    select
      min(visited_at) as first_visited_at,
      max(visited_at) as last_visited_at,
      count(*)::int as page_views,
      count(distinct post_slug)::int as visited_posts
    from article_visits
    where visitor_id = ${visitorId}::uuid
      and (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    having count(*) > 0
  `;
  return rows[0] ?? null;
}

export function getVisitorPostRows(range: AnalyticsRange, visitorId: string) {
  return sql`
    select
      post_slug,
      count(*)::int as page_views,
      max(visited_at) as last_visited_at
    from article_visits
    where visitor_id = ${visitorId}::uuid
      and (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    group by post_slug
    order by page_views desc, last_visited_at desc, post_slug asc
  `;
}

export function getRecentVisitorRows(
  range: AnalyticsRange,
  visitorId: string,
  limit: number,
) {
  return sql`
    select post_slug, visited_at
    from article_visits
    where visitor_id = ${visitorId}::uuid
      and (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    order by visited_at desc, id desc
    limit ${Math.min(limit, 100)}
  `;
}
```

- [ ] **Step 4: Implement visitor mapping services**

Add:

```ts
type BuildVisitorPageInput = {
  page: number;
  pageSize: number;
  total: number;
  visitorRows: Array<{
    visitorId: string;
    firstVisitedAt: string;
    lastVisitedAt: string;
    pageViews: number;
    visitedPosts: number;
    favoritePostSlug: string | null;
    favoritePostViews: number | null;
  }>;
  postTitles: Map<string, string>;
};

type BuildVisitorDetailInput = {
  visitorId: string;
  summary: {
    firstVisitedAt: string;
    lastVisitedAt: string;
    pageViews: number;
    visitedPosts: number;
  };
  postRows: Array<{
    postSlug: string;
    pageViews: number;
    lastVisitedAt: string;
  }>;
  recentVisitRows: Array<{
    postSlug: string;
    visitedAt: string;
  }>;
  postTitles: Map<string, string>;
};

export function getVisitorDisplayId(visitorId: string) {
  return `访客 ${visitorId.slice(0, 8)}`;
}

export function buildAnalyticsVisitorPage(input: BuildVisitorPageInput): AnalyticsVisitorPage
export function buildAnalyticsVisitorDetail(input: BuildVisitorDetailInput): AnalyticsVisitorDetail
export async function getAnalyticsVisitors(
  range: AnalyticsRange,
  page: number,
  pageSize: number,
): Promise<AnalyticsVisitorPage>
export async function getAnalyticsVisitorDetail(
  range: AnalyticsRange,
  visitorId: string,
): Promise<AnalyticsVisitorDetail | null>
```

`getAnalyticsVisitors` computes `offset = (page - 1) * pageSize`, runs count/page/title-map requests in parallel, and returns `totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)`.

`getAnalyticsVisitorDetail` returns `null` when the summary query has no row. Map unknown titles to `null` and slice `recentVisitRows` to 100 defensively even though SQL already limits them.

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
npm test -- lib/analytics/services/analyticsService.test.ts
npx tsc --noEmit
```

Expected: visitor tests PASS and TypeScript exits 0.

- [ ] **Step 6: Commit**

```bash
git add lib/analytics
git commit -m "feat: add anonymous visitor analytics"
```

---

### Task 6: Expose Authenticated Admin Analytics APIs

**Files:**
- Create: `app/api/admin/analytics/route.ts`
- Create: `app/api/admin/analytics/visitors/route.ts`
- Create: `app/api/admin/analytics/visitors/[visitorId]/route.ts`
- Create: `app/api/admin/analytics/analyticsRoutes.test.ts`

**Interfaces:**
- Consumes: range/pagination parsing and analytics services from Tasks 3–5.
- Produces: three admin-only JSON endpoints defined by the spec.

- [ ] **Step 1: Write failing API tests**

Create one test file that imports all three Routes with mocked auth and service boundaries. Cover these literal behaviors:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  getAnalyticsOverview,
  getAnalyticsVisitors,
  getAnalyticsVisitorDetail,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAnalyticsOverview: vi.fn(),
  getAnalyticsVisitors: vi.fn(),
  getAnalyticsVisitorDetail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/lib/analytics/services/analyticsService", () => ({
  getAnalyticsOverview,
  getAnalyticsVisitors,
  getAnalyticsVisitorDetail,
}));

import { GET as getOverview } from "./route";
import { GET as getVisitors } from "./visitors/route";
import { GET as getVisitorDetail } from "./visitors/[visitorId]/route";

describe("admin analytics Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

it("returns 401 for an unauthenticated overview request", async () => {
  getSession.mockResolvedValue(null);
  const response = await getOverview(
    new Request("http://localhost/api/admin/analytics?range=30d"),
  );
  expect(response.status).toBe(401);
});

it("returns 400 for an invalid range", async () => {
  getSession.mockResolvedValue({ user: { id: "admin" } });
  const response = await getOverview(
    new Request("http://localhost/api/admin/analytics?range=365d"),
  );
  expect(response.status).toBe(400);
});

it("passes valid pagination to the visitor service", async () => {
  getSession.mockResolvedValue({ user: { id: "admin" } });
  getAnalyticsVisitors.mockResolvedValue({ visitors: [], pagination: {
    page: 2, pageSize: 50, total: 0, totalPages: 0,
  }});
  const response = await getVisitors(
    new Request("http://localhost/api/admin/analytics/visitors?range=90d&page=2&pageSize=50"),
  );
  expect(response.status).toBe(200);
  expect(getAnalyticsVisitors).toHaveBeenCalledWith(
    expect.objectContaining({ key: "90d" }),
    2,
    50,
  );
});

it("returns 400 for an invalid visitor UUID", async () => {
  getSession.mockResolvedValue({ user: { id: "admin" } });
  const response = await getVisitorDetail(
    new Request("http://localhost"),
    { params: Promise.resolve({ visitorId: "invalid" }) },
  );
  expect(response.status).toBe(400);
});

});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- app/api/admin/analytics/analyticsRoutes.test.ts
```

Expected: FAIL because the Routes do not exist.

- [ ] **Step 3: Implement shared Route behavior**

Each Route must:

```ts
export const dynamic = "force-dynamic";

const session = await auth.api.getSession({ headers: request.headers });
if (!session) {
  return Response.json(
    { message: "请先登录管理员账号" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
```

Parse the URL with `new URL(request.url)`. Use `parseAnalyticsRange`, use `parseAnalyticsPagination` for the list Route, and validate detail IDs with the same UUID pattern already used by comment APIs.

Successful responses use:

```ts
return Response.json(data, {
  headers: { "Cache-Control": "no-store" },
});
```

The detail Route returns 404 with `{ message: "访客记录不存在" }` when the service returns `null`.

- [ ] **Step 4: Run API tests and verify GREEN**

Run:

```bash
npm test -- app/api/admin/analytics/analyticsRoutes.test.ts
npx tsc --noEmit
```

Expected: API tests PASS and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/analytics
git commit -m "feat: expose admin visit analytics APIs"
```

---

### Task 7: Add Recharts and Local shadcn Chart Primitives

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `lib/utils.ts`
- Create: `components/ui/chart.tsx`

**Interfaces:**
- Produces: `cn`, `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, and `ChartLegendContent`.
- Consumed by: dashboard chart components in Task 8.

- [ ] **Step 1: Install exact chart dependencies**

Run:

```bash
pnpm add recharts@^3.10.1 clsx@^2.1.1 tailwind-merge@^3.3.1
```

Expected: `package.json` and the tracked `pnpm-lock.yaml` change. Do not create a second lockfile.

- [ ] **Step 2: Add the shadcn class-name helper**

Create `lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Add local shadcn Chart primitives**

Create `components/ui/chart.tsx` based on the current shadcn Chart v3 component. Keep only these exports:

```ts
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  }
>;

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
```

The file must retain shadcn's generated per-chart CSS variables, `data-chart` scoping, `ResponsiveContainer`, tooltip label/value rendering, and legend icon/color rendering. Import `cn` from `@/lib/utils` and Recharts from `recharts`. Do not add Card, Button, Drawer, or unrelated shadcn components.

- [ ] **Step 4: Verify compilation and lint**

Run:

```bash
npx tsc --noEmit
npm run lint -- components/ui/chart.tsx lib/utils.ts
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml lib/utils.ts components/ui/chart.tsx
git commit -m "feat: add shadcn chart foundation"
```

---

### Task 8: Build the Overview Dashboard and Browser API Layer

**Files:**
- Create: `components/Admin/Analytics/types/analytics.ts`
- Create: `components/Admin/Analytics/api/analyticsApi.ts`
- Create: `components/Admin/Analytics/api/analyticsApi.test.ts`
- Create: `components/Admin/Analytics/hooks/useAnalyticsDashboard.ts`
- Create: `components/Admin/Analytics/components/AnalyticsSummaryCards.tsx`
- Create: `components/Admin/Analytics/components/VisitTrendChart.tsx`
- Create: `components/Admin/Analytics/components/TopPostsChart.tsx`
- Create: `components/Admin/Analytics/components/AnalyticsDashboard.tsx`
- Create: `components/Admin/Analytics/components/AnalyticsDashboard.test.tsx`

**Interfaces:**
- Consumes: admin JSON APIs from Task 6 and chart primitives from Task 7.
- Produces: a dashboard that loads range-based overview data and exposes range state for visitor monitoring.

- [ ] **Step 1: Write failing browser API tests**

Create `analyticsApi.test.ts` and assert exact encoded URLs and error behavior:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsOverview } from "../types/analytics";
import { requestAnalyticsOverview } from "./analyticsApi";

const overviewFixture: AnalyticsOverview = {
  range: {
    key: "30d",
    start: "2026-08-06T16:00:00.000Z",
    end: "2026-09-05T08:00:00.000Z",
    timezone: "Asia/Shanghai",
  },
  summary: {
    uniqueVisitors: 12,
    pageViews: 30,
    visitedPosts: 4,
    returningVisitors: 5,
  },
  trend: [{ date: "2026-09-05", uniqueVisitors: 12, pageViews: 30 }],
  topPosts: [{
    postSlug: "css-grid",
    title: "CSS Grid",
    uniqueVisitors: 8,
    pageViews: 20,
  }],
};

afterEach(() => vi.unstubAllGlobals());

it("loads the 30-day overview without caching", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response(JSON.stringify(overviewFixture), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  ));

  await expect(requestAnalyticsOverview("30d")).resolves.toEqual(
    overviewFixture,
  );
  expect(fetch).toHaveBeenCalledWith(
    "/api/admin/analytics?range=30d",
    expect.objectContaining({ cache: "no-store" }),
  );
});

it("preserves the HTTP status on API errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ message: "请先登录管理员账号" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  ));

  await expect(requestAnalyticsOverview("30d")).rejects.toMatchObject({
    status: 401,
    message: "请先登录管理员账号",
  });
});
```

- [ ] **Step 2: Run API tests and verify RED**

Run:

```bash
npm test -- components/Admin/Analytics/api/analyticsApi.test.ts
```

Expected: FAIL because the browser API module does not exist.

- [ ] **Step 3: Add browser types and API functions**

Re-export JSON-safe equivalents of the server response types in `types/analytics.ts`. Implement:

```ts
export class AnalyticsApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "AnalyticsApiError";
  }
}

export function requestAnalyticsOverview(
  range: AnalyticsRangeKey,
  signal?: AbortSignal,
): Promise<AnalyticsOverview>

export function requestAnalyticsVisitors(
  range: AnalyticsRangeKey,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<AnalyticsVisitorPage>

export function requestAnalyticsVisitorDetail(
  visitorId: string,
  range: AnalyticsRangeKey,
  signal?: AbortSignal,
): Promise<AnalyticsVisitorDetail>
```

All requests use `cache: "no-store"`, encode query parameters with `URLSearchParams`, safely parse JSON, and throw `AnalyticsApiError` with the response status.

- [ ] **Step 4: Run API tests and verify GREEN**

Run:

```bash
npm test -- components/Admin/Analytics/api/analyticsApi.test.ts
```

Expected: tests PASS.

- [ ] **Step 5: Write failing dashboard markup tests**

Use `renderToStaticMarkup` with pure presentational components. Assert user-visible behavior, not Recharts SVG internals:

```tsx
const emptyOverviewFixture: AnalyticsOverview = {
  ...overviewFixture,
  summary: {
    uniqueVisitors: 0,
    pageViews: 0,
    visitedPosts: 0,
    returningVisitors: 0,
  },
  trend: [],
  topPosts: [],
};

it("renders summary values and article labels", () => {
  const markup = renderToStaticMarkup(
    <AnalyticsDashboardView
      range="30d"
      overview={overviewFixture}
      overviewLoading={false}
      overviewError=""
      onRangeChange={() => undefined}
      onRetryOverview={() => undefined}
    >
      <div>visitor monitor</div>
    </AnalyticsDashboardView>,
  );

  expect(markup).toContain("匿名访客");
  expect(markup).toContain(">12<");
  expect(markup).toContain("CSS Grid");
  expect(markup).toContain("访问趋势");
});

it("renders a clear empty state instead of empty charts", () => {
  const markup = renderToStaticMarkup(
    <AnalyticsDashboardView
      range="30d"
      overview={emptyOverviewFixture}
      overviewLoading={false}
      overviewError=""
      onRangeChange={() => undefined}
      onRetryOverview={() => undefined}
    >
      <div>visitor monitor</div>
    </AnalyticsDashboardView>,
  );

  expect(markup).toContain("当前时间范围内还没有访问数据");
});
```

- [ ] **Step 6: Run dashboard tests and verify RED**

Run:

```bash
npm test -- components/Admin/Analytics/components/AnalyticsDashboard.test.tsx
```

Expected: FAIL because dashboard components do not exist.

- [ ] **Step 7: Implement summary cards and charts**

Use these chart configurations:

```ts
const trendConfig = {
  uniqueVisitors: { label: "UV", color: "#0ea5e9" },
  pageViews: { label: "PV", color: "#8b5cf6" },
} satisfies ChartConfig;

const topPostsConfig = {
  pageViews: { label: "访问次数", color: "#0ea5e9" },
} satisfies ChartConfig;
```

`VisitTrendChart` renders `LineChart`, `CartesianGrid`, `XAxis`, `YAxis`, two `Line` components with `dot={false}` and `isAnimationActive={false}`, plus shadcn tooltip and legend.

`TopPostsChart` renders a vertical-layout `BarChart`, category `YAxis`, numeric `XAxis`, and one `Bar` with `isAnimationActive={false}`. Limit input with `topPosts.slice(0, 10)` even though the API already limits it.

Both components must expose headings and textual totals outside SVG so screen readers and tests do not depend on Recharts internals.

- [ ] **Step 8: Implement the dashboard Hook and overview composition**

`useAnalyticsDashboard` owns:

```ts
range: AnalyticsRangeKey
overview: AnalyticsOverview | null
overviewLoading: boolean
overviewError: string
page: number
selectedVisitorId: string | null
setRange(nextRange): void
setPage(nextPage): void
selectVisitor(visitorId): void
closeVisitor(): void
retryOverview(): void
```

On range change, abort the old overview request, set page to 1, close visitor detail, and load the new overview. On `AnalyticsApiError` status 401, call `router.replace("/admin/login")`.

Split `AnalyticsDashboardView` from the stateful `AnalyticsDashboard` so server-markup tests can render the view without running effects.

- [ ] **Step 9: Verify dashboard tests and types**

Run:

```bash
npm test -- components/Admin/Analytics
npx tsc --noEmit
```

Expected: API and dashboard tests PASS; TypeScript exits 0.

- [ ] **Step 10: Commit**

```bash
git add components/Admin/Analytics
git commit -m "feat: add visit analytics overview dashboard"
```

---

### Task 9: Add Visitor Monitoring, Detail Drawer, and Admin Navigation

**Files:**
- Create: `components/Admin/Analytics/components/VisitorMonitor.tsx`
- Create: `components/Admin/Analytics/components/VisitorDetailDrawer.tsx`
- Modify: `components/Admin/Analytics/components/AnalyticsDashboard.tsx`
- Modify: `components/Admin/Analytics/components/AnalyticsDashboard.test.tsx`
- Create: `app/admin/analytics/page.tsx`
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: visitor list/detail API functions and dashboard range/page state.
- Produces: complete `/admin/analytics` experience and management-center navigation.

- [ ] **Step 1: Write failing visitor UI tests**

Add presentational tests with literal visitor fixtures:

```tsx
const deletedPostDetailFixture: AnalyticsVisitorDetail = {
  visitorId: "11111111-1111-4111-8111-111111111111",
  displayId: "访客 11111111",
  firstVisitedAt: "2026-09-01T00:00:00.000Z",
  lastVisitedAt: "2026-09-05T00:00:00.000Z",
  pageViews: 2,
  visitedPosts: 1,
  posts: [{
    postSlug: "removed-post",
    title: null,
    pageViews: 2,
    lastVisitedAt: "2026-09-05T00:00:00.000Z",
  }],
  recentVisits: [{
    postSlug: "removed-post",
    title: null,
    visitedAt: "2026-09-05T00:00:00.000Z",
  }],
};

it("renders visitor monitoring data", () => {
  const markup = renderToStaticMarkup(
    <VisitorMonitorView
      visitors={[{
        visitorId: "11111111-1111-4111-8111-111111111111",
        displayId: "访客 11111111",
        firstVisitedAt: "2026-09-01T00:00:00.000Z",
        lastVisitedAt: "2026-09-05T00:00:00.000Z",
        pageViews: 5,
        visitedPosts: 2,
        favoritePost: {
          postSlug: "css-grid",
          title: "CSS Grid",
          pageViews: 3,
        },
      }]}
      pagination={{ page: 1, pageSize: 20, total: 1, totalPages: 1 }}
      loading={false}
      error=""
      onSelectVisitor={() => undefined}
      onPageChange={() => undefined}
      onRetry={() => undefined}
    />,
  );

  expect(markup).toContain("访客 11111111");
  expect(markup).toContain("CSS Grid");
  expect(markup).toContain("5 次访问");
});

it("labels deleted articles by slug", () => {
  const markup = renderToStaticMarkup(
    <VisitorDetailView detail={deletedPostDetailFixture} onClose={() => undefined} />,
  );
  expect(markup).toContain("removed-post");
  expect(markup).toContain("文章不存在");
});
```

- [ ] **Step 2: Run visitor UI tests and verify RED**

Run:

```bash
npm test -- components/Admin/Analytics/components/AnalyticsDashboard.test.tsx
```

Expected: FAIL because visitor components do not exist.

- [ ] **Step 3: Implement visitor list loading**

Extend `useAnalyticsDashboard` with:

```ts
visitorPage: AnalyticsVisitorPage | null
visitorsLoading: boolean
visitorsError: string
retryVisitors(): void
```

Load visitor data whenever `range` or `page` changes. Abort stale requests. A visitor-list failure must not clear a successfully loaded overview.

`VisitorMonitorView` renders:

- Desktop table at `md` and above.
- Mobile card list below `md`.
- Columns/fields: display ID, first visit, last visit, PV, visited posts, favorite article, details action.
- Previous/next buttons disabled at pagination boundaries.
- Loading, error/retry, and zero-visitor states.

- [ ] **Step 4: Implement visitor detail loading and drawer**

Extend the Hook with:

```ts
visitorDetail: AnalyticsVisitorDetail | null
visitorDetailLoading: boolean
visitorDetailError: string
retryVisitorDetail(): void
```

When `selectedVisitorId` changes, request detail with the current range. Close and clear detail when range changes.

`VisitorDetailDrawer` follows the keyboard and backdrop behavior of the existing `CommentDrawer`:

- `role="dialog"`, `aria-modal="true"`, labelled heading.
- Escape closes the drawer.
- Backdrop click closes the drawer.
- Internal clicks stop propagation.
- Body contains summary, article ranking, and recent 100-visit timeline.
- Deleted article uses slug plus “文章不存在”.

- [ ] **Step 5: Implement the authenticated page and navigation**

Create `app/admin/analytics/page.tsx`:

```tsx
import AnalyticsDashboard from "@/components/Admin/Analytics/components/AnalyticsDashboard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminAnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">
        返回管理中心
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">访问分析</h1>
      <AnalyticsDashboard />
    </main>
  );
}
```

Add an `/admin/analytics` link labelled “访问分析” beside the existing “评论审核” link in `app/admin/page.tsx`. Replace `next/dist/client/link` with the public `next/link` import while touching that file.

- [ ] **Step 6: Run UI tests and verify GREEN**

Run:

```bash
npm test -- components/Admin/Analytics
npx tsc --noEmit
npm run lint -- components/Admin/Analytics app/admin/analytics/page.tsx app/admin/page.tsx
```

Expected: tests PASS; TypeScript and ESLint exit 0.

- [ ] **Step 7: Commit**

```bash
git add components/Admin/Analytics app/admin/analytics/page.tsx app/admin/page.tsx
git commit -m "feat: add visitor monitoring dashboard"
```

---

### Task 10: Full Verification and Manual Analytics Smoke Test

**Files:**
- Modify only files required to fix verification failures caused by this feature.

**Interfaces:**
- Consumes: complete feature from Tasks 1–9.
- Produces: verified migration plan, test suite, production build, and manual behavior evidence.

- [ ] **Step 1: Run the full automated suite**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run migrate -- --plan
```

Expected:

- All Vitest files pass.
- TypeScript exits 0.
- ESLint has no new errors; the existing `app/layout.tsx` manual stylesheet warning may remain.
- Migration plan lists bootstrap schemas followed by `001`, `002`, `003`, and `004-article-visits.sql`.

- [ ] **Step 2: Run a production build**

```bash
npx next build --webpack
```

Expected: build exits 0 and lists `/admin/analytics`, the three admin analytics APIs, and `/api/posts/[slug]/visits`.

- [ ] **Step 3: Apply the migration only with explicit database authority**

If the user authorizes changing the configured database, run:

```bash
npm run migrate
```

Expected: `004-article-visits.sql` is recorded in `schema_migrations`. If authority is not provided, do not run this command; report that live migration remains pending.

- [ ] **Step 4: Smoke-test anonymous tracking**

Start the app:

```bash
npm run dev
```

In a signed-out browser:

1. Open one article.
2. Confirm `POST /api/posts/<slug>/visits` returns 204.
3. Refresh the same article inside the same 30-minute window.
4. Confirm the admin dashboard shows one effective visit, not two.
5. Open a second article and confirm PV and visited-post counts increase.

- [ ] **Step 5: Smoke-test admin behavior**

1. Sign in as the administrator.
2. Open an article and confirm the visit does not increase analytics counts.
3. Open `/admin/analytics`.
4. Switch 7/30/90/180/all ranges.
5. Confirm cards, trends, top posts, visitor pagination, and visitor drawer update.
6. Check desktop and mobile widths and both light and dark themes.

- [ ] **Step 6: Review the final diff**

```bash
git status --short
git diff --check
git diff --stat
```

Expected: no whitespace errors and no unrelated `README.md` changes staged by this feature.

- [ ] **Step 7: Commit final verification fixes if any**

If Step 1–6 required source changes:

```bash
git add <only-the-files-fixed-for-verification>
git commit -m "fix: complete visit analytics verification"
```

If no files changed, do not create an empty commit.

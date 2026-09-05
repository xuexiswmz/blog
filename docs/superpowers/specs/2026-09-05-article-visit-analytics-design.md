# 文章访问分析与匿名访客监控设计

## 目标

为博客增加第一方访问分析能力，并在现有管理中心提供类似“用户监控”的访问概览、文章热度和匿名访客详情。

系统需要回答以下问题：

- 选定时间范围内有多少匿名访客访问过文章。
- 产生了多少次有效文章访问。
- 每日 UV 和 PV 如何变化。
- 哪些文章最受访问者关注。
- 单个匿名访客访问过哪些文章、访问频率和最近访问时间。

本功能复用现有 `blog_visitor_id` Cookie。一个 Cookie 对应一个匿名浏览器访客，不尝试识别现实身份，也不跨浏览器或设备合并访客。

## 不在本次范围内

- 普通用户注册或登录体系。
- IP、User-Agent、设备型号、地理位置和浏览器指纹采集。
- 当前在线人数或需要心跳请求的实时在线状态。
- 页面停留时长、滚动深度、来源渠道和转化漏斗。
- 外部分析平台接入。
- 自动清理历史访问数据。
- 大规模数据仓库、预聚合表或流式分析。

## 核心统计口径

### 匿名访客

使用现有 `blog_visitor_id` Cookie 中的 UUID 作为 `visitor_id`。Cookie 不存在或不合法时，通过现有 `getOrCreateVisitorId` 创建新 UUID。

管理员已登录时产生的文章访问不计入统计。没有执行客户端 JavaScript 的爬虫不会触发访问上报。

### 有效访问与 30 分钟去重

一次成功写入数据库的文章访问称为一个有效访问，也是一个 PV。

同一 `visitor_id` 在同一个 30 分钟时间窗口内访问同一个 `post_slug`，最多写入一条记录。数据库通过唯一约束保证重复刷新和 React 开发模式下的重复 Effect 不会重复计数。

时间窗口按 UTC Unix 时间每 30 分钟切分。窗口边界是确定的，便于数据库使用唯一约束完成并发安全去重。

### UV、回访访客和文章偏好

- UV：选定时间范围内不同 `visitor_id` 的数量。
- PV：选定时间范围内有效访问记录数量。
- 被访问文章数：选定时间范围内不同 `post_slug` 的数量。
- 回访访客：选定时间范围内有效访问记录数大于 1 的访客数量。
- 访客最常访问文章：该访客在选定时间范围内 PV 最大的文章。

最常访问文章发生并列时，依次按最后访问时间倒序、`post_slug` 正序选择，确保结果稳定。

### 日期与范围

数据库统一存储 UTC 时间。日趋势在 SQL 中按 `Asia/Shanghai` 时区划分自然日。

管理页面提供以下范围：

- 最近 7 天
- 最近 30 天，默认值
- 最近 90 天
- 最近 180 天
- 全部时间

最近 N 天从上海时区当天零点向前包含 N 个自然日，结束时间为查询时刻。全部时间不设置开始时间。

访问明细长期保留，不自动清理。

## 数据模型

新增迁移 `database/migrations/004-article-visits.sql`。

### `article_visits`

字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `bigint generated always as identity` | 主键 |
| `visitor_id` | `uuid` | 匿名访客 Cookie ID |
| `post_slug` | `text` | 文章 slug |
| `visited_at` | `timestamptz` | 实际记录时间，默认 `now()` |
| `visit_window` | `timestamptz` | `visited_at` 所属的 UTC 30 分钟窗口起点 |

约束：

- `unique (visitor_id, post_slug, visit_window)`，保证同一窗口内不重复计数。
- `post_slug <> ''`。

索引：

- `(visited_at desc)`：范围统计与最近访问。
- `(post_slug, visited_at desc)`：文章排行与文章趋势。
- `(visitor_id, visited_at desc)`：访客列表和访客详情。

`article_visits` 不与 Better Auth 的 `user` 表建立外键。匿名访客和管理员账号是两套不同身份模型。

## 访问采集

### 客户端组件

新增 `ArticleVisitTracker` 客户端组件，由 `app/posts/[slug]/page.tsx` 在文章页面中渲染。

组件挂载后发送：

```text
POST /api/posts/:slug/visits
```

请求使用 `fetch`、`keepalive: true` 和 `cache: "no-store"`。请求不携带业务 body。上报失败不显示 Toast，不阻塞文章内容，也不重试，避免统计功能影响阅读体验。

### 访问接口

新增 `app/api/posts/[slug]/visits/route.ts`。

处理流程：

1. 校验 slug 格式。
2. 确认 slug 对应现有 MDX 文章；不存在返回 404。
3. 读取管理员 session；已登录管理员直接返回 204，不写数据库。
4. 获取或创建匿名 `visitor_id`。
5. 在 SQL 中计算当前 UTC 30 分钟窗口起点。
6. 插入 `article_visits`，冲突时 `do nothing`。
7. 返回 204。

访问写入失败时服务端记录错误并返回 500。客户端安静忽略该响应。

文章存在性判断复用 `lib/posts.ts` 的文章元数据读取能力，不在 Route 中重复直接访问文件系统。

## 管理端查询架构

统计逻辑拆分为三层：

1. `lib/analytics`：范围解析、数据库查询、文章标题映射和响应模型。
2. 管理 API Route：管理员认证、参数验证和 HTTP 响应。
3. 管理页面组件：加载状态、筛选状态、图表和表格交互。

所有管理 API 都设置动态响应和 `Cache-Control: no-store`。未登录返回 401，参数错误返回 400，服务端异常返回 500。

### 概览接口

```text
GET /api/admin/analytics?range=30d
```

响应包含：

```ts
type AnalyticsOverview = {
  range: {
    key: "7d" | "30d" | "90d" | "180d" | "all";
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
  trend: Array<{
    date: string;
    uniqueVisitors: number;
    pageViews: number;
  }>;
  topPosts: Array<{
    postSlug: string;
    title: string | null;
    uniqueVisitors: number;
    pageViews: number;
  }>;
};
```

趋势结果补齐没有访问的日期并返回零值，避免图表出现断点。全部时间范围按实际最早访问日期开始；没有数据时返回空趋势数组。

热门文章最多返回 10 条，按 PV 倒序、UV 倒序、slug 正序排列。文章已经从 MDX 中删除时，`title` 返回 `null`，前端显示 slug 和“文章不存在”。

### 访客列表接口

```text
GET /api/admin/analytics/visitors?range=30d&page=1&pageSize=20
```

`page` 最小为 1。`pageSize` 默认 20，最大 100。

响应包含分页信息以及：

```ts
type AnalyticsVisitorListItem = {
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
```

`displayId` 使用 UUID 前 8 位生成，例如“访客 a1b2c3d4”。完整 UUID 只在管理员 API 和详情链接内部使用。

访客列表按最近访问时间倒序。SQL 先确定当前页访客，再只为当前页计算文章偏好，避免对所有访客执行不必要的明细聚合。

### 访客详情接口

```text
GET /api/admin/analytics/visitors/:visitorId?range=30d
```

返回：

- 访客首次和最近访问时间。
- 总 PV 与访问文章数。
- 按访问次数排序的文章列表，每篇包含最后访问时间。
- 最近 100 条有效访问时间线。

无效 UUID 返回 400。选定范围内没有该访客记录时返回 404。

## 管理页面

新增 `app/admin/analytics/page.tsx`。服务端页面先通过 Better Auth 校验管理员 session，未登录跳转 `/admin/login`。

现有 `/admin` 管理中心增加“访问分析”入口，并保留“评论审核”。

### 页面布局

页面从上到下分为：

1. 返回管理中心链接、标题和时间范围切换。
2. 四张概览卡片：UV、PV、被访问文章数、回访访客数。
3. UV/PV 日趋势图。
4. 热门文章 Top 10 横向柱状图。
5. 匿名访客监控表格。
6. 点击访客后打开的详情抽屉。

移动端将统计卡片改为双列或单列，表格改为卡片列表，图表容器保持响应式。详情使用抽屉而不是跳转新页面，以保留当前时间范围和分页状态。

### 图表技术选型

安装 Recharts，并加入 shadcn Chart 的本地组件：

- `ChartContainer`
- `ChartTooltip`
- `ChartTooltipContent`
- `ChartLegend`
- `ChartLegendContent`

shadcn Chart 底层直接使用 Recharts v3，不引入另一套绘图引擎。只加入图表需要的本地组件、Tailwind 样式和工具函数，不把现有 UI 全面迁移到 shadcn。

性能约束：

- 7 至 180 天范围最多绘制 180 个日数据点；全部时间仍按日返回，并关闭折线数据点标记以减少 SVG 元素。个人博客规模下暂不引入月度降采样。
- 热门文章只绘制 10 个柱形。
- 所有聚合在服务端完成，不把原始访问事件发送给图表。
- 关闭非必要进入动画。
- 图表作为客户端组件加载，管理页认证和页面外壳仍由服务端组件处理。

参考资料：

- Recharts 官方文档：https://recharts.github.io/
- shadcn Chart 官方文档：https://ui.shadcn.com/docs/components/base/chart

## 前端状态与错误处理

新增独立的 Analytics API 客户端和 Hook，遵循现有评论审核模块的分层方式。

时间范围变化时：

1. 取消旧请求。
2. 同时重新加载概览和访客第一页。
3. 关闭当前访客详情。
4. 显示局部加载状态，不清空整个管理页面外壳。

访客翻页只重新请求访客列表，不重复请求图表概览。

错误状态：

- 401：跳转管理员登录页。
- 概览失败：卡片和图表区域显示错误与重试按钮。
- 访客列表失败：列表区域显示错误与重试按钮，不隐藏已经成功加载的概览。
- 访客详情失败：抽屉内显示错误与重试按钮。
- 空数据：显示零值卡片和明确的空状态，不渲染空坐标轴。

## 隐私与安全

- 不存储 IP、User-Agent、设备信息、Referer 或浏览器指纹。
- `visitor_id` 是随机 UUID，不包含可读身份信息。
- 所有统计读取接口必须通过服务端管理员 session 验证。
- 普通访客只能写入当前文章的访问事件，不能查询任何统计结果。
- slug、范围、分页和 UUID 全部在服务端验证。
- SQL 继续通过参数化查询执行。
- 管理员自己的文章访问不计入数据。

## 测试范围

### 访问采集

- 合法文章首次访问写入记录。
- 同一访客、文章和 30 分钟窗口重复访问只保留一条。
- 时间窗口变化后允许再次记录。
- 不同文章或不同访客分别计数。
- 管理员访问返回 204 且不写入。
- 无效 slug 返回 400，不存在文章返回 404。
- 客户端上报失败不影响文章渲染。

### 范围与统计查询

- 7、30、90、180 天和全部时间范围解析。
- 上海时区的自然日边界。
- UV、PV、被访问文章数和回访访客计算。
- 趋势补齐零访问日期。
- 热门文章排序和 Top 10 限制。
- 已删除文章标题回退。
- 访客列表分页和最大 pageSize。
- 访客偏好并列时的稳定排序。
- 访客详情最近 100 条限制。

### API 与页面

- 所有管理 API 的未登录保护。
- 无效 range、page、pageSize 和 visitorId。
- Dashboard 正常数据、空数据、局部失败和加载状态。
- 时间范围变化会重置分页和关闭访客详情。
- 图表只验证输入数据、标签和可访问文本，不测试 Recharts 内部 SVG 实现。

## 上线与迁移

实现时新增编号迁移并通过现有 `npm run migrate` 执行。

上线顺序：

1. 部署数据库迁移，创建 `article_visits`。
2. 部署访问上报接口和文章 Tracker。
3. 部署管理统计 API 和页面。

表中没有历史数据时，管理页正常显示零值和空状态。功能不补录上线前的访问数据。

# xuexiswmz 的技术博客

一个使用 Next.js 构建的个人技术博客，主要记录 JavaScript、CSS、React 与前端工程实践。文章以 MDX 文件维护，站点同时提供评论、原文划词批注、知识图谱、访问分析和后台管理能力。

## 功能

- 使用 MDX 编写文章，支持 GFM、Front Matter 和 Shiki 代码高亮
- 提供分类文章导航；每篇文章至多属于一个分类，分类与文章顺序均可在后台手动调整
- 文章页在桌面端使用“分类文章 / 正文 / 本文目录”三栏布局，并显示环形阅读进度
- 按时间归档文章，并根据文章引用关系生成知识图谱
- 支持浅色与深色主题，以及中英文界面切换
- 支持文章评论、段落评论和划词批注
- 使用 DeepSeek 对评论进行 AI 审核
- 使用 GitHub OAuth 登录后台，并限制指定 GitHub 账号访问
- 记录文章访问与访客信息，提供访问趋势、热门文章和访客详情
- 自动生成站点 Metadata、`sitemap.xml` 与 `robots.txt`

## 技术栈

- [Next.js 16](https://nextjs.org/) 与 React 19
- TypeScript
- Tailwind CSS 4
- MDX、gray-matter、remark-gfm 与 Shiki
- PostgreSQL、`pg` 与 Neon Serverless
- Better Auth 与 GitHub OAuth
- Framer Motion、Anime.js、Recharts 与 react-force-graph-2d
- Vitest 与 ESLint

## 本地开发

### 1. 安装依赖

项目使用 pnpm，并提交了 `pnpm-lock.yaml`：

```bash
pnpm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```dotenv
# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-random-secret

# GitHub OAuth
AUTH_GITHUB_ID=your-github-oauth-client-id
AUTH_GITHUB_SECRET=your-github-oauth-client-secret
ADMIN_GITHUB_ID=your-github-user-id

# DeepSeek / OpenAI-compatible API
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 站点公开地址；开发环境未配置时默认为 http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

其中：

- `ADMIN_GITHUB_ID` 是允许进入管理后台的 GitHub 数字用户 ID。
- `BETTER_AUTH_URL` 应与当前站点地址一致。
- `NEXT_PUBLIC_SITE_URL` 用于 canonical URL、站点地图等 SEO 信息，生产环境必须配置。
- DeepSeek 配置用于后台评论审核接口。

还需要在 GitHub OAuth App 中将回调地址配置为：

```text
http://localhost:3000/api/auth/callback/github
```

生产环境请将域名替换为实际站点地址。

### 3. 初始化数据库

查看数据库脚本的执行顺序，无需连接数据库：

```bash
pnpm migrate -- --plan
```

执行尚未应用的数据库脚本：

```bash
pnpm migrate
```

迁移程序会依次处理：

1. `database/better-auth-schema.sql`
2. `database/schema.sql`
3. `database/migrations/*.sql`

执行记录和文件校验值保存在 `schema_migrations` 表中。已经执行过的 SQL 文件不能再修改；后续数据库变更应新增带序号的迁移文件。

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)。管理后台入口位于 `/admin`，文章分类管理位于 `/admin/categories`，知识图谱位于 `/graph`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 创建生产构建 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | 运行 ESLint |
| `pnpm test` | 运行全部测试 |
| `pnpm test:watch` | 以监听模式运行测试 |
| `pnpm migrate -- --plan` | 查看数据库脚本执行顺序 |
| `pnpm migrate` | 应用数据库迁移 |

## 编写文章

文章保存在 `content/posts` 目录，每篇文章对应一个 `.mdx` 文件，文件名会成为文章 URL 中的 slug：

```text
content/posts/javascript-data-types.mdx
                     ↓
/posts/javascript-data-types
```

文章至少应提供以下 Front Matter：

```mdx
---
title: JavaScript 数据类型
date: "2025-07-21"
description: "文章摘要"
tags:
  - javascript
  - 数据类型
---

# JavaScript 数据类型

正文内容……
```

可选的 `image` 和 `imageAlt` 字段可用于文章图片信息。首页和归档会按照 `date` 从新到旧排列文章。

## 文章分类与阅读页

部署分类功能前必须执行 `pnpm migrate`，确保 `005-article-categories.sql` 已应用。登录后台后，可从 `/admin/categories`：

- 新建、重命名或删除空分类；
- 使用上移、下移按钮手动调整分类顺序；
- 将文章分配给一个分类，或移回“未分类”；
- 使用上移、下移按钮手动调整同一分类内的文章顺序。

一篇文章只能属于零个或一个分类。“未分类”是系统生成的分组，不需要手动创建；没有保存分类或分类数据暂时不可用时，公开文章导航仍会以“全部文章”展示真实 MDX 文章。

文章页在宽度不小于 1280px 时显示三栏阅读布局：左侧按后台顺序展示分类和文章，中间显示正文，右侧根据正文中的二级、三级标题生成目录。当前文章在左侧只使用符合浅色/深色主题的黑、白、灰样式；当前目录项和环形阅读进度使用蓝色。目录会随阅读位置更新，进度按正文已阅读比例计算。

小于 1280px 时，左右栏会收纳为正文上方的“文章导航”和“本文目录”原生折叠面板。目录跳转遵循系统的“减少动态效果”偏好。

## 项目结构

```text
app/                  页面、Metadata 与 API Routes
components/           页面组件、评论系统和管理后台界面
content/posts/        MDX 文章
database/             初始数据库结构与增量迁移
lib/                  数据库、认证、文章、SEO、AI 和业务服务
plugins/              MDX remark 插件
public/               图片、图标与静态样式
scripts/              数据库迁移等项目脚本
```

## 构建与部署

部署前请确保生产数据库已经完成迁移，并配置上述环境变量：

```bash
pnpm migrate
pnpm build
pnpm start
```

项目可以部署到 Vercel 或其他支持 Next.js 和 Node.js 的平台。使用 Vercel 时，可通过 `VERCEL_PROJECT_PRODUCTION_URL` 或 `VERCEL_URL` 推导站点地址，但仍建议显式配置 `NEXT_PUBLIC_SITE_URL`。

## License

本项目未声明开源许可证。除非获得授权，请勿直接复制或分发文章内容。

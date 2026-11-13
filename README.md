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
- 使用邮箱密码登录后台，关闭公开注册；管理员账号通过初始化脚本创建
- 记录文章访问与访客信息，提供访问趋势、热门文章和访客详情
- 自动生成站点 Metadata、`sitemap.xml` 与 `robots.txt`

## 技术栈

- [Next.js 16](https://nextjs.org/) 与 React 19
- TypeScript
- Tailwind CSS 4
- MDX、gray-matter、remark-gfm 与 Shiki
- PostgreSQL 与 `pg`
- Better Auth 邮箱密码认证
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
DATABASE_URL=postgresql://user:password@localhost:5432/blog

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-random-secret

# 管理后台登录（邮箱密码）
# 管理员账号用 pnpm admin:create 初始化，不开放注册

# 管理中心文章提交：直接调用 GitHub Contents API
GITHUB_CONTENT_TOKEN=github_pat_xxx
GITHUB_CONTENT_OWNER=your_github_username
GITHUB_CONTENT_REPO=blog
GITHUB_CONTENT_BRANCH=main

# DeepSeek / OpenAI-compatible API
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash

# 站点公开地址；开发环境未配置时默认为 http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

其中：

- `BETTER_AUTH_URL` 应与当前站点地址一致；`BETTER_AUTH_SECRET` 用于会话签名。
- `NEXT_PUBLIC_SITE_URL` 用于 canonical URL、站点地图等 SEO 信息，生产环境必须配置。
- DeepSeek 配置用于后台评论审核接口。
- `GITHUB_CONTENT_TOKEN` 使用 fine-grained PAT，只授权 `xuexiswmz/blog` 的 **Contents: Read and write**。
- 本地放在 `.env.local`，生产放在服务器上的 `blog.env`，都不要提交到仓库。
- `GITHUB_CONTENT_OWNER`、`GITHUB_CONTENT_REPO` 决定目标仓库，默认 `xuexiswmz/blog`。
- `GITHUB_CONTENT_BRANCH` 默认 `main`。

### 本地数据库

当前开发环境使用项目内 `.local/postgres-data` 的 PostgreSQL 16 集群（端口 5433，用户和数据库均为 `blog`），`.local/` 不会提交到 git。

启动和停止：

```bash
pnpm db:start
pnpm db:stop
```

首次初始化（当前开发机已经完成）：

```bash
/opt/homebrew/opt/postgresql@16/bin/initdb -D .local/postgres-data -U blog --auth=trust --encoding=UTF8 --no-locale
/opt/homebrew/opt/postgresql@16/bin/createdb -h 127.0.0.1 -p 5433 -U blog blog
```

`.env.local` 对应：

```dotenv
DATABASE_URL="postgresql://blog@127.0.0.1:5433/blog"
```

也可以使用任意本地 PostgreSQL，只要 `DATABASE_URL` 指向它。

初始化管理员账号：

```bash
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='至少8位密码' \
ADMIN_NAME='管理员' \
pnpm admin:create
```

`pnpm admin:create` 只创建账号，不会开启公开注册；博客不提供注册页面，公开的邮箱密码注册接口也是关闭的。

如果该邮箱已存在（例如以前用 GitHub 登录创建过用户），脚本会为现有用户补一个 credential 密码账号；重复执行可以重置密码。

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

访问 [http://localhost:3000](http://localhost:3000)。管理后台入口位于 `/admin`（默认进入 `/admin/analytics`），文章管理位于 `/admin/articles`，新建文章位于 `/admin/articles/new`，知识图谱位于 `/graph`。

本地如果直连 GitHub 不稳定，可以配置 `HTTP_PROXY`、`HTTPS_PROXY` 和 `NO_PROXY`；`pnpm dev` 与 `pnpm start` 已设置 `NODE_USE_ENV_PROXY=1`（Node.js 24+），Node 内置的 `fetch` 会读取这些代理变量。

生产环境走 Cloudflare Worker Relay 后，阿里云 ECS 不需要配置 GitHub 代理，也不需要 `GITHUB_CONTENT_TOKEN`。

## 常用命令

| 命令                     | 说明                   |
| ------------------------ | ---------------------- |
| `pnpm dev`               | 启动开发服务器         |
| `pnpm build`             | 创建生产构建           |
| `pnpm start`             | 启动生产服务器         |
| `pnpm lint`              | 运行 ESLint            |
| `pnpm test`              | 运行全部测试           |
| `pnpm test:watch`        | 以监听模式运行测试     |
| `pnpm migrate -- --plan` | 查看数据库脚本执行顺序 |
| `pnpm migrate`           | 应用数据库迁移         |
| `pnpm admin:create`      | 创建管理员邮箱密码账号 |

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

### 通过管理中心上传文章

登录后台后打开 `/admin/articles` 查看文章列表，点击“新建文章”进入 `/admin/articles/new`：

- 左侧填写标题、简介和 MDX 正文，支持工具栏和“编辑 / 预览”切换，也可以上传 `.mdx` 文件（文件里的 frontmatter 会被移除，字段以表单为准）；标题下的“简介”用于首页卡片、归档和 SEO 描述，不是正文；
- 右侧“文章属性”填写发布日期、slug 和标签；
- “关联文章”支持搜索并多选已有文章；
- 右侧“分类”可以先选择文章分类，点击“管理分类”会打开 CRUD 弹窗，支持新增、重命名、删除和搜索分类；文章列表右上角也有“分类管理”入口；新文章需要部署后进入编辑页设置分类；
- 文章列表点击标题或右侧箭头进入编辑页；保存修改同样提交到 GitHub，slug 创建后不可修改，`source`、`image`、`imageAlt` 等原有 frontmatter 会保留；
- 文章列表可以删除文章：二次确认后，服务端通过 GitHub Contents API 提交删除对应的 MDX；
- 提交后，服务端通过 GitHub Contents API 创建 `content/posts/<slug>.mdx`，并在 frontmatter 中写入：

```yaml
related:
  - css-box-model
  - react-useeffect-setstate
```

`/graph` 会同时读取正文中的 `](/posts/slug)` 链接和 `related` 字段，因此新文章会与选中文章建立连线。

注意：

- 提交成功后需要重新构建/部署，新文章才会出现在站点和图谱中；本地开发可以先 `git pull`，再重启 dev server，让新文章路由生效。
- 需要配置 `GITHUB_CONTENT_TOKEN`（fine-grained PAT，`Contents: Read and write`）；未配置时上传接口会返回配置错误。
- 如果 GitHub 仓库里已经存在同 slug 的文件，接口会返回 409，避免覆盖已有文章。
- 删除文章只删除 MDX 文件；其他文章正文里的链接和 `related` 不会自动清理，评论、访问记录、画线数据会保留；分类关联会在分类服务读取时自动清理。

## 文章分类与阅读页

部署分类功能前必须执行 `pnpm migrate`，确保 `005-article-categories.sql` 已应用。登录后台后，可在任意文章的编辑页点击“分类”旁的“管理分类”：

- 在弹窗中新建、重命名或删除空分类；
- 在弹窗中使用上移、下移按钮手动调整分类顺序；
- 在编辑页右侧“分类”选择框将文章分配给一个分类，或移回“未分类”；
- 分类内的文章顺序仍由现有分类服务维护。

一篇文章只能属于零个或一个分类。“未分类”是系统生成的分组，不需要手动创建；迁移成功但尚未创建分类时，所有文章会显示在“未分类”中。只有分类存储暂时不可用时，公开文章导航才会回退为“全部文章”，确保真实 MDX 文章仍可访问。

文章页在宽度不小于 1280px 时显示三栏阅读布局：左侧按后台顺序展示分类和文章，中间显示正文，右侧根据正文中的二级、三级标题生成目录。当前文章在左侧只使用符合浅色/深色主题的黑、白、灰样式；当前目录项和环形阅读进度使用蓝色。目录会随阅读位置更新，进度按正文已阅读比例计算。

小于 1280px 时，左右栏会收纳为正文上方的“文章导航”和“本文目录”原生折叠面板。目录跳转遵循系统的“减少动态效果”偏好。

## 部署到阿里云

```text
GitHub Actions → 构建镜像 → 推送阿里云 ACR → 阿里云 ECS 拉取运行
管理中心文章提交 → GitHub Contents API（ECS 直连）
```

- 构建全部在 GitHub Actions 的 runner 上完成，2C2G 的 ECS 只负责拉镜像和跑容器；
- 文章提交直接调用 GitHub Contents API，token 存在服务器上的 `blog.env`；
- 后台登录使用邮箱密码，不依赖 GitHub OAuth。

详见 [`docs/ops/docker-migration.md`](docs/ops/docker-migration.md)。

### GitHub Actions 配置

在 GitHub 仓库 Secrets 中配置：

```text
ALIYUN_ACR_REGISTRY       例如 registry.cn-hangzhou.aliyuncs.com
ALIYUN_ACR_NAMESPACE      ACR 命名空间
ALIYUN_ACR_USERNAME       ACR 用户名
ALIYUN_ACR_PASSWORD       ACR 密码
```

在 GitHub 仓库 Variables 中配置：

```text
NEXT_PUBLIC_SITE_URL      例如 https://blog.example.com
ENABLE_ECS_DEPLOY         设为 true 时启用 SSH 自动部署
```

如果要启用自动部署，再配置这些 Secrets：

```text
ECS_HOST
ECS_USERNAME
ECS_SSH_KEY
ECS_DEPLOY_PATH           例如 /opt/blog
```

`docker compose` 部署目录需要：

- `docker-compose.yml`
- `.env.production`（仓库里有 `.env.production.example` 模板）
- `.env`（仓库里有 `.env.deploy.example` 模板，至少包含 `ALIYUN_ACR_REGISTRY`、`ALIYUN_ACR_NAMESPACE`、`IMAGE_TAG`）

```bash
cp .env.production.example .env.production
cp .env.deploy.example .env
# 然后填入真实值
```

ECS 的 `.env.production` 至少包含：

```dotenv
DATABASE_URL=postgresql://...
BETTER_AUTH_URL=https://blog.example.com
BETTER_AUTH_SECRET=...
NEXT_PUBLIC_SITE_URL=https://blog.example.com
GITHUB_CONTENT_TOKEN=github_pat_xxx
GITHUB_CONTENT_OWNER=your-github-username
GITHUB_CONTENT_REPO=blog
GITHUB_CONTENT_BRANCH=main
# DeepSeek 等其它生产配置
```

初始化管理员：

```bash
docker exec -it \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD='至少8位密码' \
  -e ADMIN_NAME='管理员' \
  blog pnpm admin:create
```

文章提交后，GitHub Actions 会重新构建镜像；ECS 需要配置自动部署，或手动执行 `docker compose pull && docker compose up -d` 来更新内容。

## 项目结构

```text
app/                  页面、Metadata 与 API Routes
components/           页面组件、评论系统和管理后台界面
content/posts/        MDX 文章
database/             初始数据库结构与增量迁移
lib/                  数据库、认证、文章、SEO、AI 和业务服务
plugins/              MDX remark 插件
public/               图片、图标与静态样式
scripts/              数据库迁移、管理员初始化等脚本
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

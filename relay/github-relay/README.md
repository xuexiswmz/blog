# Blog GitHub Relay

A narrow Cloudflare Worker that lets the mainland Aliyun application read, create/update and delete article MDX files in GitHub without exposing the GitHub token to the ECS.

## Allowed operations

- `GET /file?path=content/posts/<slug>.mdx&branch=main` → `{ sha }` or 404
- `PUT /file` with `{ path, content, message, sha?, branch }` → `{ commitUrl, fileUrl, sha }`
- `DELETE /file` with `{ path, message, sha, branch }` → `{ commitUrl }`

All requests require:

```http
Authorization: Bearer <RELAY_SECRET>
```

Only paths under `content/posts/*.mdx` and the configured branch are allowed.

## Deploy

1. Create a fine-grained GitHub PAT for `xuexiswmz/blog` with **Contents: Read and write**.
2. Install Wrangler and log in:

```bash
cd relay/github-relay
pnpm install
pnpm exec wrangler login
```

3. Set secrets:

```bash
pnpm exec wrangler secret put GITHUB_TOKEN
pnpm exec wrangler secret put RELAY_SECRET
```

4. Deploy:

```bash
pnpm run deploy
```

5. Configure the Next.js app:

```dotenv
GITHUB_CONTENT_RELAY_URL=https://blog-github-relay.<your-subdomain>.workers.dev
GITHUB_CONTENT_RELAY_SECRET=<same value as RELAY_SECRET>
GITHUB_CONTENT_BRANCH=main
```

`GITHUB_CONTENT_TOKEN` is not needed on the ECS when relay mode is enabled.

## Local development

```bash
pnpm run dev
```

Use `http://127.0.0.1:8787` as `GITHUB_CONTENT_RELAY_URL` locally.

Keep the relay URL private if possible; the secret is the only authentication layer. The worker never proxies arbitrary URLs, methods, repositories or git paths.


## 浏览器打开 401 是正常的

Worker 只有 `/file` 一个接口，并且所有请求都要求：

```http
Authorization: Bearer <RELAY_SECRET>
```

直接打开 `http://localhost:8787/` 或 `/favicon.ico` 没带这个头，所以会返回 401；这不是 Worker 挂了。

测试本地接口：

```bash
curl -H "Authorization: Bearer $RELAY_SECRET" \
  "http://localhost:8787/file?path=content/posts/example.mdx&branch=main"
```

## 本地 wrangler dev 的 GitHub 出站限制

本地 `wrangler dev` 使用 workerd，可能不会读取 `.env.local` 里的 `HTTP_PROXY`/`HTTPS_PROXY`。如果本机必须通过代理访问 GitHub，本地 Worker 调 GitHub 可能返回 403/502，即使 token 本身有效。

本地开发推荐不要走 Worker，直接在 Next.js 的 `.env.local` 配：

```dotenv
GITHUB_CONTENT_TOKEN=github_pat_xxx
GITHUB_CONTENT_RELAY_URL=
GITHUB_CONTENT_RELAY_SECRET=
```

生产 Cloudflare Worker 有直接访问 GitHub 的出站网络，不需要本地代理。

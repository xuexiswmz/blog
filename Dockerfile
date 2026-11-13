FROM node:24-alpine AS deps
WORKDIR /app
# 国内构建时传 https://registry.npmmirror.com 会快很多。
ARG NPM_REGISTRY=https://registry.npmjs.org
# 固定 pnpm 版本：不声明 packageManager 时 corepack 会漂移，和本地的 11.9.0 不一致。
RUN npm i -g pnpm@11.9.0 --registry=$NPM_REGISTRY
# pnpm-workspace.yaml 里放着 allowBuilds（esbuild/sharp/unrs-resolver 的构建白名单），
# 少了它 pnpm 会报 ERR_PNPM_IGNORED_BUILDS 直接失败。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --registry=$NPM_REGISTRY

FROM node:24-alpine AS builder
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
# 2C2G 机器上构建必须限制 V8 堆，否则 next build 会被 OOM kill。
# 默认留空 = 用 Node 自己的默认值（CI 上内存充足，不需要限制）。
ARG NODE_OPTIONS=
ENV NODE_OPTIONS=$NODE_OPTIONS
# 和 deps 阶段保持一致；否则 corepack 会去下载最新版 pnpm，版本漂移还慢。
RUN npm i -g pnpm@11.9.0 --registry=$NPM_REGISTRY
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 这些只在构建阶段使用；运行时由 ECS 的 env_file 覆盖。
# 注意：builder 阶段的 ENV 不会带到 runner 阶段（两个独立 stage），所以占位值不会被带进生产。
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV BETTER_AUTH_URL=http://localhost:3000
ENV BETTER_AUTH_SECRET=build-only-secret
# lib/ai/deepseek.ts 在模块加载时就会 requireEnv，缺一个都会让 next build 失败。
ENV DEEPSEEK_API_KEY=build-only
ENV DEEPSEEK_BASE_URL=https://api.deepseek.com
ENV DEEPSEEK_MODEL=deepseek-chat
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# 用 webpack 而不是 Turbopack：Turbopack 的 Rust 编译器内存不受 NODE_OPTIONS 约束，
# 在 2C2G 机器上会被 OOM kill。内存充足的环境想换回 Turbopack，把 --webpack 去掉即可。
# .next/cache 只是 webpack 的增量构建缓存，运行时用不到，同一层里删掉才真正减小镜像。
RUN pnpm exec next build --webpack && rm -rf .next/cache

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG NPM_REGISTRY=https://registry.npmjs.org
# 固定 pnpm：corepack 会在容器启动时下载最新版，既慢又可能触发构建脚本白名单校验。
RUN npm i -g pnpm@11.9.0 --registry=$NPM_REGISTRY

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
# pnpm 执行脚本前会做依赖校验，缺了它会把 esbuild/sharp 的构建脚本当成"被忽略"而报错。
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
# 只装运行时依赖：next build 需要的 devDependencies 不必进镜像，能省约 500MB。
# pnpm 的全局 store 里还留着这些包的一份副本（node_modules 是硬链），同一层里删掉才不会占空间。
RUN pnpm install --prod --frozen-lockfile --registry=$NPM_REGISTRY \
 && rm -rf "$(pnpm store path)"
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/content ./content
COPY --from=builder /app/scripts ./scripts
# scripts/migrate.mjs 要读 database/schema.sql 和 database/migrations/*.sql
COPY --from=builder /app/database ./database
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["pnpm", "start"]

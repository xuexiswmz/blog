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
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV BETTER_AUTH_URL=http://localhost:3000
ENV BETTER_AUTH_SECRET=build-only-secret
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# 用 webpack 而不是 Turbopack：Turbopack 的 Rust 编译器内存不受 NODE_OPTIONS 约束，
# 在 2C2G 机器上会被 OOM kill。内存充足的环境想换回 Turbopack，把 --webpack 去掉即可。
RUN pnpm exec next build --webpack

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/content ./content
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["pnpm", "start"]

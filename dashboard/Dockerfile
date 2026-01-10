# dashboard/Dockerfile

FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# 非 root ユーザーで実行
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 astro
USER astro

COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=astro:nodejs /app/package.json ./

# マイグレーション実行スクリプト
COPY --from=builder --chown=astro:nodejs /app/scripts/migrate.sh ./scripts/

# データディレクトリ
RUN mkdir -p /app/data && chown astro:nodejs /app/data
VOLUME /app/data

EXPOSE 4321

# 起動時にマイグレーションを実行
CMD ["sh", "-c", "./scripts/migrate.sh && node dist/server/entry.mjs"]

FROM --platform=$BUILDPLATFORM node:24-alpine3.23 AS builder

WORKDIR /app

# workspace の設定ファイルをコピー
COPY ["package.json", "package-lock.json", "./"]

# packages/shared をコピーしてビルド
COPY ["./packages", "./packages"]
RUN npm install --package-lock-only && \
    npm ci --workspace=@twitterrx/shared && \
    npm run build --workspace=@twitterrx/shared

# Bot のソースとビルド設定をコピー
COPY ["tsconfig.json", "./"]
COPY ["./src", "./src"]
RUN npm ci && \
    npm run compile

# 設定ファイルをコピー
COPY ["./.config", "./.config"]

FROM node:24-alpine3.23 AS runner

WORKDIR /app
ENV NODE_ENV=production

# workspace の設定ファイルをコピー
COPY ["package.json", "package-lock.json", "./"]

# packages/shared のビルド成果物をコピー
COPY --from=builder /app/packages ./packages

# production 依存関係のみインストール
RUN npm ci --omit=dev --ignore-scripts

# Bot のビルド成果物をコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.config ./.config

CMD ["npm", "run", "start:docker"]

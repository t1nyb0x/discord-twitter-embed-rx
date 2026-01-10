# TwitterRX Dashboard

Discord Bot の設定を管理するための Web ダッシュボード

## セットアップ

### 1. 依存関係のインストール

```bash
cd dashboard
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成します:

```bash
cp .env.example .env
```

必要な環境変数を設定:

- `DISCORD_OAUTH2_CLIENT_ID`: Discord Developer Portal で取得
- `DISCORD_OAUTH2_CLIENT_SECRET`: Discord Developer Portal で取得
- `DISCORD_OAUTH2_REDIRECT_URI`: `https://yourdomain.com/api/auth/discord/callback`
- `SESSION_SECRET`: `openssl rand -base64 32` で生成
- `ENCRYPTION_SALT`: `openssl rand -base64 32` で生成

### 3. データベースマイグレーション

```bash
npm run db:generate
npm run db:migrate
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:4321 でアクセスできます。

## Docker での実行

```bash
docker build -t twitterrx-dashboard .
docker run -p 4321:4321 \
  -v dashboard_data:/app/data \
  --env-file .env \
  twitterrx-dashboard
```

## 機能

- ✅ Discord OAuth2 認証
- ✅ CSRF 保護
- ✅ レート制限（Lua スクリプトで原子化）
- ✅ トークン暗号化（AES-256-GCM）
- ✅ セッション管理（Redis + lucia-auth）
- ✅ SQLite データベース（Drizzle ORM）
- ✅ Redis 再シード処理

## 次のステップ

Phase 2: Bot 側統合
- `IChannelConfigRepository` インターフェース
- `RedisChannelConfigRepository` 実装
- LRU キャッシュ + pub/sub

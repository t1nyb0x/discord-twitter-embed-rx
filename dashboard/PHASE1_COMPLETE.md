# Phase 1 実装完了レポート

## 実装日時
2026-01-10

## 完了タスク

### ✅ 1. Dashboard ディレクトリ構成作成

以下のディレクトリ構造を作成しました:

```
dashboard/
├── src/
│   ├── pages/           # ページ定義（SSR/SSG）
│   │   ├── index.astro
│   │   ├── dashboard/
│   │   │   └── index.astro
│   │   └── api/
│   │       ├── auth/discord/
│   │       │   ├── login.ts
│   │       │   └── callback.ts
│   │       └── auth/
│   │           └── logout.ts
│   ├── components/      # UI コンポーネント
│   ├── layouts/         # 共通レイアウト
│   │   └── Layout.astro
│   ├── lib/             # ライブラリ
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   └── index.ts
│   │   ├── auth.ts
│   │   ├── redis.ts
│   │   ├── crypto.ts
│   │   ├── csrf.ts
│   │   ├── rate-limit.ts
│   │   ├── discord.ts
│   │   ├── api-helpers.ts
│   │   └── reseed.ts
│   ├── middleware.ts
│   ├── env.d.ts
│   └── startup.ts
├── scripts/
│   └── migrate.sh
├── data/
├── package.json
├── tsconfig.json
├── astro.config.mjs
├── drizzle.config.ts
├── Dockerfile
├── .env.example
├── .gitignore
└── README.md
```

### ✅ 2. Astro + Preact 環境構築

- **package.json**: Astro 4.16.14, Preact 10.24.3, lucia-auth 3.2.2
- **tsconfig.json**: Astro strict モード + JSX 設定
- **astro.config.mjs**: SSR モード + Node adapter

### ✅ 3. SQLite + Drizzle ORM セットアップ

#### スキーマ定義 (`src/lib/db/schema.ts`):

- `user`: ユーザー情報（discord_id, username, avatar）
- `session`: セッション（lucia-auth 管理）
- `guild_config`: ギルド設定（allow_all_channels, version）
- `channel_whitelist`: チャンネルホワイトリスト
- `config_audit_log`: 監査ログ

#### Drizzle 設定:
- SQLite dialect
- マイグレーション自動生成対応

### ✅ 4. Discord OAuth2 認証実装（lucia-auth）

#### 認証フロー:

1. **ログイン** (`/api/auth/discord/login`):
   - レート制限チェック（30回/分）
   - state トークン生成 + Redis 保存（5分 TTL）
   - Discord OAuth2 URL にリダイレクト

2. **コールバック** (`/api/auth/discord/callback`):
   - state 検証
   - アクセストークン取得
   - ユーザー情報取得 + DB 保存/更新
   - セッション作成（lucia-auth）
   - トークン暗号化 + Redis 保存
   - ギルド一覧キャッシュ（1時間 TTL）
   - CSRF トークン生成

3. **ログアウト** (`/api/auth/logout`):
   - セッション無効化
   - Redis データ削除
   - Cookie クリア

#### 実装ファイル:
- `src/lib/auth.ts`: lucia-auth 設定（Redis adapter）
- `src/lib/discord.ts`: Discord API ラッパー
- `src/middleware.ts`: セッション検証ミドルウェア

### ✅ 5. CSRF トークン + Cookie 属性設定

#### CSRF 実装 (`src/lib/csrf.ts`):

- トークン生成: 32バイト（64文字 hex）
- Redis 保存: セッションと同じ TTL（7日間）
- **P0対応**: 長さチェック・hex 形式バリデーション
- **P0対応**: timingSafeEqual の前に事前検証

#### Cookie 属性:

```typescript
{
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
}
```

### ✅ 6. P0対応: ENCRYPTION_SALT 必須化 + レート制限

#### ENCRYPTION_SALT 必須化 (`src/lib/crypto.ts`):

- 環境変数未設定時は起動失敗
- 16文字未満は起動失敗
- エラーメッセージで生成方法を明示:
  ```bash
  openssl rand -base64 32
  ```

#### トークン暗号化:
- アルゴリズム: AES-256-GCM
- IV: 12 bytes（NIST 推奨）
- 鍵派生: scrypt（SESSION_SECRET + ENCRYPTION_SALT）

#### レート制限 Lua 原子化 (`src/lib/rate-limit.ts`):

- ZREMRANGEBYSCORE → ZCARD → ZADD を原子的に実行
- resetAt 計算統一（最古エントリ + window）
- Redis エラー時は許可（可用性優先）

### ✅ 7. Redis 再シード処理実装

#### 再シード処理 (`src/lib/reseed.ts`):

- Dashboard 起動時に自動実行
- SQLite → Redis 再シード
- config キー数が 0 の場合のみ実行
- whitelist も含めて復元

#### 起動処理 (`src/startup.ts`):
- 開発モード時に自動実行
- 本番環境では Docker CMD で実行

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/auth/discord/login` | GET | Discord OAuth2 ログイン |
| `/api/auth/discord/callback` | GET | OAuth2 コールバック |
| `/api/auth/logout` | POST | ログアウト |

## ページ

| パス | 説明 |
|------|------|
| `/` | ランディングページ（未ログイン時） |
| `/dashboard` | ダッシュボード（ログイン必須） |

## セキュリティ対策

- ✅ CSRF 対策（Redis + timing-safe 検証）
- ✅ レート制限（Lua スクリプトで原子化）
- ✅ トークン暗号化（AES-256-GCM）
- ✅ ENCRYPTION_SALT 必須化
- ✅ Cookie 属性（HttpOnly, Secure, SameSite=Lax）
- ✅ セッション管理（Redis + lucia-auth）

## 環境変数

必須:
- `DISCORD_OAUTH2_CLIENT_ID`
- `DISCORD_OAUTH2_CLIENT_SECRET`
- `DISCORD_OAUTH2_REDIRECT_URI`
- `SESSION_SECRET` (32文字以上)
- `ENCRYPTION_SALT` (16文字以上)

オプション:
- `DATABASE_URL` (デフォルト: `file:./data/dashboard.db`)
- `REDIS_URL` (デフォルト: `redis://localhost:6379`)
- `ORPHAN_CONFIG_RETENTION_DAYS` (デフォルト: `30`)

## 次のステップ (Phase 2)

- [ ] Bot 側の `IChannelConfigRepository` 実装
- [ ] `RedisChannelConfigRepository` 実装
  - [ ] LRU キャッシュ（上限 1000）
  - [ ] pub/sub 購読
  - [ ] 劣化モード対応
- [ ] `ChannelConfigService` 実装
- [ ] `MessageHandler` への統合
- [ ] ギルドイベントハンドリング

## 注意事項

- lucia-auth v3.2.2 は deprecated ですが、仕様書通りに実装しました
- 依存関係のインストール後、Drizzle のマイグレーション生成が必要です:
  ```bash
  npm run db:generate
  ```

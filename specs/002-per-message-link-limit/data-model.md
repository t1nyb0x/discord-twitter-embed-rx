# データモデル: 1メッセージあたりの投稿リンク処理数上限

## 変更対象エンティティ

### 1. `GuildConfig`（shared パッケージ）

**ファイル**: `packages/shared/src/config.ts`

```typescript
export interface GuildConfig {
  guildId: string;
  allowAllChannels: boolean;
  whitelistedChannelIds: string[];
  version: number;
  updatedAt: string;
  updatedBy?: string;
  maxUrlsPerMessage?: number; // [NEW] 1メッセージあたりの最大処理URL数（1〜5、null = デフォルト3）
}
```

**バリデーションルール**:

- `maxUrlsPerMessage` は `1` 以上 `5` 以下の整数、または `undefined` / `null`
- `undefined` / `null` / `0` / 負数 / 非整数 → Bot 側でデフォルト値 3 にフォールバック

---

### 2. `guildConfigs` テーブル（SQLite、Dashboard 側）

**ファイル**: `dashboard/src/lib/db/schema.ts`

```typescript
export const guildConfigs = sqliteTable("guild_config", {
  guildId: text("guild_id").primaryKey(),
  allowAllChannels: integer("allow_all_channels", { mode: "boolean" })
    .notNull()
    .default(true),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
  maxUrlsPerMessage: integer("max_urls_per_message"), // [NEW] NULL = 未設定
});
```

**Drizzle マイグレーション** (`dashboard/drizzle/0002_add_max_urls_per_message.sql`):

```sql
ALTER TABLE guild_config ADD COLUMN max_urls_per_message INTEGER;
```

---

### 3. Redis キャッシュ（`app:guild:{id}:config`）

**変更**: JSON.stringify された `GuildConfig` に `maxUrlsPerMessage` フィールドが追加される

**変更前**:

```json
{
  "guildId": "123456789",
  "allowAllChannels": false,
  "whitelistedChannelIds": ["111", "222"],
  "version": 3,
  "updatedAt": "2026-05-03T00:00:00.000Z"
}
```

**変更後**:

```json
{
  "guildId": "123456789",
  "allowAllChannels": false,
  "whitelistedChannelIds": ["111", "222"],
  "version": 3,
  "updatedAt": "2026-05-03T00:00:00.000Z",
  "maxUrlsPerMessage": 3
}
```

**伝播**: Dashboard の `PUT /api/guilds/{guildId}/config` が `newConfig` を `JSON.stringify` して Redis に書き込む既存処理でそのまま伝播。追加の Redis キーや Pub/Sub メッセージは不要。

---

### 4. 新規定数（shared パッケージ）

**ファイル**: `packages/shared/src/constants.ts`

```typescript
/** 1メッセージあたりのURL処理数: デフォルト値 */
export const DEFAULT_MAX_URLS_PER_MESSAGE = 3;

/** 1メッセージあたりのURL処理数: ダッシュボード設定の最大値 */
export const MAX_URLS_PER_MESSAGE_LIMIT = 5;
```

---

## 状態遷移

```text
ダッシュボードで maxUrlsPerMessage を保存
  → SQLite guild_config.max_urls_per_message 更新
  → Redis app:guild:{id}:config を JSON.stringify で上書き
  → Redis config:update チャンネルに Pub/Sub メッセージ発行
  → RedisChannelConfigRepository がキャッシュを無効化
  → 次の getConfig() 呼び出し時に新しい上限値を返す
  → ChannelConfigService.getMaxUrlsPerMessage() が新しい値を返す
  → MessageHandler.processUrls() が新しい上限を適用
```

---

## スキーマバージョン管理

| 定数                     | 変更前 | 変更後 | ファイル                      |
| ------------------------ | ------ | ------ | ----------------------------- |
| `CURRENT_SCHEMA_VERSION` | `1`    | `2`    | `dashboard/src/lib/reseed.ts` |

バージョン更新により Dashboard 再起動時に SQLite → Redis の全件再シードが実行され、
既存ギルドの `maxUrlsPerMessage`（NULL の場合は undefined として伝播）が Redis に反映される。

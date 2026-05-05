# クイックスタート: 1メッセージあたりの投稿リンク処理数上限

**実装順序**: ① Dashboard → ② TwitterRX（Dashboard マージ後）

---

## ① Dashboard リポジトリ（先行 PR）

### Step 1: 共有型に `maxUrlsPerMessage` を追加

**`packages/shared/src/config.ts`**:

```typescript
export interface GuildConfig {
  // ... 既存フィールド ...
  maxUrlsPerMessage?: number; // 追加
}
```

**`packages/shared/src/constants.ts`**:

```typescript
export const DEFAULT_MAX_URLS_PER_MESSAGE = 3;
export const MAX_URLS_PER_MESSAGE_LIMIT = 5;
```

### Step 2: SQLite スキーマにカラム追加

**`dashboard/src/lib/db/schema.ts`** の `guildConfigs` テーブルに追加:

```typescript
maxUrlsPerMessage: integer("max_urls_per_message"),
```

### Step 3: Drizzle マイグレーション生成

```bash
cd dashboard && npm run db:generate
# → drizzle/0002_add_max_urls_per_message.sql が生成される
```

### Step 4: API エンドポイント更新

**`dashboard/src/pages/api/guilds/[guildId]/config.ts`**:

**GET レスポンス**に追加（既存レスポンスオブジェクト内）:

```typescript
maxUrlsPerMessage: config.maxUrlsPerMessage ?? null,
```

**PUT バリデーション**（`whitelistedChannelIds` バリデーションの直後）:

```typescript
const { allowAllChannels, whitelistedChannelIds, maxUrlsPerMessage } = body;
if (maxUrlsPerMessage !== null && maxUrlsPerMessage !== undefined) {
  if (
    typeof maxUrlsPerMessage !== "number" ||
    !Number.isInteger(maxUrlsPerMessage) ||
    maxUrlsPerMessage < 1 ||
    maxUrlsPerMessage > MAX_URLS_PER_MESSAGE_LIMIT
  ) {
    return createApiError(
      "INVALID_MAX_URLS",
      "maxUrlsPerMessage は 1〜5 の整数である必要があります",
      400,
    );
  }
}
```

**PUT の SQLite UPDATE `.set()`**:

```typescript
maxUrlsPerMessage: maxUrlsPerMessage ?? null,
```

**PUT の `newConfig` オブジェクト**:

```typescript
maxUrlsPerMessage: maxUrlsPerMessage ?? undefined,
```

### Step 5: ダッシュボード UI に入力欄追加

**`dashboard/src/pages/dashboard/guilds/[guildId].astro`** の既存 `config-section` ブロックの後に追加:

```html
<div class="config-section">
  <div class="section-header">
    <h2>1メッセージあたりの処理URL上限</h2>
  </div>
  <div class="url-limit-input-group">
    <input
      type="number"
      id="max-urls-per-message"
      min="1"
      max="5"
      value="3"
      class="number-input"
    />
    <span class="input-unit">件（1〜5）</span>
  </div>
  <p class="section-note">
    1つのメッセージに含まれるTwitter/X
    URLのうち、最大何件まで処理するかを設定します。
    上限を超えたURLは無視され、その旨がメッセージで通知されます。
  </p>
</div>
```

クライアントサイド JS:

- `loadConfig()` で `maxUrlsPerMessage` を `<input>` の `value` に設定（null の場合 `3`）
- `saveConfig()` で `maxUrlsPerMessage: parseInt(input.value, 10)` をリクエストボディに追加

### Step 6: reseed スキーマバージョンを更新

**`dashboard/src/lib/reseed.ts`**:

```typescript
const CURRENT_SCHEMA_VERSION = 2; // 1 → 2
```

---

## ② TwitterRX リポジトリ（Dashboard マージ後）

### Step 7: サブモジュール参照を更新

```bash
cd dashboard && git fetch && git checkout main && git pull
cd .. && git add dashboard && git commit -m "chore: update dashboard submodule to HEAD"
```

### Step 8: `ChannelConfigService` に `getMaxUrlsPerMessage()` を追加

**`src/core/services/ChannelConfigService.ts`**:

```typescript
import { DEFAULT_MAX_URLS_PER_MESSAGE } from "@twitterrx/shared";

async getMaxUrlsPerMessage(guildId: string): Promise<number> {
  const result = await this.repository.getConfig(guildId);
  if (result.kind !== "found") return DEFAULT_MAX_URLS_PER_MESSAGE;

  const raw = result.data.maxUrlsPerMessage;
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw < 1 ||
    raw > MAX_URLS_PER_MESSAGE_LIMIT
  ) {
    return DEFAULT_MAX_URLS_PER_MESSAGE;
  }
  return raw;
}
```

### Step 9: `MessageHandler` に上限適用と通知を追加

**`src/adapters/discord/MessageHandler.ts`**:

`processUrls` の先頭ガード直後に追加:

```typescript
private async processUrls(client, message, urls, isSpoiler): Promise<void> {
  if (urls.length === 0) return;

  const limit = await this.getUrlLimit(message.guildId);
  const accepted = urls.slice(0, limit);
  const ignoredCount = urls.length - accepted.length;

  logger.debug("URL limit applied", { limit, accepted: accepted.length, ignoredCount, isSpoiler });

  for (const url of accepted) {
    // ... 既存の処理 ...
  }

  if (ignoredCount > 0) {
    await this.sendIgnoredNotice(message, ignoredCount, urls.length);
  }
}
```

新規プライベートメソッド2つを追加:

```typescript
private async getUrlLimit(guildId: string | null): Promise<number> {
  if (!guildId || !this.channelConfigService) return DEFAULT_MAX_URLS_PER_MESSAGE;
  return this.channelConfigService.getMaxUrlsPerMessage(guildId);
}

private async sendIgnoredNotice(
  message: Message,
  ignoredCount: number,
  totalCount: number
): Promise<void> {
  const content = `${totalCount}件のうち${ignoredCount}件は上限超過のため無視しました。`;
  try {
    const notif = await message.reply({ content, allowedMentions: { repliedUser: false } });
    setTimeout(() => {
      notif.delete().catch((err: Error) => {
        logger.warn("[MessageHandler] 上限超過通知の削除に失敗しました", { error: err.message });
      });
    }, 10_000);
  } catch (err) {
    logger.error("[MessageHandler] 上限超過通知の送信に失敗しました", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
```

---

## テスト確認ポイント

| 確認事項                                        | テスト種別 |
| ----------------------------------------------- | ---------- |
| `getMaxUrlsPerMessage` の各フォールバックパス   | unit       |
| `buildIgnoredNotice` 相当の文字列生成ロジック   | unit       |
| 上限 3 で 5 件送信 → 3 件処理・通知1回          | e2e / unit |
| ダッシュボードで上限変更後に即時反映            | e2e        |
| 設定値 0 / null / 6 でデフォルト 3 が適用される | unit       |

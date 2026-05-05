# API コントラクト: GET/PUT /api/guilds/{guildId}/config

**変更対象**: `dashboard/src/pages/api/guilds/[guildId]/config.ts`\
**認証**: Discord OAuth2 セッション必須 / サーバー管理権限チェック / Rate Limit あり（既存）

---

## GET /api/guilds/{guildId}/config

### リクエスト

変更なし。

### レスポンス（200 OK）

```json
{
  "success": true,
  "data": {
    "guildId": "123456789012345678",
    "allowAllChannels": false,
    "whitelistedChannelIds": ["111222333444555666"],
    "version": 3,
    "updatedAt": "2026-05-03T12:00:00.000Z",
    "maxUrlsPerMessage": 3
  }
}
```

**変更差分**:

| フィールド          | 型               | 説明                                                       |
| ------------------- | ---------------- | ---------------------------------------------------------- |
| `maxUrlsPerMessage` | `number \| null` | **[NEW]** 1〜5 の整数、または null（Bot 側でデフォルト 3） |

**実装変更**:

- `config.maxUrlsPerMessage` を既存レスポンスオブジェクトに追加するのみ

---

## PUT /api/guilds/{guildId}/config

### リクエスト

```json
{
  "allowAllChannels": false,
  "whitelistedChannelIds": ["111222333444555666"],
  "maxUrlsPerMessage": 3
}
```

**変更差分**:

| フィールド          | 型               | 必須 | 説明                                                          |
| ------------------- | ---------------- | ---- | ------------------------------------------------------------- |
| `maxUrlsPerMessage` | `number \| null` | 任意 | **[NEW]** 1〜5 の整数、または null（未設定 = Bot デフォルト） |

**バリデーションルール**:

```typescript
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

### レスポンス（200 OK）

```json
{
  "success": true,
  "data": {
    "guildId": "123456789012345678",
    "allowAllChannels": false,
    "whitelistedChannelIds": ["111222333444555666"],
    "version": 4,
    "updatedAt": "2026-05-03T12:01:00.000Z",
    "maxUrlsPerMessage": 3
  }
}
```

**SQLite 更新**（既存 UPDATE クエリの `.set()` に追加）:

```typescript
.set({
  allowAllChannels,
  version: nextVersion,
  updatedAt,
  updatedBy: user.id,
  maxUrlsPerMessage: maxUrlsPerMessage ?? null,   // [NEW]
})
```

**Redis 書き込み**（既存の `newConfig` オブジェクトに追加）:

```typescript
const newConfig: GuildConfig = {
  guildId,
  allowAllChannels,
  whitelistedChannelIds,
  version: nextVersion,
  updatedAt,
  updatedBy: user.id,
  maxUrlsPerMessage: maxUrlsPerMessage ?? undefined, // [NEW]
};
await redis.set(`app:guild:${guildId}:config`, JSON.stringify(newConfig));
```

### エラーレスポンス（追加分のみ）

| HTTP | code               | 条件                                               |
| ---- | ------------------ | -------------------------------------------------- |
| 400  | `INVALID_MAX_URLS` | `maxUrlsPerMessage` が 1〜5 の整数または null 以外 |

---

## 変更なしの既存エラーレスポンス

| HTTP | code                        |
| ---- | --------------------------- |
| 400  | `INVALID_GUILD_ID`          |
| 400  | `INVALID_REQUEST`           |
| 400  | `WHITELIST_LIMIT_EXCEEDED`  |
| 400  | `INVALID_CHANNEL_ID`        |
| 401  | `UNAUTHORIZED`              |
| 401  | `TOKEN_EXPIRED`             |
| 403  | `FORBIDDEN`                 |
| 404  | `BOT_NOT_JOINED_OR_OFFLINE` |
| 409  | `VERSION_CONFLICT`          |
| 412  | `MISSING_IF_MATCH`          |
| 412  | `INVALID_IF_MATCH`          |
| 429  | `RATE_LIMIT_EXCEEDED`       |
| 500  | `INTERNAL_ERROR`            |

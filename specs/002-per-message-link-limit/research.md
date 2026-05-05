# 調査結果: 1メッセージあたりの投稿リンク処理数上限

## 決定事項

### 1. Discord 通知メッセージの自動削除パターン

- **決定**: `message.reply()` で通知を返信後、`setTimeout(() => notifMsg.delete().catch(...), 10_000)` で約 10 秒後に削除する
- **根拠**: `messageCreate` イベントは `Interaction` を持たないため discord.js の ephemeral 送信（`reply({ ephemeral: true })`）が使用不可。`Message.delete()` は discord.js v14 で通常利用可能であり、Bot に `MANAGE_MESSAGES` 権限があれば自分の返信を削除できる
- **エラーハンドリング**: `.catch((err) => logger.warn("[MessageHandler] 上限超過通知の削除に失敗しました", { error: err.message }))` を付与し、削除失敗時はwarnログのみ（FR-010）
- **検討した代替案**:
  - `interaction.reply({ ephemeral: true })` → `messageCreate` イベントでは `Interaction` が存在しないため不可
  - チャンネルへの別送信 → `reply()` の方がスレッド的に分かりやすい

### 2. URL 上限の適用箇所と実装パターン

- **決定**: `MessageHandler.processUrls()` の先頭で `urls.slice(0, limit)` によりリストを切り詰め、残余件数を計算して全処理後に `sendIgnoredNotice()` を呼ぶ
- **根拠**: `processUrls` は `normal` URL と `spoiler` URL をそれぞれ独立して呼ばれており（`handleMessage` 内で2回呼び出し）、種別ごとの独立上限適用（FR-007）がそのまま実現できる
- **実装スケッチ**:
  ```typescript
  private async processUrls(client, message, urls, isSpoiler): Promise<void> {
    if (urls.length === 0) return;
    const limit = await this.getUrlLimit(message.guildId);
    const accepted = urls.slice(0, limit);
    const ignoredCount = urls.length - accepted.length;
    // ... accepted のみ処理 ...
    if (ignoredCount > 0) await this.sendIgnoredNotice(message, ignoredCount, urls.length);
  }
  ```
- **検討した代替案**:
  - `handleMessage` で一括カット → `normal` / `spoiler` の合算になってしまい FR-007 に違反する

### 3. 上限値の取得経路（Bot 側）

- **決定**: `ChannelConfigService` に `getMaxUrlsPerMessage(guildId: string): Promise<number>` を追加し、`RedisChannelConfigRepository.getConfig()` 経由で `GuildConfig.maxUrlsPerMessage` を読み取る。取得できない場合やが `null` / 不正値の場合は `DEFAULT_MAX_URLS_PER_MESSAGE = 3` にフォールバック
- **根拠**: `ChannelConfigService` は `MessageHandler` に既にオプショナル注入されており（`this.channelConfigService?`）、追加の DI 変更は不要。`RedisChannelConfigRepository` のキャッシュ（最大 5 分）を流用するためパフォーマンスオーバーヘッドなし
- **フォールバックチェーン**: `guildId` が null（DM） → 3 / `getConfig` が `error`/`not_found` → 3 / `maxUrlsPerMessage` が null・0・負数・非整数 → 3

### 4. Redis への伝播（GuildConfig フィールド追加）

- **決定**: `GuildConfig` インターフェースに `maxUrlsPerMessage?: number` を追加する。Dashboard の PUT エンドポイントが `JSON.stringify(newConfig)` でキー `app:guild:{id}:config` に書き込む既存処理により、新フィールドが自動的に Redis に含まれる
- **根拠**: `RedisChannelConfigRepository.getConfig()` は Redis の JSON を `GuildConfig` 型にキャストしているだけのため、フィールドを追加するだけで伝播が実現できる
- **CURRENT_SCHEMA_VERSION 更新**: `dashboard/src/lib/reseed.ts` の `CURRENT_SCHEMA_VERSION` を `1 → 2` に更新。Dashboard 再起動時に全ギルド設定を SQLite から再シードして `maxUrlsPerMessage` を Redis に反映する

### 5. SQLite スキーマ変更と Drizzle マイグレーション

- **決定**: `guildConfigs` テーブルに `maxUrlsPerMessage integer("max_urls_per_message")` を追加（Nullable / デフォルト NULL）。`drizzle-kit generate` でマイグレーション SQL を生成
- **根拠**: NULL = 未設定（Bot 側でデフォルト 3 にフォールバック）とすることで既存レコードへの影響ゼロ。Drizzle の `integer()` は SQLite の INTEGER 型に対応
- **マイグレーション名**: `0002_add_max_urls_per_message.sql`
- **検討した代替案**:
  - `integer(...).default(3).notNull()` → 既存レコードのデフォルト適用を DB 側に持つと、Bot 側フォールバックロジックとの二重管理になる

### 6. ダッシュボード UI の実装箇所

- **決定**: `dashboard/src/pages/dashboard/guilds/[guildId].astro` の既存 config-section に数値入力欄（`<input type="number" min="1" max="5">`）を追加。クライアントサイド JS で GET 時に値をセット、PUT 時にリクエストボディへ含める
- **根拠**: 同ページが既に `allowAllChannels` トグルを同じパターンで実装しており、整合性がある。Preact コンポーネントへの分離は over-engineering
- **バリデーション**: 入力範囲を `min="1" max="5"` でブラウザ側制約、API 側で `1 ≤ value ≤ 5` の数値検証を追加（FR-009）

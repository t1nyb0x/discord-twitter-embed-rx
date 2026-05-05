# タスク: 1メッセージあたりの投稿リンク処理数上限

**入力**: `/specs/002-per-message-link-limit/` からの設計ドキュメント\
**前提条件**: plan.md・spec.md・research.md・data-model.md・contracts/guild-config.md・quickstart.md

**整理**: タスクはユーザーストーリーごとにグループ化し、独立した実装・独立したテスト・MVPインクリメントとしての納品を可能にする。

## 形式: `[ID] [P?] [Story?] 説明`

- **[P]**: 並列実行可能（異なるファイル、互いに依存なし）
- **[Story]**: 属するユーザーストーリー（US1 / US2）
- 説明には正確なファイルパスを含める

---

## フェーズ1: セットアップ（共有パッケージ定数・型の追加）

**目的**: 両ユーザーストーリーが依存する定数・型定義の整備

- [ ] T001 [P] `packages/shared/src/constants.ts` に `DEFAULT_MAX_URLS_PER_MESSAGE = 3` と `MAX_URLS_PER_MESSAGE_LIMIT = 5` を追加する
- [ ] T002 [P] `packages/shared/src/config.ts` の `GuildConfig` インターフェースに `maxUrlsPerMessage?: number` フィールドを追加する

---

## フェーズ2: 基盤（ビルド確認）

**目的**: 共有パッケージの変更が両リポジトリでコンパイルエラーなしに使用できることを確認する

**⚠️ 重要**: このフェーズが完了するまでユーザーストーリーの作業は開始しない

- [ ] T003 `tsc --noEmit` で `@twitterrx/shared` および Bot 側（`tsconfig.json`）がエラーなしでコンパイルされることを確認する（T001・T002 依存）

**チェックポイント**: 基盤準備完了 — フェーズ3（US1）とフェーズ4（US2）の作業を開始可能

---

## フェーズ3: ユーザーストーリー1 — 上限を超えたリンクを無視する（優先度: P1）🎯 MVP

**目標**: Bot が 1 メッセージあたり最大 `DEFAULT_MAX_URLS_PER_MESSAGE`（3）件のURLのみを処理し、超過分を無視して通知する。Dashboard 設定なしでもデフォルト値で単独動作する。

**独立テスト**: Bot を再起動後、5件のURLを含む Discord メッセージを送信し、3件のEmbedが返信され、「5件のうち2件は上限超過のため無視しました。」という通知が届き約10秒後に自動削除されることで検証可能。

### ユーザーストーリー1の実装

- [ ] T004 [P] [US1] `src/core/services/ChannelConfigService.ts` に `getMaxUrlsPerMessage(guildId: string): Promise<number>` メソッドを追加する。`GuildConfig.maxUrlsPerMessage` が `null` / `undefined` / `0` / 負数 / 非整数 / `MAX_URLS_PER_MESSAGE_LIMIT` 超過の場合は `DEFAULT_MAX_URLS_PER_MESSAGE` にフォールバックする。`getConfig` が `error` / `not_found` の場合も同様（T003 依存、T005/T006 と並行可能）
- [ ] T005 [US1] `src/adapters/discord/MessageHandler.ts` に `getUrlLimit(guildId: string | null): Promise<number>` プライベートメソッドを追加する。`guildId` が `null` または `channelConfigService` が未注入の場合は `DEFAULT_MAX_URLS_PER_MESSAGE` を返す（T004 依存: 呼び出しシグネチャ確認）
- [ ] T006 [US1] `src/adapters/discord/MessageHandler.ts` に `sendIgnoredNotice(message: Message, ignoredCount: number, totalCount: number): Promise<void>` プライベートメソッドを追加する。`message.reply({ content: \`${totalCount}件のうち${ignoredCount}件は上限超過のため無視しました。\`, allowedMentions: { repliedUser: false } })`後に`setTimeout(() => notif.delete().catch(...), 10_000)`で約10秒後に自動削除する。削除失敗時は`logger.warn` のみ（FR-002・FR-010）（T005 に続き同一ファイル）
- [ ] T007 [US1] `src/adapters/discord/MessageHandler.ts` の `processUrls()` を修正する。先頭の `urls.length === 0` ガード直後に `const limit = await this.getUrlLimit(message.guildId)` / `const accepted = urls.slice(0, limit)` / `const ignoredCount = urls.length - accepted.length` を追加し、ループを `accepted` で回す。FR-008 デバッグログ（`limit` / `accepted.length` / `ignoredCount` / `isSpoiler`）と `if (ignoredCount > 0) await this.sendIgnoredNotice(...)` を追加する（T004・T005・T006 依存）

---

## フェーズ4: ユーザーストーリー2 — ダッシュボードで上限値を変更する（優先度: P2）

**目標**: Bot管理者がダッシュボードから上限値を1〜5の範囲で変更でき、Bot再起動なしに即時反映される。

**独立テスト**: ダッシュボードで上限値を5に変更して保存した直後、5件のURLを含むメッセージが全件処理されること（Bot再起動不要）で検証可能。

**⚠️ 実装順序**: Dashboard リポジトリ変更（T008〜T012）を先に PR・マージしてから T013 を実施する

### ユーザーストーリー2の実装（Dashboard 側）

- [ ] T008 [US2] `dashboard/src/lib/db/schema.ts` の `guildConfigs` テーブルに `maxUrlsPerMessage: integer("max_urls_per_message")` を追加する（Nullable・デフォルト NULL）
- [ ] T009 [US2] Dashboard ディレクトリで `npm run db:generate` を実行し `dashboard/drizzle/0002_add_max_urls_per_message.sql` を生成・コミットする（T008 依存）
- [ ] T010 [P] [US2] `dashboard/src/lib/reseed.ts` の `CURRENT_SCHEMA_VERSION` を `1` → `2` に更新する（T008 完了後、T009 と並行可能: 独立ファイル）
- [ ] T011 [P] [US2] `dashboard/src/pages/api/guilds/[guildId]/config.ts` を更新する。GET レスポンスオブジェクトに `maxUrlsPerMessage: config.maxUrlsPerMessage ?? null` を追加し、PUT に `maxUrlsPerMessage` のデストラクチャ・バリデーション（`1 ≤ value ≤ MAX_URLS_PER_MESSAGE_LIMIT` の整数チェック）・SQLite `UPDATE .set()` への追加・`newConfig` オブジェクトへの追加・Redis 書き込みへの反映を実装する（T008 完了後、T010 と並行可能）
- [ ] T012 [US2] `dashboard/src/pages/dashboard/guilds/[guildId].astro` に `<input type="number" id="max-urls-per-message" min="1" max="5">` の入力欄と説明テキストを追加し、クライアントサイド JS の `loadConfig()` / `saveConfig()` に `maxUrlsPerMessage` の読み取り・送信処理を追加する（T011 依存: API レスポンス形式の確認）

### ユーザーストーリー2の実装（TwitterRX 側）

- [ ] T013 [US2] Dashboard の PR マージ後、`git -C dashboard pull` + `git add dashboard` + `git commit` で `dashboard` サブモジュール参照を最新 HEAD に更新する（T009〜T012 の Dashboard PR マージ後）

---

## フェーズ5: ポリッシュとクロスカッティング

**目的**: コンスティテューション準拠の最終確認とビルドグリーン化

- [ ] T014 [P] `tsc --noEmit`（Bot・shared）と `npm run build`（Dashboard）がすべてエラーなしで通ることを確認する（全タスク完了後）
- [ ] T015 [P] クリーンコード確認: `DEFAULT_MAX_URLS_PER_MESSAGE` / `MAX_URLS_PER_MESSAGE_LIMIT` が定数経由で参照されマジックナンバーが残っていないことを目視レビューする（原則 I）
- [ ] T016 [P] 早期リターン確認: `processUrls` の先頭ガード節が維持され `else` ブロックが追加されていないことを確認する（原則 II）
- [ ] T017 [P] メソッドサイズ確認: `processUrls` · `sendIgnoredNotice` · `getUrlLimit` · `getMaxUrlsPerMessage` がそれぞれ30行以内であることを確認する（原則 IV）
- [ ] T018 [P] SRP 確認: Core 層（ChannelConfigService）に discord.js の import がなく、Adapter 層（MessageHandler）に DB / Redis 直接アクセスがないことを確認する（原則 V）

---

## 依存関係グラフ

```text
T001 ─┐
T002 ─┴─ T003 ─┬─ T004 [P]─┬─ T007（US1 完了）
                │   T005 ───┤
                │   T006 ───┘
                │
                └─ T008 ──┬─ T009
                          ├─ T010 [P]
                          └─ T011 [P] ─── T012 ─── T013（US2 完了）

T013 完了 → T014〜T018（ポリッシュ）
```

## 並列実行の機会

| フェーズ         | 並列実行可能なタスク | 備考                                  |
| ---------------- | -------------------- | ------------------------------------- |
| フェーズ1        | T001 ‖ T002          | 独立ファイル                          |
| フェーズ3（US1） | T004 ‖ T005→T006     | ChannelConfigService ‖ MessageHandler |
| フェーズ4（US2） | T010 ‖ T011          | reseed.ts ‖ config.ts（T008 完了後）  |
| フェーズ5        | T014〜T018 全て      | 独立レビュー項目                      |

## 実装戦略

**MVP スコープ（フェーズ1〜3）**: shared パッケージ変更 + Bot 側上限適用ロジックのみで US1 が完全に動作する。Dashboard 変更（US2）は後続 PR として分離可能。

**インクリメンタルデリバリー**:

1. フェーズ1〜3 を単一 PR でリリース → デフォルト上限3件がすぐに有効
2. フェーズ4 を Dashboard 先行 PR → Bot サブモジュール更新 PR の順でリリース → ダッシュボードから上限を可変制御

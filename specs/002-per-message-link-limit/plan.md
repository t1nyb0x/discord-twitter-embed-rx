# 実装計画: 1メッセージあたりの投稿リンク処理数上限

**ブランチ**: `002-per-message-link-limit` | **日付**: 2026-05-03 | **仕様**: [spec.md](./spec.md)\
**入力**: `/specs/002-per-message-link-limit/spec.md` からのフィーチャー仕様

## サマリー

Discord メッセージ内の Twitter/X URL を処理する際、1メッセージあたりの上限数（デフォルト 3、最大 5）を超えた
URL を無視し、全処理完了後に通知メッセージを `reply()` で送信して約 10 秒後に自動削除する。
上限値はダッシュボードのサーバー設定画面から変更でき、Redis Pub/Sub を通じて Bot に即時反映される。

実装は Dashboard リポジトリ（先行 PR）→ TwitterRX リポジトリ（サブモジュール更新 + Bot 実装）の順。
変更対象は **①Dashboard 側 6 ファイル + 新規マイグレーション 1 本**、**②Bot 側 5 ファイル** に限定される。

## 技術コンテキスト

**言語/バージョン**: TypeScript（strict モード）\
**主要な依存関係**: discord.js v14（Bot）、Astro.js（ダッシュボード）、Drizzle ORM + SQLite（ダッシュボード DB）\
**ストレージ**: SQLite（ダッシュボード永続化）、Redis（Bot↔Dashboard 間のリアルタイム設定共有、Pub/Sub 更新通知）\
**テスト**: Vitest（unit / integration / e2e）\
**ターゲットプラットフォーム**: Docker コンテナ（Linux）、npm workspaces モノレポ（bot / dashboard / shared）\
**プロジェクトタイプ**: Webアプリケーション（Dashboard）+ Bot（Node.js サービス）\
**パフォーマンス目標**: メッセージ処理のオーバーヘッドは配列 slice 1 回のみ（< 1ms）。Redis 読み取りは既存の `getConfig` キャッシュ経由でオーバーヘッドなし\
**制約**: `messageCreate` イベントでは Discord Interaction（ephemeral）が使用不可。通知は `reply()` + `setTimeout` による遅延削除で代替。Bot と Dashboard は別コンテナ（共有 Redis で接続）\
**スケール/スコープ**: GuildConfig 単一フィールド追加。既存の Redis キャッシュ・Pub/Sub 伝播経路を流用

## コンスティテューションチェック

_ゲート: フェーズ0の調査前にパスする必要あり。フェーズ1の設計後に再チェック。_

> 参照: `.specify/memory/constitution.md` v1.0.0

| 原則               | チェック内容                                                                                                                                                                                  | ステータス |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| I. クリーンコード  | `DEFAULT_MAX_URLS_PER_MESSAGE = 3`・`MAX_URLS_PER_MESSAGE_LIMIT = 5` を `constants.ts` に定数化。マジックナンバーなし。変数名は意図を明示（`accepted` / `ignoredCount`）                      | [x]        |
| II. 早期リターン   | `processUrls` の先頭に `if (urls.length === 0) return` ガード節。上限チェックは `urls.slice(0, limit)` で前処理し、通常フローに早期分岐不要な形に整理                                         | [x]        |
| III. テスト容易性  | `ChannelConfigService.getMaxUrlsPerMessage()` は `IChannelConfigRepository` 経由でモック可能。`buildIgnoredNotice(ignored, total)` は純粋関数として切り出しユニットテスト対象にする           | [x]        |
| IV. メソッドサイズ | `processUrls` の変更量はスライス 2 行 + 通知呼び出し 1 行で 3 行追加。`sendIgnoredNotice` を別プライベートメソッドに切り出すことで `processUrls` は 30 行以内を維持                           | [x]        |
| V. SRP             | 上限値読み取り: `ChannelConfigService`（core 層）。スライス・通知送信: `MessageHandler`（adapter 層）。保存 API・UI: dashboard 側に閉じる。Core 層から discord.js・Node.js API を直接呼ばない | [x]        |
| 技術スタック       | `any` 型不使用（`maxUrlsPerMessage?: number` として型付け）。Core 層への Node.js 直呼びなし。Redis クライアントは既存の単一初期化インスタンスを流用                                           | [x]        |

## プロジェクト構造

### ドキュメント（このフィーチャー）

```text
specs/002-per-message-link-limit/
├── plan.md              # このファイル
├── spec.md              # フィーチャー仕様
├── research.md          # フェーズ0の出力
├── data-model.md        # フェーズ1の出力
├── quickstart.md        # フェーズ1の出力
├── contracts/           # フェーズ1の出力
│   └── guild-config.md  # GET/PUT /api/guilds/{guildId}/config の変更差分
└── tasks.md             # フェーズ2の出力（/speckit.tasksコマンドで作成）
```

### ソースコード（変更対象）

```text
# ① Dashboard リポジトリ（先行 PR）
dashboard/src/lib/db/schema.ts           # [変更] guildConfigs に maxUrlsPerMessage カラム追加
dashboard/src/lib/reseed.ts              # [変更] CURRENT_SCHEMA_VERSION: 1 → 2
dashboard/src/pages/api/guilds/[guildId]/config.ts   # [変更] GET/PUT に maxUrlsPerMessage 追加
dashboard/src/pages/dashboard/guilds/[guildId].astro  # [変更] 数値入力 UI 追加
dashboard/drizzle/                       # [新規] 0002_add_max_urls_per_message.sql マイグレーション

# ② shared パッケージ（① と同一 PR または直後）
packages/shared/src/config.ts           # [変更] GuildConfig に maxUrlsPerMessage?: number 追加
packages/shared/src/constants.ts        # [変更] DEFAULT_MAX_URLS_PER_MESSAGE / MAX_URLS_LIMIT 追加

# ③ TwitterRX リポジトリ（Dashboard マージ後）
dashboard                                # [変更] サブモジュール参照を①のマージ後 HEAD に更新
src/core/services/ChannelConfigService.ts  # [変更] getMaxUrlsPerMessage() メソッド追加
src/adapters/discord/MessageHandler.ts    # [変更] processUrls に上限適用 + sendIgnoredNotice 追加
```

**構造の決定**: Webアプリケーション + Bot の複合構成（Option 2 相当）。既存モノレポ構造に完全準拠。
新規ファイルは Drizzle マイグレーション SQL のみ。

## 複雑性の追跡

> コンスティテューションチェックに違反なし。追記不要。

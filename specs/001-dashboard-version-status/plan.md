````markdown
# 実装計画: ダッシュボードバージョンのBotステータス表示

**ブランチ**: `001-dashboard-version-status` | **日付**: 2026-04-06 | **仕様**: [spec.md](./spec.md)
**入力**: `/specs/001-dashboard-version-status/spec.md` からのフィーチャー仕様

**注意**: このテンプレートは `/speckit.plan`
コマンドによって記入されます。実行ワークフローについては
`.specify/templates/plan-template.md` を参照してください。

## サマリー

ダッシュボードのバージョン情報を共有 Redis を介して Bot に伝達し、Discord ステータスに
`v{bot版}(Dashboard v{dash版}), 導入サーバー数: {N}` の形式で表示する。
ダッシュボード停止時はTTL切れにより自動的に `(Dashboard 未接続)` にフォールバックする。
変更は Bot 側3ファイル + ダッシュボード側1ファイル + 共有パッケージ2ファイルの合計6ファイルに限定される。

## 技術コンテキスト

**言語/バージョン**: TypeScript（strict モード）\
**主要な依存関係**: discord.js v14, redis (Bot側), ioredis (ダッシュボード側)\
**ストレージ**: Redis（Bot・ダッシュボード共有インスタンス、`REDIS_URL` 環境変数）\
**テスト**: Vitest\
**ターゲットプラットフォーム**: Docker コンテナ（Linux）\
**プロジェクトタイプ**: npm workspaces モノレポ（bot / dashboard / shared）\
**パフォーマンス目標**: ステータス更新は既存の5分間隔キャディアンスに乗る。追加レイテンシ < 10ms（Redis GET 1回）\
**制約**: Bot側ランタイムに `dashboard/` ディレクトリは存在しない（別コンテナ）。Redis クライアントライブラリが Bot と ダッシュボードで異なる（redis vs ioredis）\
**スケール/スコープ**: 単一 Redis キー、読み取り頻度 = 5分に1回、書き込み頻度 = 2分に1回

## コンスティテューションチェック

_ゲート: フェーズ0の調査前にパスする必要あり。フェーズ1の設計後に再チェック。_

> 参照: `.specify/memory/constitution.md` v1.0.0

| 原則               | チェック内容                                                                                                                                                                             | ステータス |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| I. クリーンコード  | `DASHBOARD_VERSION_KEY`, `DASHBOARD_VERSION_TTL_SECONDS`, `DASHBOARD_VERSION_FALLBACK` を定数化。DRY: 共有パッケージ経由で Bot・ダッシュボード両方が参照                                 | [x]        |
| II. 早期リターン   | `updateStatus` 内で Redis GET 失敗時は早期にフォールバック値を使用                                                                                                                       | [x]        |
| III. テスト容易性  | Bot側: `updateStatus` 内の Redis 呼び出しは既存の `redis` インスタンス経由（テスト時はモック可能）。ダッシュボード側: `initializeApp` の Redis 書き込みは既存の `redis` インスタンス経由 | [x]        |
| IV. メソッドサイズ | `updateStatus`: 10行以下。`startVersionHeartbeat`: 15行以下。30行制限に収まる                                                                                                            | [x]        |
| V. SRP             | 共有パッケージ: 定数定義のみ。ダッシュボード: 起動処理内のバージョン書き込みのみ。Bot: ステータス更新ロジック内のバージョン読み取りのみ。責務混在なし                                    | [x]        |
| 技術スタック       | `any` 型不使用。Core 層への変更なし。Redis は既存の初期化済みインスタンスを使用                                                                                                          | [x]        |

## プロジェクト構造

### ドキュメント（このフィーチャー）

```text
specs/001-dashboard-version-status/
├── plan.md              # このファイル
├── spec.md              # フィーチャー仕様
├── research.md          # フェーズ0の出力
├── data-model.md        # フェーズ1の出力
├── quickstart.md        # フェーズ1の出力
├── checklists/
│   └── requirements.md  # 仕様品質チェックリスト
└── tasks.md             # フェーズ2の出力（/speckit.tasksコマンドで作成）
```

### ソースコード（変更対象）

```text
packages/shared/src/
├── constants.ts         # [新規] Redis キー名・TTL・フォールバック値の共有定数
└── index.ts             # [変更] constants.ts の re-export 追加

dashboard/src/
└── startup.ts           # [変更] バージョン書き込み + TTL延長ジョブ追加

src/
└── index.ts             # [変更] updateStatus を async 化、Redis からバージョン読み取り
```

**構造の決定**: 既存のモノレポ構造に沿い、共有定数は `@twitterrx/shared` パッケージに配置。
Bot・ダッシュボードそれぞれの既存エントリーポイントに最小限の変更を加える。新規クラスや
サービスの追加は不要（定数ファイル1つのみ新規作成）。

## 複雑性の追跡

> コンスティテューションチェックに違反なし。追記不要。
````

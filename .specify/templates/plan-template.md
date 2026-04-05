````markdown
# 実装計画: [フィーチャー]

**ブランチ**: `[###-feature-name]` | **日付**: [日付] | **仕様**: [リンク]
**入力**: `/specs/[###-feature-name]/spec.md` からのフィーチャー仕様

**注意**: このテンプレートは `/speckit.plan`
コマンドによって記入されます。実行ワークフローについては
`.specify/templates/plan-template.md` を参照してください。

## サマリー

[フィーチャー仕様から抽出: 主要な要件 + 調査からの技術的アプローチ]

## 技術コンテキスト

<!--
  アクション必須: このセクションの内容をプロジェクトの技術詳細に置き換えてください。
  ここでの構造は反復プロセスをガイドするための参考として提示されています。
-->

**言語/バージョン**: [例: Python 3.11、Swift 5.9、Rust 1.75 または NEEDS
CLARIFICATION]\
**主要な依存関係**: [例: FastAPI、UIKit、LLVM または NEEDS CLARIFICATION]\
**ストレージ**: [該当する場合、例: PostgreSQL、CoreData、ファイル または N/A]\
**テスト**: [例: pytest、XCTest、cargo test または NEEDS CLARIFICATION]\
**ターゲットプラットフォーム**: [例: Linuxサーバー、iOS 15+、WASM または NEEDS
CLARIFICATION] **プロジェクトタイプ**: [single/web/mobile - ソース構造を決定]\
**パフォーマンス目標**: [ドメイン固有、例: 1000 req/s、10k lines/sec、60 fps
または NEEDS CLARIFICATION]\
**制約**: [ドメイン固有、例: <200ms p95、<100MB メモリ、オフライン対応 または
NEEDS CLARIFICATION]\
**スケール/スコープ**: [ドメイン固有、例: 10kユーザー、1M LOC、50画面 または
NEEDS CLARIFICATION]

## コンスティテューションチェック

_ゲート: フェーズ0の調査前にパスする必要あり。フェーズ1の設計後に再チェック。_

> 参照: `.specify/memory/constitution.md` v1.0.0

| 原則               | チェック内容                                                           | ステータス |
| ------------------ | ---------------------------------------------------------------------- | ---------- |
| I. クリーンコード  | 命名が意図を表しているか / 定数化 / DRY                                | [ ]        |
| II. 早期リターン   | ガード節が先頭にあるか / `else` 排除                                   | [ ]        |
| III. テスト容易性  | DI 構造が設計に含まれているか / Adapter 層が存在するか                 | [ ]        |
| IV. メソッドサイズ | 設計上30行超過の箇所がないか（超過時は理由明記）                       | [ ]        |
| V. SRP             | Core / Adapter / Infrastructure の責務が分離されているか               | [ ]        |
| 技術スタック       | `any` 型不使用 / Core 層が Node.js API 直呼び不使用 / Redis 単一初期化 | [ ]        |

## プロジェクト構造

### ドキュメント（このフィーチャー）

```text
specs/[###-feature]/
├── plan.md              # このファイル（/speckit.planコマンドの出力）
├── research.md          # フェーズ0の出力（/speckit.planコマンド）
├── data-model.md        # フェーズ1の出力（/speckit.planコマンド）
├── quickstart.md        # フェーズ1の出力（/speckit.planコマンド）
├── contracts/           # フェーズ1の出力（/speckit.planコマンド）
└── tasks.md             # フェーズ2の出力（/speckit.tasksコマンド - /speckit.planでは作成されない）
```

### ソースコード（リポジトリルート）

<!--
  アクション必須: 以下のプレースホルダーツリーをこのフィーチャーの具体的なレイアウトに
  置き換えてください。使用しないオプションを削除し、選択した構造を実際のパス
  （例: apps/admin、packages/something）で展開してください。納品される計画に
  Optionラベルを含めないでください。
-->

```text
# [未使用の場合削除] オプション1: 単一プロジェクト（デフォルト）
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [未使用の場合削除] オプション2: Webアプリケーション（"frontend" + "backend" が検出された場合）
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [未使用の場合削除] オプション3: モバイル + API（"iOS/Android" が検出された場合）
api/
└── [上記backendと同じ]

ios/ または android/
└── [プラットフォーム固有の構造: フィーチャーモジュール、UIフロー、プラットフォームテスト]
```

**構造の決定**: [選択した構造を文書化し、上で記録した実際のディレクトリを参照]

## 複雑性の追跡

> **コンスティテューションチェックに正当化が必要な違反がある場合のみ記入**

| 違反                      | 必要な理由     | よりシンプルな代替案を却下した理由 |
| ------------------------- | -------------- | ---------------------------------- |
| [例: 4番目のプロジェクト] | [現在の必要性] | [3プロジェクトでは不十分な理由]    |
| [例: リポジトリパターン]  | [具体的な問題] | [直接DB接続では不十分な理由]       |
````

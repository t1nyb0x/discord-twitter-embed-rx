# melody-step 開発ガイドライン

すべてのフィーチャー計画から自動生成。最終更新: 2026-03-14

## アクティブな技術

- **言語**: TypeScript 5.x（strict モード必須）
- **ランタイム**: Deno 2.x
- **バンドラー**: Vite（`@deno/vite-plugin`）
- **オーディオエンジン**: Tone.js 15.x（`npm:tone` specifier 経由）
- **テスト**: `Deno.test` + `@std/testing/mock`
- **ターゲット**: モダンブラウザ（Web Audio API 必須）

## プロジェクト構造

```text
src/
├── audio/         # Tone.js 統合の唯一の入口（AudioAdapter, SynthFactory, NoteScheduler）
├── game/          # ゲームロジック（QuestionGenerator, AnswerEvaluator, DifficultyManager, MelodyGenerator, ScoreCalculator）
├── ui/            # 描画のみ（screens/, components/）
├── types/         # 全共有型定義（index.ts）
├── constants/     # MIDI定数, レベル設定, 確率重み
├── repositories/  # PlayerStatsRepository（localStorage 永続化）
└── main.ts

tests/
└── unit/          # Deno.test ユニットテスト（game/ と audio/ を網羅）
```

## コマンド

```sh
deno task dev          # 開発サーバー起動 (http://localhost:5173)
deno task build        # 本番ビルド (dist/)
deno test tests/       # 全ユニットテスト実行
deno lint              # Linting
deno fmt --check       # フォーマット確認
deno check src/main.ts # 型チェック
```

## コードスタイル

- `any` 型の使用を禁止する。`unknown` + 型ガードを使うこと。
- ブランド型 (`MidiNote`, `NoteLabel`) で MIDI番号と表示文字列を区別する。
- **早期リターン（ガード節）**を全条件分岐で採用する（`else` 禁止）。
- 1関数 **30行以内**（複雑な処理は最大60行）。超過したら関数を分割する。
- `src/ui/` にゲームロジック・Tone.js の直接呼び出しを書かない（SRP）。
- `src/game/` に DOM 操作・音声出力を書かない（SRP）。
- Tone.js は必ず `AudioAdapter` インターフェース越しに呼び出す。

## 最近の変更

- **001-ear-training-game** (2026-03-14): Melody Step MVP 初期実装
  - Direction / Interval / Melody の3ゲームモード
  - MIDIノート番号による音高管理（表示時のみ音名変換）
  - AudioAdapter 層（Tone.js
    統合）・QuestionGenerator・AnswerEvaluator・DifficultyManager・ScoreCalculator・PlayerStatsRepository
    の6モジュール契約定義

<!-- 手動追加開始 -->
<!-- 手動追加終了 -->

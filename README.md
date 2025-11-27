# replyvxtwitter

[![CI](https://github.com/t1nyb0x/discord-twitter-embed-rx/actions/workflows/ci.yml/badge.svg)](https://github.com/t1nyb0x/discord-twitter-embed-rx/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/t1nyb0x/discord-twitter-embed-rx/branch/main/graph/badge.svg)](https://codecov.io/gh/t1nyb0x/discord-twitter-embed-rx)

## これは何

Twitter（X）の投稿URLをDiscord上に発信すると、[vxTwitter](https://github.com/dylanpdx/BetterTwitFix)のAPIから内容を取得し、Discord上に展開します。

![実行例](./md/image.png)

## 使い方

### 前提

Discord Developer Portalよりアプリケーションの作成を行ってください。
https://discord.com/developers/applications

作成の上、`.env.example` を `.env` へコピーしてトークンを設定してください。

productionとdevelopがありますが、どちらを設定しても動作に変わりはありません。本番と開発で2アカウント使用する場合にそれぞれセットする運用になります。

作成したアプリケーションは、使用したいサーバーに招待する必要があります。

パーミッションは
- bot scope
  - Send Messages
  - Embed Links
  - Read message History

の設定で問題ないかと思います。

### ローカルで動かす場合

`npm run compile && npm start`

### Dockerを利用する場合

1. `cp compose.yml.example compose.yml` を実行
2. `docker compose up -d` で立ち上がります

## テスト

このプロジェクトはVitestを使用してテストを実装しています。

### テストの実行

```bash
# すべてのテストを実行
npm test

# ユニットテストのみ実行
npm run test:unit

# 統合テストのみ実行（実際のAPI呼び出しを含む）
npm run test:integration

# UIモードで実行
npm run test:ui

# カバレッジレポート付きで実行
npm run test:coverage
```

### テスト構造

```
tests/
├── unit/                   # ユニットテスト
│   ├── core/              # ビジネスロジックのテスト
│   ├── adapters/          # アダプター層のテスト
│   └── infrastructure/    # インフラ層のテスト（未実装）
├── integration/           # 統合テスト
│   └── twitter-api.test.ts # 実際のTwitter API呼び出しテスト
└── fixtures/              # テストデータ
    ├── mock-tweets.ts
    └── test-urls.ts
```

詳細なテスト仕様については [testspec.md](./md/testspec.md) を参照してください。

## アーキテクチャ

このプロジェクトは軽量レイヤードアーキテクチャを採用しています。
詳細は [ARCHITECTURE.md](./ARCHITECTURE.md) を参照してください。

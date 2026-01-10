# アーキテクチャ設計

このプロジェクトは**軽量レイヤードアーキテクチャ**を採用しています。

## 構造概要

```
src/
├── index.ts                    # エントリーポイント（依存性注入）
├── config/                     # 設定
├── core/                       # コア層（ビジネスロジック）
│   ├── models/                # ドメインモデル
│   │   └── Tweet.ts          # ツイートデータの統一モデル
│   └── services/              # ドメインサービス
│       ├── TweetProcessor.ts  # ツイート処理ロジック
│       └── MediaHandler.ts    # メディア処理ロジック
├── adapters/                   # アダプター層
│   ├── discord/               # Discord固有
│   │   ├── MessageHandler.ts # メッセージ処理
│   │   └── EmbedBuilder.ts   # Embed作成
│   └── twitter/               # Twitter API固有
│       ├── BaseTwitterAdapter.ts
│       ├── VxTwitterAdapter.ts
│       ├── FxTwitterAdapter.ts
│       └── TwitterAdapter.ts  # 統合アダプター
├── infrastructure/            # インフラ層
│   ├── http/
│   │   ├── HttpClient.ts     # HTTP通信
│   │   └── VideoDownloader.ts # 動画DL
│   ├── filesystem/
│   │   └── FileManager.ts    # ファイル操作
│   └── db/
│       └── RedisReplyLogger.ts # Redis操作
└── db/                        # データベース接続
```

## レイヤー説明

### 1. Core層（ビジネスロジック）
**責務**: ビジネスルールとドメイン知識を表現
- `Tweet`: ツイートの統一モデル（外部API依存を排除）
- `TweetProcessor`: URL抽出、スポイラー判定などの処理
- `MediaHandler`: メディアのフィルタリング、分類

**特徴**:
- 外部ライブラリに依存しない
- テストが容易
- 再利用可能

### 2. Adapter層（外部システムとの接続）
**責務**: 外部システム（Discord、Twitter API）とのやり取り

#### Discord Adapter
- `MessageHandler`: メッセージ受信・返信処理
- `EmbedBuilder`: Discord Embed生成

#### Twitter Adapter
- `BaseTwitterAdapter`: 共通処理の基底クラス
- `VxTwitterAdapter`: VxTwitter API対応
- `FxTwitterAdapter`: FxTwitter API対応
- `TwitterAdapter`: 統合アダプター（フォールバック機能付き）

**特徴**:
- インターフェース経由で依存
- API変更の影響を局所化
- モックに置き換え可能

### 3. Infrastructure層（技術的詳細）
**責務**: 低レベルな技術的実装

- `HttpClient`: HTTP通信
- `VideoDownloader`: 動画ダウンロード
- `FileManager`: ファイルシステム操作
- `RedisReplyLogger`: Redis操作

**特徴**:
- 実装の詳細を隠蔽
- 置き換え可能

## 依存関係のルール

```
Core層 ← Adapter層 ← Infrastructure層
  ↑         ↑              ↑
  └─────────┴──────────────┘
         index.ts (DI)
```

- **Core層**: 他のどの層にも依存しない
- **Adapter層**: Core層のみに依存
- **Infrastructure層**: Adapter層のインターフェースに依存
- **index.ts**: すべてを組み立てる（Dependency Injection）

## インターフェースによる疎結合

各層はインターフェースを通じて通信します。

```typescript
// Adapter層が定義
export interface ITwitterAdapter {
  fetchTweet(url: string): Promise<Tweet | undefined>;
}

// Infrastructure層が実装
export class VxTwitterAdapter implements ITwitterAdapter {
  async fetchTweet(url: string): Promise<Tweet | undefined> {
    // 実装
  }
}

// index.tsで注入
const twitterAdapter = TwitterAdapter.createDefault();
const messageHandler = new MessageHandler(
  tweetProcessor,
  twitterAdapter,  // インターフェース経由
  embedBuilder,
  // ...
);
```

## テスト戦略

### Unit Test
各層を独立してテスト可能：

```typescript
// Core層のテスト（依存なし）
describe('TweetProcessor', () => {
  it('should extract URLs from text', () => {
    const processor = new TweetProcessor();
    const urls = processor.extractUrls('Check this https://twitter.com/user/status/123');
    expect(urls).toEqual(['https://twitter.com/user/status/123']);
  });
});

// Adapter層のテスト（モック使用）
describe('MessageHandler', () => {
  it('should handle tweet URLs', async () => {
    const mockTwitterAdapter = {
      fetchTweet: jest.fn().mockResolvedValue(mockTweet)
    };
    const handler = new MessageHandler(
      processor,
      mockTwitterAdapter,  // モックを注入
      // ...
    );
    // テスト実行
  });
});
```

### Integration Test
実際のAPIを使用したテストも容易：

```typescript
describe('TwitterAdapter Integration', () => {
  it('should fetch real tweet', async () => {
    const adapter = TwitterAdapter.createDefault();
    const tweet = await adapter.fetchTweet(realTweetUrl);
    expect(tweet).toBeDefined();
  });
});
```

## 拡張性

### 新しいTwitter APIの追加
1. `BaseTwitterAdapter`を継承
2. `TwitterAdapter`のコンストラクタに追加
3. 既存コードは無変更

### 別チャットプラットフォームへの対応
1. `adapters/slack/`などを作成
2. `MessageHandler`と同等のクラスを実装
3. `index.ts`で組み立て

### ストレージの変更（Redis → PostgreSQL）
1. `IReplyLogger`を実装した新クラスを作成
2. `index.ts`のDI部分のみ変更
3. 他のコードは無変更

## メリット

1. **テスタビリティ**: 各コンポーネントを独立してテスト可能
2. **保守性**: 責務が明確で変更の影響範囲が限定的
3. **拡張性**: 新機能追加が容易
4. **可読性**: コードの役割が明確
5. **疎結合**: インターフェースによる依存で柔軟性が高い

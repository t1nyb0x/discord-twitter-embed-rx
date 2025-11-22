このプロジェクトのディレクトリ直下にtestsディレクトリを作成して、テストコードを実装していってください（testが正しければtestディレクトリでも良い）

以下の仕様が満たせていることを確認するテストを実装してください

## 仕様

### 基本機能
- twitter.comまたはx.comの投稿URLから、vxtwitterとfxtwitterを通して投稿データが取得できること
- vxtwitterのAPI取得が失敗した場合、fxtwitterにフォールバックして取得を試みること
- vxtwitter/fxtwitterから取得した投稿データを埋め込みデータとして送信できること
- 引用ツイート（リツイート with コメント）が含まれる場合、引用元の情報も表示されること

### メディア処理
- 動画データが含まれる投稿URLの場合、設定されたMAX_FILE_SIZE以下は動画をダウンロードすること
- 動画データが含まれる投稿URLの場合、設定されたMAX_FILE_SIZE超過はURLを投稿すること
- 動画データをダウンロードした場合は、動画データをDiscordに投稿できること

### スポイラー機能
- ||で囲まれた投稿URLの場合は、ネタバレを見るかのボタンが投稿されること
    - ネタバレを見るボタン押下をすると投稿データを取得し、押したユーザーにのみ見せること

### URL処理
- 1つのメッセージに複数の投稿URLが含まれる場合、それぞれ個別に処理されること
- 同じURLが複数回含まれる場合、重複を除去して1回だけ処理されること
- ||で囲まれたURLと通常のURLが混在する場合、それぞれ適切に処理されること

### メッセージ管理
- 元メッセージを削除した場合、Botの返信メッセージも自動削除されること
- Bot自身や他のBotのメッセージは処理されないこと

### エラーハンドリング
- 存在しないまたは削除済みの投稿URLの場合、エラーメッセージが返信されること
- API取得が完全に失敗した場合、適切なエラーメッセージが表示されること

## テストに使用するURL

### 基本テスト用
- 通常の投稿URL
    - https://x.com/Yahoo_weather/status/1823458714147586362

- 引用ツイート含む投稿URL
    - https://x.com/owada_hitomi/status/1991425545578639663?t=P2h5qefUJNDrnMHKRWDeHQ&s=19

### メディアテスト用
- 動画つき投稿URL（MAX_FILE_SIZE以下）
    - https://x.com/bou128/status/1870044090072739960

- 動画つき投稿URL（MAX_FILE_SIZE超過）
    - https://x.com/dolphin_HPG/status/1890325106888495363?t=mU3LKT3V2KRKsYkoPgIF2A&s=19

### 複数URL・重複テスト用
- 複数URLを含むメッセージ
    - "Check these: https://x.com/Yahoo_weather/status/1823458714147586362 https://x.com/bou128/status/1870044090072739960"

- 重複URLを含むメッセージ
    - "Same tweet: https://x.com/Yahoo_weather/status/1823458714147586362 and https://x.com/Yahoo_weather/status/1823458714147586362"

### スポイラーテスト用
- ||で囲まれた投稿URL
    - ||https://x.com/Yahoo_weather/status/1823458714147586362||

- スポイラーと通常URLの混在
    - "Normal: https://x.com/bou128/status/1870044090072739960 and ||https://x.com/Yahoo_weather/status/1823458714147586362||"

### エラーテスト用
- 存在しない投稿URL
    - https://x.com/invalid_user/status/0000000000000000000

## テスト構造

```
tests/
├── unit/                      # ユニットテスト
│   ├── core/
│   │   ├── TweetProcessor.test.ts      # URL抽出、スポイラー判定、重複除去
│   │   └── MediaHandler.test.ts        # ファイルサイズフィルタリング
│   ├── adapters/
│   │   ├── twitter/
│   │   │   ├── VxTwitterAdapter.test.ts
│   │   │   ├── FxTwitterAdapter.test.ts
│   │   │   └── TwitterAdapter.test.ts  # フォールバック機能
│   │   └── discord/
│   │       ├── EmbedBuilder.test.ts    # Embed生成、引用ツイート表示
│   │       └── MessageHandler.test.ts  # メッセージ処理、Bot無視
│   └── infrastructure/
│       ├── HttpClient.test.ts          # ファイルサイズ取得
│       ├── VideoDownloader.test.ts     # 動画DL
│       └── FileManager.test.ts         # ファイル操作
├── integration/               # 統合テスト
│   ├── twitter-api.test.ts   # 実際のTwitter API呼び出し（VxTwitter/FxTwitter）
│   └── discord-bot.test.ts   # 実際のDiscord Bot動作
│       # - メッセージ送信→返信確認
│       # - メッセージ削除→自動削除確認
│       # - スポイラーボタン動作確認
└── fixtures/                  # テストデータ
    ├── mock-tweets.ts        # モックツイートデータ
    └── test-urls.ts          # テスト用URL定義
```

## その他

### テスト環境
- Discordへの接続に使用するトークンは、テスト専用のトークンを使用します
    - ローカルで使用する場合は、.envを使います。
    - CI環境で動かす場合は、GitHubのSecretを使います。

### テストフレームワーク
- Jest または Vitest を使用
- モック: jest.mock() または vi.mock()

### カバレッジ目標
- ユニットテスト: 80%以上
- 統合テスト: 主要フローをカバー

# replyvxtwitter

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

`docker compose up -d` でそのまま使用できます。
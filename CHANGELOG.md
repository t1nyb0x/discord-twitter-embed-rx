# Changelog

## [1.13.0](https://github.com/t1nyb0x/discord-twitter-embed-rx/compare/v1.12.0...v1.13.0) (2025-08-05)


### Features

* Redis導入 ([9d57fb9](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/9d57fb9dc0278ba4ad19d160dd36d31c1107b8a6))
* Redis導入, 元メッセージ削除時にそこに返信している自発言を削除するように ([7f076f5](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/7f076f52ebf43599678bf27913c71873392f123c))
* Redis導入, 元メッセージ削除時にそこに返信している自発言を削除するように ([c92f7ce](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/c92f7ce638f70f2056b6fd7e1c6ca6ad20a202da))


### Bug Fixes

* **deps:** update dependency axios to v1.11.0 ([8f0aaeb](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/8f0aaeb6dbfe6f91486089b726946c8350da4251))
* **deps:** update dependency redis to v5.8.0 ([64e5fb1](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/64e5fb13f8e1702b09771535890bb8bd50e9e6a1))
* **deps:** update dependency redis to v5.8.0 ([27d7ac5](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/27d7ac5a20538f4fc30d6064e0b72346edcfa5d9))

## [1.12.0](https://github.com/t1nyb0x/discord-twitter-embed-rx/compare/v1.11.0...v1.12.0) (2025-08-03)


### Features

* ツイートが入ったメッセージの削除時にそこに紐づいたBot送信内容を削除する ([2153785](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/2153785fb284dacf5e803253e3fc09fefda367a5))
* ツイートが入ったメッセージの削除時にそこに紐づいたBot送信内容を削除する ([d4c22c6](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/d4c22c6d7a758ee4384364ef1c76de30d0fddf3c))
* 入力中を表示するようにした ([4e59b68](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/4e59b68a80bf72a903244c717fdae1652d975178))


### Bug Fixes

* Content-Length取得失敗時はファイルサイズ上限を超えたものとして扱う ([85232ce](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/85232ce401727f6ea16bd919c3d58b86283f3c0f))
* **deps:** update dependency @discordjs/builders to v1.11.2 ([3c0ad0b](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/3c0ad0b55cff281c282d2f96dd3e75e922a8284e))
* **deps:** update dependency axios to v1.10.0 ([238ed68](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/238ed68231fb0eb5f2bdc737f08cb1d7c0239b9c))
* **deps:** update dependency axios to v1.10.0 ([6036a13](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/6036a13a1d0cf3ef10f40f90ff335860c47634df))
* **deps:** update dependency axios to v1.8.2 ([eb3d6b3](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/eb3d6b32736a508a36eec43f3aa65ffaf0836f3b))
* **deps:** update dependency axios to v1.8.2 ([753e02b](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/753e02b8e4d4f0d29e73ffbca7c3a7cdfbd4f4b9))
* **deps:** update dependency axios to v1.8.3 ([0388efb](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/0388efb3df9939ab1ac4e6ddae633130c52bb3c6))
* **deps:** update dependency axios to v1.8.3 ([020f411](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/020f41172b12a58cd9b7c4aaad2383eba194de11))
* **deps:** update dependency axios to v1.8.4 ([0b51147](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/0b5114743d154ca4ddc8d59d3f442ee66741f38c))
* **deps:** update dependency axios to v1.8.4 ([0012b72](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/0012b722ff001488a83d24e6d9f1618dc4f23a59))
* **deps:** update dependency axios to v1.9.0 ([935c9d6](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/935c9d6480df4b76b034d371841556bee724232a))
* **deps:** update dependency discord.js to v14.19.3 ([9025d2d](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/9025d2d8489f0f51d19c955c131cbbaa6e0bed4d))
* **deps:** update dependency discord.js to v14.21.0 ([f028e49](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/f028e499ce0f86e39f22c6b0effdfb7937204566))
* **deps:** update dependency discord.js to v14.21.0 ([f0a605e](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/f0a605e3662d4b2c1c5b0ac540fbf82328ae3923))
* dockerfile ([a23f6e1](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/a23f6e1eaf77d7eb107cd734e5f45ba78758cffc))
* dockerfile ([f361776](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/f361776314fbb800db533369177bbeab3bc22061))
* TweetServiceのメソッドを明示的にreturnするように変更 ([6d48a21](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/6d48a21c5ab8bdef10caa8428c0bd0c8984d1292))
* 入力中表示タイミングを変更 ([cace33f](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/cace33f8aa3fd4290bd161757811ceb75fba5af5))
* 入力中表示タイミングを変更 ([d238d4f](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/d238d4f6dbffe3544d214189d20333f6bc093efc))
* 画像も投稿されてしまう問題を修正 ([e024ff9](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/e024ff91ba690cb4d4445b8fadd4ee99d4b97d2f))

## [1.11.0](https://github.com/t1nyb0x/discord-twitter-embed-rx/compare/v1.10.0...v1.11.0) (2025-03-01)


### Features

* 入力中を表示するようにした ([4e59b68](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/4e59b68a80bf72a903244c717fdae1652d975178))


### Bug Fixes

* Content-Length取得失敗時はファイルサイズ上限を超えたものとして扱う ([85232ce](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/85232ce401727f6ea16bd919c3d58b86283f3c0f))
* dockerfile ([f361776](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/f361776314fbb800db533369177bbeab3bc22061))
* TweetServiceのメソッドを明示的にreturnするように変更 ([6d48a21](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/6d48a21c5ab8bdef10caa8428c0bd0c8984d1292))
* 画像も投稿されてしまう問題を修正 ([e024ff9](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/e024ff91ba690cb4d4445b8fadd4ee99d4b97d2f))

## [1.10.0](https://github.com/t1nyb0x/discord-twitter-embed-rx/compare/v1.9.3...v1.10.0) (2025-02-28)


### Features

* 入力中を表示するようにした ([4e59b68](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/4e59b68a80bf72a903244c717fdae1652d975178))


### Bug Fixes

* Content-Length取得失敗時はファイルサイズ上限を超えたものとして扱う ([85232ce](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/85232ce401727f6ea16bd919c3d58b86283f3c0f))
* TweetServiceのメソッドを明示的にreturnするように変更 ([6d48a21](https://github.com/t1nyb0x/discord-twitter-embed-rx/commit/6d48a21c5ab8bdef10caa8428c0bd0c8984d1292))

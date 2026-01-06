import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Message,
  EmbedBuilder,
} from "discord.js";
import { DiscordEmbedBuilder } from "./EmbedBuilder";
import { ITwitterAdapter } from "@/adapters/twitter/BaseTwitterAdapter";
import { Tweet } from "@/core/models/Tweet";
import { MediaHandler } from "@/core/services/MediaHandler";
import { TweetProcessor } from "@/core/services/TweetProcessor";
import { IReplyLogger } from "@/db/replyLogger";

export interface IFileManager {
  createTempDirectory(): Promise<string>;
  createDirectory(dirPath: string): Promise<string>;
  removeTempDirectory(dir: string): Promise<void>;
  listFiles(dir: string): Promise<string[]>;
}

export interface IVideoDownloader {
  download(url: string, outputPath: string): Promise<void>;
}

/**
 * Discordメッセージハンドラー
 * ツイートURLを含むメッセージを処理してEmbedを返信
 */
export class MessageHandler {
  constructor(
    private readonly processor: TweetProcessor,
    private readonly twitterAdapter: ITwitterAdapter,
    private readonly embedBuilder: DiscordEmbedBuilder,
    private readonly mediaHandler: MediaHandler,
    private readonly fileManager: IFileManager,
    private readonly videoDownloader: IVideoDownloader,
    private readonly replyLogger: IReplyLogger,
    private readonly tmpDirBase: string
  ) {}

  /**
   * メッセージを処理してツイートEmbedを返信
   * @param client Discordクライアント
   * @param message 受信メッセージ
   */
  async handleMessage(client: Client, message: Message): Promise<void> {
    // ボットメッセージや自身のメッセージは無視
    if (this.shouldIgnore(client, message)) {
      return;
    }

    // URLを抽出
    const urls = this.processor.extractUrls(message.content);
    if (urls.length === 0) {
      return;
    }

    // タイピングインジケーターを表示
    if (message.channel.type === ChannelType.GuildText) {
      await message.channel.sendTyping();
    }

    // スポイラータグの有無で分類
    const { spoiler, normal } = this.processor.categorizeBySpoiler(urls, message.content);

    // 元メッセージの埋め込みを抑制
    await message.suppressEmbeds(true);

    // 通常URLの処理
    await this.processUrls(client, message, normal, false);

    // スポイラーURLの処理
    await this.processUrls(client, message, spoiler, true);
  }

  /**
   * メッセージを無視すべきか判定
   * @param client Discordクライアント
   * @param message メッセージ
   * @returns 無視すべき場合true
   */
  private shouldIgnore(client: Client, message: Message): boolean {
    return message.author.bot || message.author.id === client.user?.id;
  }

  /**
   * URLリストを処理
   * @param client Discordクライアント
   * @param message 元メッセージ
   * @param urls URL配列
   * @param isSpoiler スポイラーかどうか
   */
  private async processUrls(client: Client, message: Message, urls: string[], isSpoiler: boolean): Promise<void> {
    for (const url of urls) {
      try {
        await this.processSingleUrl(client, message, url, isSpoiler);
      } catch (error) {
        console.error(`Failed to process URL ${url}:`, error);
        const replyMessage = await message.reply({
          content: "ツイートの処理中にエラーが発生しました。",
          allowedMentions: { repliedUser: false },
        });
        await this.replyLogger.logReply(message.id, {
          replyId: replyMessage.id,
          channelId: message.channelId,
        });
      }
    }
  }

  /**
   * 単一URLを処理
   * @param client Discordクライアント
   * @param message 元メッセージ
   * @param url ツイートURL
   * @param isSpoiler スポイラーかどうか
   */
  private async processSingleUrl(client: Client, message: Message, url: string, isSpoiler: boolean): Promise<void> {
    // ツイートデータを取得
    const tweet = await this.twitterAdapter.fetchTweet(url);

    if (!tweet) {
      const replyMessage = await message.reply({
        content: "ツイートの取得に失敗しました。",
        allowedMentions: { repliedUser: false },
      });
      await this.replyLogger.logReply(message.id, {
        replyId: replyMessage.id,
        channelId: message.channelId,
      });
      return;
    }

    // Embedを作成
    const embeds = this.embedBuilder.build(tweet);

    // スポイラーの場合はボタン付きで送信（メディアは直接投稿しない）
    if (isSpoiler) {
      await this.sendSpoilerMessage(client, message, embeds, tweet);
    } else {
      // 通常の場合のみメディアを処理
      if (tweet.media.length > 0) {
        await this.handleMedia(message, tweet, false);
      }
      const replyMessage = await message.reply({
        embeds,
        allowedMentions: { repliedUser: false },
      });
      await this.replyLogger.logReply(message.id, {
        replyId: replyMessage.id,
        channelId: message.channelId,
      });
    }
  }

  /**
   * スポイラーメッセージを送信
   * @param client Discordクライアント
   * @param message 元メッセージ
   * @param embeds Embed配列
   * @param tweet ツイートデータ
   */
  private async sendSpoilerMessage(
    client: Client,
    message: Message,
    embeds: EmbedBuilder[],
    tweet: Tweet
  ): Promise<void> {
    const button = new ButtonBuilder()
      .setCustomId(`reveal_spoiler_${message.id}`)
      .setLabel("ネタバレを見る")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const replyMessage = await message.reply({
      content: "これはネタバレです",
      allowedMentions: { repliedUser: false },
      components: [row],
    });

    await this.replyLogger.logReply(message.id, {
      replyId: replyMessage.id,
      channelId: message.channelId,
    });

    // ボタンクリックイベントを登録
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton()) return;
      if (interaction.customId !== `reveal_spoiler_${message.id}`) return;

      // エフェメラルで応答を遅延（動画ダウンロード中の待機用）
      await interaction.deferReply({ ephemeral: true });

      try {
        // 動画をダウンロードしてエフェメラルで送信
        const { attachments, largeVideoUrls } = await this.downloadMediaForSpoiler(tweet);

        // 大きすぎるファイルのURLをcontentに含める
        const content =
          largeVideoUrls.length > 0 ? `ファイルサイズが大きいためURLで表示:\n${largeVideoUrls.join("\n")}` : undefined;

        await interaction.editReply({
          content,
          embeds,
          files: attachments,
          allowedMentions: { repliedUser: false },
        });
      } catch (error) {
        console.error("Error revealing spoiler:", error);
        await interaction.editReply({
          content: "コンテンツの取得に失敗しました。",
          embeds,
          allowedMentions: { repliedUser: false },
        });
      }
    });
  }

  /**
   * スポイラー用にメディアをダウンロードしてAttachmentBuilderを作成
   * @param tweet ツイートデータ
   * @returns AttachmentBuilder配列と大きすぎるファイルのURL配列
   */
  private async downloadMediaForSpoiler(
    tweet: Tweet
  ): Promise<{ attachments: AttachmentBuilder[]; largeVideoUrls: string[] }> {
    const uniqueTmpDir = path.join(this.tmpDirBase, randomUUID());
    const attachments: AttachmentBuilder[] = [];

    try {
      await this.fileManager.createDirectory(uniqueTmpDir);

      // ファイルサイズでフィルタリング
      const { downloadable, tooLarge } = await this.mediaHandler.filterBySize(tweet.media);

      // ダウンロード可能な動画を処理
      const videos = this.mediaHandler.filterVideos(downloadable);
      await this.downloadVideos(videos, uniqueTmpDir);

      // ダウンロードしたファイルからAttachmentBuilderを作成
      const files = await this.fileManager.listFiles(uniqueTmpDir);
      for (const file of files) {
        const filePath = path.join(uniqueTmpDir, file);
        attachments.push(new AttachmentBuilder(filePath, { name: file }));
      }

      // 大きすぎるファイルのURLを収集
      const largeVideos = this.mediaHandler.filterVideos(tooLarge);
      const largeVideoUrls = largeVideos.map((v) => v.url);

      return { attachments, largeVideoUrls };
    } finally {
      // 一時ディレクトリを削除（AttachmentBuilderがファイルを読み込んだ後）
      // 注意: discord.jsはファイルパスから直接読み込むので、送信前に削除するとエラーになる
      // そのため、ここでは削除せず、少し待ってから削除する
      setTimeout(async () => {
        try {
          await this.fileManager.removeTempDirectory(uniqueTmpDir);
        } catch (error) {
          console.error("Error removing temp directory:", error);
        }
      }, 30000); // 30秒後に削除
    }
  }

  /**
   * メディアを処理（動画のダウンロードと送信）
   * @param message 元メッセージ
   * @param tweet ツイートデータ
   * @param isSpoiler スポイラーかどうか
   */
  private async handleMedia(message: Message, tweet: Tweet, isSpoiler: boolean): Promise<void> {
    const uniqueTmpDir = path.join(this.tmpDirBase, randomUUID());

    try {
      // 一時ディレクトリを作成（ユニークなパスで）
      await this.fileManager.createDirectory(uniqueTmpDir);

      // ファイルサイズでフィルタリング
      const { downloadable, tooLarge } = await this.mediaHandler.filterBySize(tweet.media);

      // ダウンロード可能な動画を処理
      const videos = this.mediaHandler.filterVideos(downloadable);
      await this.downloadVideos(videos, uniqueTmpDir);

      // ダウンロードしたファイルを送信
      const files = await this.fileManager.listFiles(uniqueTmpDir);
      if (files.length > 0) {
        await this.sendMediaAttachments(message, uniqueTmpDir, files, isSpoiler);
      }

      // 大きすぎるファイルはURLを送信
      const largeVideos = this.mediaHandler.filterVideos(tooLarge);
      for (const video of largeVideos) {
        if (message.channel.type === ChannelType.GuildText) {
          await message.channel.send(video.url);
        }
      }
    } catch (error) {
      console.error("Error handling media:", error);
      if (message.channel.type === ChannelType.GuildText) {
        await message.channel.send("ファイルの送信に失敗しました");
      }
    } finally {
      // 一時ディレクトリを削除
      await this.fileManager.removeTempDirectory(uniqueTmpDir);
    }
  }

  /**
   * 動画をダウンロード
   * @param videos 動画メディア配列
   * @param tmpDir 一時ディレクトリ
   */
  private async downloadVideos(videos: Tweet["media"], tmpDir: string): Promise<void> {
    await Promise.all(
      videos.map(async (video, index) => {
        const outputPath = path.join(tmpDir, `output${index + 1}.mp4`);
        try {
          console.log("start download...");
          await this.videoDownloader.download(video.url, outputPath);
          console.log(`download completed: output${index + 1}.mp4`);
        } catch (error) {
          console.error(`Download error: ${error}`);
        }
      })
    );
  }

  /**
   * メディアファイルをアタッチメントとして送信
   * @param message 元メッセージ
   * @param dir ディレクトリパス
   * @param files ファイル名配列
   * @param isSpoiler スポイラーかどうか
   */
  private async sendMediaAttachments(
    message: Message,
    dir: string,
    files: string[],
    isSpoiler: boolean
  ): Promise<void> {
    if (files.length === 0) return;

    const attachments = files.map((file) => {
      const filePath = path.join(dir, file);
      const name = isSpoiler ? "SPOILER_mediaFile.mp4" : "mediaFile.mp4";
      return new AttachmentBuilder(filePath, { name });
    });

    if (message.channel.type === ChannelType.GuildText) {
      await message.channel.send({ files: attachments });
    }
  }
}

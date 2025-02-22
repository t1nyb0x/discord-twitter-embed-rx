import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AttachmentBuilder, ChannelType, Message } from "discord.js";
import { ROOT_DIR } from "@/config/config";
import { PostEmbed } from "@/discord/postEmbed";
import { getTweetData } from "@/shared/wrapper";
import { downloadVideo } from "@/utils/downloadVideo";

const TWITTER_URL_REGEX = /https:\/\/(x|twitter)\.com\/[A-Za-z_0-9]+\/status\/[0-9]+/g;
const postEmbed = new PostEmbed();
const tmpDir = "tmp";
const uniqueArr = <T>(arr: T[]): T[] => [...new Set(arr)];

export class TweetService {
  /**
   * ツイート（ポスト）URLを処理する
   *
   * @param m Message
   * @returns Promise<void>
   */
  async handleTweetURLs(m: Message) {
    // https://twitter.com(or x.com)/hogehoge/{postID}かチェック
    const matchRes = m.content.match(TWITTER_URL_REGEX);
    if (!matchRes) return;

    // 配列内部の重複を除去する
    const postURLs = uniqueArr(matchRes);
    if (!postURLs.length) return;

    // 埋め込みメッセージを送信する
    for (const postURL of postURLs) {
      await this.sendEmbedMessage(m, postURL);
    }
  }

  /**
   * ツイート（ポスト）の情報を埋め込みメッセージでDiscordに送信する
   *
   * @param m Message
   * @param postURL string
   * @returns Promise<void>
   */
  private async sendEmbedMessage(m: Message, postURL: string) {
    const tweetData = await getTweetData(postURL);
    if (!tweetData) {
      await m.reply("ツイートの取得に失敗しました。");
      return;
    }

    // 投稿されたポストの埋め込みを削除する
    await m.suppressEmbeds(true);

    // mediaURLが存在する場合は一時ディレクトリ作成
    if (tweetData.mediaUrls) {
      const uniqueTmpDir = path.join(path.dirname(ROOT_DIR), tmpDir, randomUUID());
      try {
        await fs.mkdir(uniqueTmpDir, { recursive: true });
        console.log(`Temporary directory created: ${uniqueTmpDir}`);
        await this.downloadMedia(m, tweetData.mediaUrls, uniqueTmpDir);
      } catch (e) {
        console.error(`Error sending file: ${e}`);
        if (m.channel.type === ChannelType.GuildText) {
          await m.channel.send("ファイルの送信に失敗しました");
          await m.channel.send(`${e}`);
        }
      } finally {
        // 処理が終わったらリクエストごとの一時ディレクトリを削除
        try {
          await fs.rm(uniqueTmpDir, { recursive: true });
          console.log(`Temporary directory removed: ${uniqueTmpDir}`);
        } catch (err) {
          console.error(`Failed to remove temp directory: ${err}`);
        }
      }
    }

    // 埋め込みデータ生成
    const embedPostInfo = postEmbed.createEmbed(tweetData);

    await m.reply({ embeds: embedPostInfo });
  }

  /**
   * 動画データをダウンロードする
   *
   * @param m Message
   * @param mediaUrls string[]
   * @param uniqueTmpDir string
   * @returns Promise<void>
   */
  private async downloadMedia(m: Message, mediaUrls: string[], uniqueTmpDir: string) {
    // 動画ポストをダウンロード
    await Promise.all(
      mediaUrls
        .filter((url) => /\.mp4$/.test(url))
        .map((url, index) => {
          console.log("start download...");
          return downloadVideo(url, path.join(uniqueTmpDir, `/output${index + 1}.mp4`))
            .then(() => console.log(`download completed: output${index + 1}.mp4`))
            .catch((error) => console.error(`Download error: ${error}`));
        })
    );
    // ディレクトリからファイルを取得
    const files = await fs.readdir(uniqueTmpDir);
    // mp4ファイルがある場合は送信
    if (files.length) {
      await this.sendMediaAttachment(m, uniqueTmpDir, files);
    }
  }

  /**
   * 動画データをアタッチメントで送信する
   *
   * @param m Message
   * @param dir string
   * @param files string[]
   * @returns Promise<void>
   */
  private async sendMediaAttachment(m: Message, dir: string, files: string[]) {
    // mp4ファイルがある場合は送信
    if (files.length) {
      const attachments = files.map((file) => {
        const filePath = path.join(dir, file);
        return new AttachmentBuilder(filePath, { name: "mediaFile.mp4" });
      });
      if (m.channel.type === ChannelType.GuildText) {
        await m.channel.send({
          files: attachments,
        });
      }
    }
  }
}

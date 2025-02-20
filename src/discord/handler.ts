import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Message, Client, ChannelType, AttachmentBuilder } from "discord.js";
import { getTweetData } from "../shared/wrapper";
import { downloadVideo } from "../utils/downloadVideo";
import { PostEmbed } from "./postEmbed";

const TWITTER_URL_REGEX = /https:\/\/(x|twitter)\.com\/[A-Za-z_0-9]+\/status\/[0-9]+/g;
const postEmbed = new PostEmbed();
const tmpDir = "./tmp";
const uniqueArr = <T>(arr: T[]): T[] => [...new Set(arr)];

export async function onMessageCreate(client: Client<boolean>, m: Message) {
  if ((client.user !== null && m.author.id === client.user.id) || m.author.bot) return;

  // https://twitter.com(or x.com)/hogehoge/{postID}かチェック
  const matchRes = m.content.match(TWITTER_URL_REGEX);

  if (!matchRes) return;

  // 配列内部の重複を除去する
  const postURLs = uniqueArr(matchRes);

  if (postURLs.length === 0) return;

  for (const postURL of postURLs) {
    const tweetData = await getTweetData(postURL);
    if (!tweetData) {
      await m.reply("ツイートの取得に失敗しました。");
      return;
    }
    // 投稿されたポストの埋め込みを削除する
    await m.suppressEmbeds(true);

    // 一時ディレクトリ作成
    const uniqueTmpDir = path.join(tmpDir, randomUUID());

    try {
      await fs.mkdir(uniqueTmpDir, { recursive: true });

      try {
        await Promise.all(
          (tweetData.mediaUrls ?? [])
            .filter((url) => /\.mp4$/.test(url))
            .map(async (url, index) => {
              console.log("start download...");
              await downloadVideo(url, path.join(uniqueTmpDir, `/output${index + 1}.mp4`));
              console.log("download completed!");
            })
        );
      } catch (error) {
        console.error(`Error!: ${error}`);
      }
      // ディレクトリからファイルを取得
      const files = await fs.readdir(uniqueTmpDir);
      // mp4ファイルがある場合は送信
      if (files.length) {
        const attachments = files.map((file) => {
          const filePath = path.join(uniqueTmpDir, file);
          return new AttachmentBuilder(filePath, { name: "mediaFile.mp4" });
        });
        if (m.channel.type === ChannelType.GuildText) {
          await m.channel.send({
            files: attachments,
          });
        }
      }
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

    // 埋め込みデータ生成
    const embedPostInfo = postEmbed.createEmbed(tweetData);

    await m.reply({ embeds: embedPostInfo });
  }
}

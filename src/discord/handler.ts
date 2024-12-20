import fs from "node:fs/promises";
import path from "node:path";
import { Message, Client, ChannelType, AttachmentBuilder } from "discord.js";
import { getTweetData } from "../shared/wrapper";
import { downloadVideo } from "../utils/downloadVideo";
import { PostEmbed } from "./postEmbed";

const TWITTER_URL_REGEX = /https:\/\/(x|twitter)\.com\/[A-Za-z_0-9]+\/status\/[0-9]+/g;
const postEmbed = new PostEmbed();
const tmpDir = "./tmp";

export async function onMessageCreate(client: Client<boolean>, m: Message) {
  if ((client.user !== null && m.author.id === client.user.id) || m.author.bot) return;

  // https://twitter.com(or x.com)/hogehoge/{postID}かチェック
  const matchRes = m.content.match(TWITTER_URL_REGEX);
  if (matchRes) {
    for (const i in matchRes) {
      const tweetData = await getTweetData(matchRes[i]);
      if (tweetData == undefined) {
        await m.reply("ツイートの取得に失敗しました。");
        return;
      }
      // 投稿されたポストの埋め込みを削除する
      await m.suppressEmbeds(true);

      // 一時ディレクトリ作成
      await fs.mkdir(tmpDir);

      await downloadMedia(tweetData.mediaUrls);

      // ディレクトリからファイルを取り出し、AttachBuilderへ渡す
      try {
        const files = await fs.readdir(tmpDir);

        // mp4ファイルがない場合はスキップする
        if (files.length !== 0) {
          const attachments = files.map((file) => {
            const filePath = path.join(tmpDir, file);
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
      }

      // 埋め込みデータ生成
      const embedPostInfo = postEmbed.createEmbed(tweetData);

      if (m.channel.type === ChannelType.GuildText) {
        await m.channel.send({ embeds: embedPostInfo });
      }
      // 一時ディレクトリ削除
      await fs.rm(tmpDir, { recursive: true });
    }
  }
}

/**
 * メディアデータをURLからダウンロードする
 * @param mediaUrls string | undefined
 * @returns void
 */
async function downloadMedia(mediaUrls?: string[]): Promise<void> {
  let cnt = 1;
  // mp4がある場合はダウンロードする
  for (const url of mediaUrls ?? []) {
    if (/\.mp4$/.test(url)) {
      try {
        console.log("start download...");
        await downloadVideo(url, tmpDir + `/output${cnt}.mp4`);
        console.log("download completed!");
      } catch (error) {
        console.error(`Error!: ${error}`);
      }
      cnt++;
    }
  }
  return;
}

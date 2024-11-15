import { Message, Client, ChannelType } from "discord.js";
import { PostEmbed } from "../postEmbed";
import { getTweetData } from "../shared/wrapper";

const TWITTER_URL_REGEX = /https:\/\/(x|twitter)\.com\/[A-Za-z_0-9]+\/status\/[0-9]+/g;
const postEmbed = new PostEmbed();

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

      const embedPostInfo = postEmbed.createEmbed(tweetData);
      if (m.channel.type === ChannelType.GuildText) {
        await m.channel.send({ embeds: embedPostInfo });
      }
    }
  }
}

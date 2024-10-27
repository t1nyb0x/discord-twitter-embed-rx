import { Client, Message, GatewayIntentBits, ChannelType } from "discord.js";
import { PostEmbed } from "./postEmbed";
import { VxTwitterApi } from "./vxtwitter/api";

const ENV = process.env.ENVIRONMENT;

let token: string | undefined;

switch (ENV) {
  case "production":
    token = process.env.PRODUCTION_TOKEN;
    break;
  case "develop":
    token = process.env.DEVELOP_TOKEN;
    break;
}

if (token === undefined) throw new Error("Failed load discord token.");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.login(token);

client.on("ready", async () => {
  if (client.user === null) {
    throw new Error("Failed load client");
  }
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (m: Message) => {
  if ((client.user !== null && m.author.id === client.user.id) || m.author.bot) return;

  // https://twitter.com(or x.com)/hogehoge/{postID}かチェック
  const matchRes = m.content.match(/https:\/\/(x|twitter)\.com\/[A-Za-z_0-9]+\/status\/[0-9]+/g);
  if (matchRes) {
    // /x or /twitterを/api.vxtwitterに置き換え
    const vxUrl = matchRes.map((t: string) => t.replace(/\/(x|twitter)/, "/api.vxtwitter"));

    vxUrl.forEach(async (url: string) => {
      const vxTwitterApi = new VxTwitterApi();
      const postInfo = await vxTwitterApi.getPostInformation(url);

      // 元URLの埋め込みを削除する
      await m.suppressEmbeds(true);

      const postEmbed = new PostEmbed();

      const embedPostInfo = postEmbed.createEmbed(postInfo);
      if (m.channel.type === ChannelType.GuildText) {
        await m.channel.send({ embeds: embedPostInfo });
      }
    });
  }
});

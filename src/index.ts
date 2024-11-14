import { Client, Message, GatewayIntentBits, ChannelType } from "discord.js";
import { PostEmbed } from "./postEmbed";
import { getTweetData } from "./shared/wrapper";

const ENV = process.env.ENVIRONMENT;

let token: string | undefined;

const postEmbed = new PostEmbed();

const TWITTER_URL_REGEX = /https:\/\/(x|twitter)\.com\/[A-Za-z_0-9]+\/status\/[0-9]+/g;

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
  const matchRes = m.content.match(TWITTER_URL_REGEX);
  if (matchRes) {
    for (const i in matchRes) {
      const tweetData = await getTweetData(matchRes[i]);
      if (tweetData == undefined) {
        await m.reply("ツイートの取得に失敗しました。");
        return;
      }

      const embedPostInfo = postEmbed.createEmbed(tweetData);
      if (m.channel.type === ChannelType.GuildText) {
        await m.channel.send({ embeds: embedPostInfo });
      }
    }
  }
});

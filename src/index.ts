import dotenv from "dotenv";
import { Client, Message, GatewayIntentBits } from "discord.js";

dotenv.config();
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

  const matchRes = m.content.match(/https:\/\/(x|twitter)\.com\/[A-Za-z_0-9]+\/status\/[0-9]+/g);
  if (matchRes) {
    const vxurl = matchRes.map((t) => t.replace(/\/(x|twitter)/, "/vxtwitter")).join("\n");
    m.channel.send(vxurl);
  }
});

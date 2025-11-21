import fs from "node:fs";
import path from "node:path";
import { Client, GatewayIntentBits, Message, Partials } from "discord.js";
import config, { ROOT_DIR } from "./config/config";
import { connectRedis } from "./db/connect";
import { deleteReply, popReply } from "./db/replyLogger";
import { DiscordEmbedBuilder } from "@/adapters/discord/EmbedBuilder";
import { MessageHandler } from "@/adapters/discord/MessageHandler";
import { TwitterAdapter } from "@/adapters/twitter/TwitterAdapter";
import { MediaHandler } from "@/core/services/MediaHandler";
import { TweetProcessor } from "@/core/services/TweetProcessor";
import { RedisReplyLogger } from "@/infrastructure/db/RedisReplyLogger";
import { FileManager } from "@/infrastructure/filesystem/FileManager";
import { HttpClient } from "@/infrastructure/http/HttpClient";
import { VideoDownloader } from "@/infrastructure/http/VideoDownloader";

enum ApplicationMode {
  Production = "production",
  Development = "development",
}

const ENV = process.env.NODE_ENV;

const packageJson = JSON.parse(fs.readFileSync(path.join(path.dirname(ROOT_DIR), "/package.json"), "utf8"));
const version = packageJson.version;

// === Application Mode === // Todo export to other file
let appMode: ApplicationMode = ApplicationMode.Production;
switch (ENV) {
  case "production":
    appMode = ApplicationMode.Production;
    break;
  case "develop":
    appMode = ApplicationMode.Development;
    break;
}
console.log(`Mode: ${appMode}`);
console.log(`Version: ${version}`);

// === Load bot token from environ variable ===
let token: string | undefined;
switch (appMode) {
  case ApplicationMode.Production:
    token = process.env.PRODUCTION_TOKEN;
    break;
  case ApplicationMode.Development:
    token = process.env.DEVELOP_TOKEN;
    break;
}

// === Check token was successfully to load ===
if (token === undefined) {
  throw new Error(`Failed load discord token. Mode: ${appMode}`);
} else {
  console.log("Successfully to load discord bot token.");
}

// === Dependency Injection Setup ===
const tmpDir = path.join(path.dirname(ROOT_DIR), "tmp");

// Infrastructure層
const httpClient = new HttpClient();
const fileManager = new FileManager(tmpDir);
const videoDownloader = new VideoDownloader();
const replyLogger = new RedisReplyLogger();

// Core層
const tweetProcessor = new TweetProcessor();
const mediaHandler = new MediaHandler(httpClient, config.MEDIA_MAX_FILE_SIZE);

// Adapter層
const twitterAdapter = TwitterAdapter.createDefault();
const embedBuilder = new DiscordEmbedBuilder();
const messageHandler = new MessageHandler(
  tweetProcessor,
  twitterAdapter,
  embedBuilder,
  mediaHandler,
  fileManager,
  videoDownloader,
  replyLogger,
  tmpDir
);

// === Create discord bot client ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageTyping,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// === Event handlers ===
// On ready
client.on("clientReady", async () => {
  if (client.user === null) {
    throw new Error("Failed load client");
  }
  console.log(`Logged in as ${client.user.tag}`);

  updateStatus();

  // update per 5 min.
  setInterval(updateStatus, 5 * 60 * 1000);
});

// On Message Create
client.on("messageCreate", (m: Message) => {
  messageHandler.handleMessage(client, m).catch((error) => {
    console.error("Error handling message:", error);
  });
});

// On Message Delete
client.on("messageDelete", async (m) => {
  const message = m as Message;
  const replyData = await popReply(message.id);
  if (!replyData) return;
  const { replyId, channelId } = replyData;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    const botMsg = await channel.messages.fetch(replyId);
    if (botMsg) await botMsg.delete();
    await deleteReply(message.id);
  } catch (err) {
    console.error(`Failed to delete message:`, err);
  }
});

// === Login ===
client.login(token);
connectRedis();

const updateStatus = () => {
  const serverCount = client.guilds.cache.size;
  client.user?.setActivity(`v${version}, 導入サーバー数: ${serverCount}`);
};

import fs from "node:fs";
import path from "node:path";
import { Client, GatewayIntentBits, Message, Partials } from "discord.js";
import { ROOT_DIR } from "./config/config";
import { connectRedis } from "./db/connect";
import { onMessageCreate, onMessageDelete } from "@/discord/handler";

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
client.on("ready", async () => {
  if (client.user === null) {
    throw new Error("Failed load client");
  }
  console.log(`Logged in as ${client.user.tag}`);

  updateStatus();

  // update per 5 min.
  setInterval(updateStatus, 5 * 60 * 1000);
});

// On Message Create
client.on("messageCreate", (m: Message) => onMessageCreate(client, m));
// On Message Delete
client.on("messageDelete", (m) => onMessageDelete(client, m as Message));

// === Login ===
client.login(token);
connectRedis();

const updateStatus = () => {
  const serverCount = client.guilds.cache.size;
  client.user?.setActivity(`v${version}, 導入サーバー数: ${serverCount}`);
};

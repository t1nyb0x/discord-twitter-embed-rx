import { Client, GatewayIntentBits, Message } from "discord.js";
import { onMessageCreate } from "./discord/handler";

enum ApplicationMode {
  Production = "production",
  Development = "development",
}

const ENV = process.env.NODE_ENV;

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
  ],
});

// === Event handlers ===
// On ready
client.on("ready", async () => {
  if (client.user === null) {
    throw new Error("Failed load client");
  }
  console.log(`Logged in as ${client.user.tag}`);
});

// On Message Create
client.on("messageCreate", (m: Message) => onMessageCreate(client, m));

// === Login ===
client.login(token);

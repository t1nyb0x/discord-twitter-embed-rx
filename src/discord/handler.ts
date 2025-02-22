import { Message, Client } from "discord.js";
import { TweetService } from "@/services/TweetService";

export async function onMessageCreate(client: Client<boolean>, m: Message) {
  if ((client.user !== null && m.author.id === client.user.id) || m.author.bot) return;

  const tweetService = new TweetService();
  tweetService.handleTweetURLs(m);
}

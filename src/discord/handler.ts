import { Message, Client, ChannelType } from "discord.js";
import { TweetService } from "@/services/TweetService";

export async function onMessageCreate(client: Client<boolean>, m: Message) {
  if ((client.user !== null && m.author.id === client.user.id) || m.author.bot) return;

  if (m.channel.type === ChannelType.GuildText) {
    m.channel.sendTyping();
  }

  // 5秒ごとに入力中を表示
  const typingInterval = setInterval(async () => {
    if (m.channel.type === ChannelType.GuildText) {
      m.channel.sendTyping();
    }
  }, 5000);

  try {
    const tweetService = new TweetService();
    await tweetService.handleTweetURLs(client, m);
  } finally {
    clearInterval(typingInterval);
  }
  return;
}

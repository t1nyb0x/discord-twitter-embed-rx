import { Message, Client } from "discord.js";
import { deleteReply, popReply } from "@/db/replyLogger";
import { TweetService } from "@/services/TweetService";

export async function onMessageCreate(client: Client<boolean>, m: Message) {
  if ((client.user !== null && m.author.id === client.user.id) || m.author.bot) return;

  const tweetService = new TweetService();
  await tweetService.handleTweetURLs(client, m);
  return;
}

export async function onMessageDelete(client: Client<boolean>, m: Message) {
  const replyData = await popReply(m.id);
  if (!replyData) return;
  const { replyId, channelId } = replyData;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    const botMsg = await channel.messages.fetch(replyId);
    if (botMsg) await botMsg.delete();
    await deleteReply(m.id);
  } catch (err) {
    console.error(`Failed to delete message:`, err);
  }
}

import { Message, Client } from "discord.js";
import { TweetService } from "@/services/TweetService";

export async function onMessageCreate(
  client: Client<boolean>,
  m: Message,
  replyMap: Map<string, { replyId: string; channelId: string }>
) {
  if ((client.user !== null && m.author.id === client.user.id) || m.author.bot) return;

  const tweetService = new TweetService();
  await tweetService.handleTweetURLs(client, m, replyMap);
  return;
}

export async function onMessageDelete(
  client: Client<boolean>,
  m: Message,
  replyMap: Map<string, { replyId: string; channelId: string }>
) {
  // if (m.author.bot) return;
  // 削除イベントのmessageがキャッシュされてなければpartialとして扱う
  if (!replyMap?.has(m.id)) return;

  const replyData = replyMap.get(m.id);
  if (!replyData) return;
  const { replyId, channelId } = replyData;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    const botMsg = await channel.messages.fetch(replyId);
    if (botMsg) await botMsg.delete();
    replyMap.delete(m.id);
  } catch (err) {
    console.error(`Failed to delete message:`, err);
  }
}

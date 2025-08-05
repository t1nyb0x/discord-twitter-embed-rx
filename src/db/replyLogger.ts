import { redis } from "./init";

interface ReplyInfo {
  replyId: string;
  channelId: string;
}

const TTL = process.env.REDIS_TTL ? parseInt(process.env.REDIS_TTL) : 60 * 60 * 24; // 1 day in seconds

export async function logReply(origMsgId: string, info: ReplyInfo) {
  await redis.set(`replymap:${origMsgId}`, JSON.stringify(info), {
    EX: TTL,
  });
}

export async function popReply(origMsgId: string): Promise<ReplyInfo | null> {
  try {
    const json = await redis.get(`replymap:${origMsgId}`);
    if (!json) return null;

    return JSON.parse(json);
  } catch (err) {
    console.error(`Failed to parse reply data for ${origMsgId}:`, err);
    return null;
  }
}

export async function deleteReply(origMsgId: string): Promise<void> {
  await redis.del(`replymap:${origMsgId}`);
}

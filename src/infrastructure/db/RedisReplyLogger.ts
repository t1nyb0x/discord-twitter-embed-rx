import { redis } from "@/db/init";
import { IReplyLogger, ReplyInfo } from "@/db/replyLogger";

/**
 * Redisを使用したReplyLogger実装
 */
export class RedisReplyLogger implements IReplyLogger {
  private readonly ttl: number;

  constructor(ttl?: number) {
    this.ttl = ttl || (process.env.REDIS_TTL ? parseInt(process.env.REDIS_TTL) : 60 * 60 * 24);
  }

  async logReply(origMsgId: string, info: ReplyInfo): Promise<void> {
    await redis.set(`replymap:${origMsgId}`, JSON.stringify(info), {
      EX: this.ttl,
    });
  }

  async addReply(origMsgId: string, replyId: string): Promise<void> {
    const existing = await this.popReply(origMsgId);
    if (existing) {
      existing.replyIds.push(replyId);
      await this.logReply(origMsgId, existing);
    }
  }

  async popReply(origMsgId: string): Promise<ReplyInfo | null> {
    try {
      const json = await redis.get(`replymap:${origMsgId}`);
      if (!json) return null;

      return JSON.parse(json);
    } catch (err) {
      console.error(`Failed to parse reply data for ${origMsgId}:`, err);
      return null;
    }
  }

  async deleteReply(origMsgId: string): Promise<void> {
    await redis.del(`replymap:${origMsgId}`);
  }
}

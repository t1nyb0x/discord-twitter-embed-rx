import { VxTwitter } from "./vxtwitter";
import logger from "@/utils/logger";

export class VxTwitterServerError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "VxTwitterServerError";
  }
}

export class VxTwitterApi {
  async getPostInformation(url: string): Promise<VxTwitter | undefined> {
    const startTime = Date.now();
    logger.debug("VxTwitterApi: Request started", { url });

    try {
      const response = await fetch(url);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        // 500エラーの場合は特別にエラーを投げる（フォールバック用）
        if (response.status === 500) {
          logger.warn("VxTwitterApi: Server error (500), fallback will be attempted", {
            url,
            duration: `${duration}ms`,
          });
          throw new VxTwitterServerError(response.status, `VxTwitter API returned 500 error for ${url}`);
        }

        // 404はツイートが存在しないことを示す正常な応答
        if (response.status === 404) {
          logger.debug("VxTwitterApi: Tweet not found (404)", { url, duration: `${duration}ms` });
        } else if (process.env.NODE_ENV !== "test") {
          logger.error("VxTwitterApi: API request failed", {
            url,
            status: response.status,
            message: response.statusText,
            duration: `${duration}ms`,
          });
        }
        return undefined;
      }

      const data = (await response.json()) as VxTwitter;
      logger.info("VxTwitterApi: Request completed", {
        url,
        statusCode: response.status,
        hasData: !!data,
        duration: `${duration}ms`,
      });
      return data;
    } catch (e) {
      if (e instanceof VxTwitterServerError) {
        throw e;
      }
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV !== "test") {
        logger.error("VxTwitterApi: API request failed", {
          url,
          message: e instanceof Error ? e.message : String(e),
          duration: `${duration}ms`,
        });
      }
      return undefined;
    }
  }
}

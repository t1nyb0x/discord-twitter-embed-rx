import { FXTwitter } from "./fxtwitter";
import logger from "@/utils/logger";

export class FxTwitterApi {
  async getPostInformation(url: string): Promise<FXTwitter | undefined> {
    const startTime = Date.now();
    logger.debug("FxTwitterApi: Request started", { url });

    try {
      const response = await fetch(url);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        // 404はツイートが存在しないことを示す正常な応答
        if (response.status === 404) {
          logger.debug("FxTwitterApi: Tweet not found (404)", { url, duration: `${duration}ms` });
        } else if (process.env.NODE_ENV !== "test") {
          logger.error("FxTwitterApi: API request failed", {
            url,
            status: response.status,
            message: response.statusText,
            duration: `${duration}ms`,
          });
        }
        return undefined;
      }

      const data = (await response.json()) as FXTwitter;
      logger.info("FxTwitterApi: Request completed", {
        url,
        statusCode: response.status,
        hasTweet: !!data?.tweet,
        duration: `${duration}ms`,
      });
      return data;
    } catch (e) {
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV !== "test") {
        logger.error("FxTwitterApi: API request failed", {
          url,
          message: e instanceof Error ? e.message : String(e),
          duration: `${duration}ms`,
        });
      }
      return undefined;
    }
  }
}

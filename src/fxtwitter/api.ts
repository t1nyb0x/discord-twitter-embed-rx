import axios from "axios";
import { FXTwitter } from "./fxtwitter";
import logger from "@/utils/logger";

export class FxTwitterApi {
  async getPostInformation(url: string): Promise<FXTwitter | undefined> {
    const startTime = Date.now();
    logger.debug("FxTwitterApi: Request started", { url });

    try {
      const response = await axios.get(url);
      const duration = Date.now() - startTime;
      logger.info("FxTwitterApi: Request completed", {
        url,
        statusCode: response.status,
        hasTweet: !!response.data?.tweet,
        duration: `${duration}ms`,
      });
      return response.data;
    } catch (e) {
      const duration = Date.now() - startTime;
      // 404はツイートが存在しないことを示す正常な応答
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        if (status === 404) {
          logger.debug("FxTwitterApi: Tweet not found (404)", { url, duration: `${duration}ms` });
        } else if (process.env.NODE_ENV !== "test") {
          logger.error("FxTwitterApi: API request failed", {
            url,
            status,
            message: e.message,
            duration: `${duration}ms`,
          });
        }
      }
      return undefined;
    }
  }
}

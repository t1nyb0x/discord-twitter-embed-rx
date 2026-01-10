import axios from "axios";
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
      const response = await axios.get(url);
      const duration = Date.now() - startTime;
      logger.info("VxTwitterApi: Request completed", {
        url,
        statusCode: response.status,
        hasData: !!response.data,
        duration: `${duration}ms`,
      });
      return response.data;
    } catch (e) {
      const duration = Date.now() - startTime;
      // 404はツイートが存在しないことを示す正常な応答
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;

        // 500エラーの場合は特別にエラーを投げる（フォールバック用）
        if (status === 500) {
          logger.warn("VxTwitterApi: Server error (500), fallback will be attempted", {
            url,
            duration: `${duration}ms`,
          });
          throw new VxTwitterServerError(status, `VxTwitter API returned 500 error for ${url}`);
        }

        if (status === 404) {
          logger.debug("VxTwitterApi: Tweet not found (404)", { url, duration: `${duration}ms` });
        } else if (process.env.NODE_ENV !== "test") {
          logger.error("VxTwitterApi: API request failed", {
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

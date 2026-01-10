import axios from "axios";
import { FXTwitter } from "./fxtwitter";
import logger from "@/utils/logger";

export class FxTwitterApi {
  async getPostInformation(url: string): Promise<FXTwitter | undefined> {
    try {
      return (await axios.get(url)).data;
    } catch (e) {
      // 404はツイートが存在しないことを示す正常な応答
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        if (status !== 404 && process.env.NODE_ENV !== "test") {
          logger.error("FxTwitterApi: API request failed", { status, message: e.message });
        }
      }
      return undefined;
    }
  }
}

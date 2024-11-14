import axios from "axios";
import { FXTwitter } from "./fxtwitter";

export class FxTwitterApi {
  async getPostInformation(url: string): Promise<FXTwitter | undefined> {
    try {
      return await axios.get(url);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}

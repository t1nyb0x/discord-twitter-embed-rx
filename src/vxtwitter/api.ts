import axios from "axios";
import { VxTwitter } from "./vxtwitter";

export class VxTwitterApi {
  async getPostInformation(url: string): Promise<VxTwitter | undefined> {
    try {
      return (await axios.get(url)).data;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}

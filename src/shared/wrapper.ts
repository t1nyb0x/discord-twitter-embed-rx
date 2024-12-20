import { FxTwitterApi } from "../fxtwitter/api";
import { VxTwitterApi } from "../vxtwitter/api";
import { FXToTweetData, VxToTweetData } from "./converter";
import { TweetData } from "./tweetdata";

// Todo change name for readable
const REGEX = /\/(x|twitter)/;

// init instances
const vxTwitterApi = new VxTwitterApi();
const fxTwitterApi = new FxTwitterApi();

function replaceVx(url: string): string {
  return url.replace(REGEX, "/api.vxtwitter");
}

function replaceFx(url: string): string {
  return url.replace(REGEX, "/api.fxtwitter");
}

/**
 * XポストURLをvxTwitter, fxTwitterのAPIに置き換え、取得データをTweetDataに変換する
 * @param url XのURL
 * @returns
 */
export async function getTweetData(url: string): Promise<TweetData | undefined> {
  // Request Priority
  // 1. vxTwitter
  // 2. fxTwitter

  // First try with vxTwitter (Faster)
  const vxUrl = replaceVx(url);
  const vxPostInfo = await vxTwitterApi.getPostInformation(vxUrl);
  if (vxPostInfo != undefined) {
    return VxToTweetData(vxPostInfo);
  }

  // Fallback to fxTwitter (Slower)
  const fxUrl = replaceFx(url);
  const fxPostInfo = await fxTwitterApi.getPostInformation(fxUrl);
  if (fxPostInfo == undefined) {
    // 知らん
    return undefined;
  }
  return FXToTweetData(fxPostInfo.tweet);
}

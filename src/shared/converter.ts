import { Tweet } from "fxtwitter/fxtwitter";
import { VxTwitter } from "vxtwitter/vxtwitter";
import { TweetData } from "./tweetdata";

/**
 * vxTwitterからの返却データをTweetDataに変換する
 * @param data vxTwitterのレスポンスデータ
 * @param depth
 * @returns
 */
export function VxToTweetData(data: VxTwitter, depth: number = 0): TweetData {
  return {
    author: {
      name: data.user_name + "(@" + data.user_screen_name + ")",
      id: data.user_screen_name,
      iconUrl: data.user_profile_image_url,
      url: "https://x.com/" + data.user_screen_name,
    },
    text: data.text,
    likes: data.likes,
    replies: data.replies,
    retweets: data.retweets,
    tweetUrl: data.tweetURL,
    quoteData: data.qrt && depth < 1 ? VxToTweetData(data.qrt, depth + 1) : undefined,
    hasQuote: data.qrt != null,
    mediaUrls: data.mediaURLs,
    mediaUrlsThumbnail: data.mediaURLs.map((_s, i) => (!/\.mp4$/.test(_s) ? _s : data.media_extended[i].thumbnail_url)),
    hasMedia: data.mediaURLs != undefined,
    timestamp: new Date(data.date),
  };
}

/**
 * fxTwitterからの返却データをTweetDataに変換する
 * @param data fxTwitterから返却されたデータ
 * @param depth
 * @returns
 */
export function FXToTweetData(data: Tweet, depth: number = 0): TweetData {
  return {
    author: {
      name: data.author.name + "(@" + data.author.screen_name + ")",
      id: data.author.screen_name,
      iconUrl: data.author.avatar_url,
      url: "https://x.com/" + data.author.id,
    },
    hasMedia: data.media != undefined,
    likes: data.likes,
    replies: data.replies,
    retweets: data.retweets,
    hasQuote: data.quote != undefined,
    text: data.text,
    timestamp: new Date(data.created_at),
    tweetUrl: data.url,
    mediaUrls: data.media != undefined ? data.media.photos.map((p) => p.url) : undefined,
    mediaUrlsThumbnail: data.media != undefined ? data.media.photos.map((p) => p.thumbnail_url) : undefined,
    quoteData: data.quote != undefined && depth < 1 ? FXToTweetData(data.quote, depth + 1) : undefined,
  };
}

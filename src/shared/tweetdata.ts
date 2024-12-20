export interface TweetData {
  tweetUrl: string;
  author: TweetAuthor;
  hasQuote: boolean;
  quoteData: TweetData | undefined;
  text: string;
  replies: number;
  likes: number;
  retweets: number;
  timestamp: Date;
  hasMedia: boolean;
  mediaUrls: string[] | undefined;
  mediaUrlsThumbnail: string[] | undefined;
}

export interface TweetAuthor {
  id: string;
  name: string;
  url: string;
  iconUrl: string;
}

export interface Tweet {
  url: string;
  author: TweetAuthor;
  text: string;
  metrics: TweetMetrics;
  media: TweetMedia[];
  quote?: Tweet;
  timestamp: Date;
}

export interface TweetAuthor {
  id: string;
  name: string;
  url: string;
  iconUrl: string;
}

export interface TweetMetrics {
  replies: number;
  likes: number;
  retweets: number;
}

export interface TweetMedia {
  url: string;
  thumbnailUrl: string;
  type: "photo" | "video";
}

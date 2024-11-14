export interface FXTwitter {
  code: number;
  message: string;
  tweet: Tweet;
}

export interface Tweet {
  url: string;
  id: string;
  text: string;
  author: Author;
  replies: number;
  retweets: number;
  likes: number;
  color: string;
  twitter_card: string;
  created_at: string;
  created_timestamp: number;
  possibly_sensitive: boolean;
  views: number;
  lang: string;
  replying_to: string;
  replying_to_status: string;
  media: Media | undefined;
  source: string;
  quote: Tweet | undefined;
}

export interface Author {
  id: string;
  name: string;
  screen_name: string;
  avatar_url: string;
  avatar_color: string;
  banner_url: string;
}

export interface Media {
  photos: Photo[];
}

export interface Photo {
  type: string;
  url: string;
  width: number;
  height: number;
  altText: string;
}

import { APIEmbedField, EmbedBuilder } from "discord.js";
import { Tweet } from "@/core/models/Tweet";

/**
 * Discord Embed作成を担当
 */
export class DiscordEmbedBuilder {
  private readonly embedColor = 9016025;
  private readonly quotePrefix = "QT: ";
  private readonly br = "\n";

  /**
   * ツイートからDiscord Embedを作成
   * @param tweet ツイートデータ
   * @returns Embed配列
   */
  build(tweet: Tweet): EmbedBuilder[] {
    // メディアがない場合は1つのEmbedのみ
    if (tweet.media.length === 0) {
      return [this.createSingleEmbed(tweet)];
    }

    // メディアがある場合は各サムネイルに対してEmbedを作成
    return tweet.media.map((media) => {
      return this.createSingleEmbed(tweet).setImage(media.thumbnailUrl);
    });
  }

  /**
   * 単一のEmbedを作成
   * @param tweet ツイートデータ
   * @returns EmbedBuilder
   */
  private createSingleEmbed(tweet: Tweet): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setAuthor({
        name: tweet.author.name,
        url: tweet.author.url,
        iconURL: tweet.author.iconUrl,
      })
      .setTitle(tweet.author.name)
      .setURL(tweet.url)
      .setColor(this.embedColor)
      .addFields(
        this.createField(":arrow_right_hook: replies", tweet.metrics.replies),
        this.createField(":hearts: likes", tweet.metrics.likes),
        this.createField(":arrows_counterclockwise: retweets", tweet.metrics.retweets)
      )
      .setTimestamp(tweet.timestamp);

    // 説明文の作成（引用ツイート情報を含む）
    let description = tweet.text;
    if (tweet.quote) {
      const quoteText = this.quotePrefix + "`@" + tweet.quote.author.id + "` " + tweet.quote.text;
      const quoteUrl = "(" + tweet.quote.url + ")";
      description += this.br + this.br + quoteText + this.br + quoteUrl;
    }

    if (description !== "") {
      embed.setDescription(description);
    }

    return embed;
  }

  /**
   * Embedフィールドを作成
   * @param name フィールド名
   * @param count 数値
   * @returns APIEmbedField
   */
  private createField(name: string, count: number): APIEmbedField {
    return {
      inline: true,
      name,
      value: String(count),
    };
  }
}

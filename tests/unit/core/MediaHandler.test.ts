import { describe, it, expect, vi, beforeEach } from "vitest";
import { TweetMedia } from "@/core/models/Tweet";
import { MediaHandler, IFileSizeChecker } from "@/core/services/MediaHandler";

describe("MediaHandler", () => {
  let mockFileSizeChecker: IFileSizeChecker;
  let mediaHandler: MediaHandler;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  beforeEach(() => {
    mockFileSizeChecker = {
      getFileSize: vi.fn(),
    };
    mediaHandler = new MediaHandler(mockFileSizeChecker, MAX_FILE_SIZE);
  });

  describe("filterBySize", () => {
    it("ファイルサイズが上限以下のメディアをdownloadableに分類する", async () => {
      const media: TweetMedia[] = [
        { url: "https://example.com/small.mp4", thumbnailUrl: "", type: "video" },
        { url: "https://example.com/tiny.mp4", thumbnailUrl: "", type: "video" },
      ];

      vi.mocked(mockFileSizeChecker.getFileSize)
        .mockResolvedValueOnce(3 * 1024 * 1024) // 3MB
        .mockResolvedValueOnce(1 * 1024 * 1024); // 1MB

      const result = await mediaHandler.filterBySize(media);

      expect(result.downloadable).toHaveLength(2);
      expect(result.tooLarge).toHaveLength(0);
      expect(result.downloadable).toEqual(media);
    });

    it("ファイルサイズが上限を超えるメディアをtooLargeに分類する", async () => {
      const media: TweetMedia[] = [
        { url: "https://example.com/large.mp4", thumbnailUrl: "", type: "video" },
        { url: "https://example.com/huge.mp4", thumbnailUrl: "", type: "video" },
      ];

      vi.mocked(mockFileSizeChecker.getFileSize)
        .mockResolvedValueOnce(6 * 1024 * 1024) // 6MB
        .mockResolvedValueOnce(10 * 1024 * 1024); // 10MB

      const result = await mediaHandler.filterBySize(media);

      expect(result.downloadable).toHaveLength(0);
      expect(result.tooLarge).toHaveLength(2);
      expect(result.tooLarge).toEqual(media);
    });

    it("上限以下と上限超過が混在する場合、正しく分類する", async () => {
      const media: TweetMedia[] = [
        { url: "https://example.com/small.mp4", thumbnailUrl: "", type: "video" },
        { url: "https://example.com/large.mp4", thumbnailUrl: "", type: "video" },
        { url: "https://example.com/medium.mp4", thumbnailUrl: "", type: "video" },
      ];

      vi.mocked(mockFileSizeChecker.getFileSize)
        .mockResolvedValueOnce(3 * 1024 * 1024) // 3MB
        .mockResolvedValueOnce(7 * 1024 * 1024) // 7MB
        .mockResolvedValueOnce(5 * 1024 * 1024); // 5MB (境界値)

      const result = await mediaHandler.filterBySize(media);

      expect(result.downloadable).toHaveLength(2);
      expect(result.tooLarge).toHaveLength(1);
      expect(result.downloadable[0].url).toBe("https://example.com/small.mp4");
      expect(result.downloadable[1].url).toBe("https://example.com/medium.mp4");
      expect(result.tooLarge[0].url).toBe("https://example.com/large.mp4");
    });

    it("ファイルサイズ取得エラー時はtooLargeに分類する", async () => {
      const media: TweetMedia[] = [{ url: "https://example.com/error.mp4", thumbnailUrl: "", type: "video" }];

      vi.mocked(mockFileSizeChecker.getFileSize).mockRejectedValueOnce(new Error("Network error"));

      const result = await mediaHandler.filterBySize(media);

      expect(result.downloadable).toHaveLength(0);
      expect(result.tooLarge).toHaveLength(1);
    });

    it("空の配列を渡した場合、空の結果を返す", async () => {
      const result = await mediaHandler.filterBySize([]);

      expect(result.downloadable).toEqual([]);
      expect(result.tooLarge).toEqual([]);
    });
  });

  describe("isVideo", () => {
    it("動画メディアに対してtrueを返す", () => {
      const media: TweetMedia = {
        url: "https://example.com/video.mp4",
        thumbnailUrl: "",
        type: "video",
      };

      expect(mediaHandler.isVideo(media)).toBe(true);
    });

    it("画像メディアに対してfalseを返す", () => {
      const media: TweetMedia = {
        url: "https://example.com/photo.jpg",
        thumbnailUrl: "",
        type: "photo",
      };

      expect(mediaHandler.isVideo(media)).toBe(false);
    });
  });

  describe("filterVideos", () => {
    it("動画メディアのみをフィルタリングする", () => {
      const media: TweetMedia[] = [
        { url: "https://example.com/photo.jpg", thumbnailUrl: "", type: "photo" },
        { url: "https://example.com/video.mp4", thumbnailUrl: "", type: "video" },
        { url: "https://example.com/photo2.jpg", thumbnailUrl: "", type: "photo" },
        { url: "https://example.com/video2.mp4", thumbnailUrl: "", type: "video" },
      ];

      const videos = mediaHandler.filterVideos(media);

      expect(videos).toHaveLength(2);
      expect(videos[0].url).toBe("https://example.com/video.mp4");
      expect(videos[1].url).toBe("https://example.com/video2.mp4");
    });

    it("動画がない場合は空配列を返す", () => {
      const media: TweetMedia[] = [{ url: "https://example.com/photo.jpg", thumbnailUrl: "", type: "photo" }];

      const videos = mediaHandler.filterVideos(media);

      expect(videos).toEqual([]);
    });
  });

  describe("filterPhotos", () => {
    it("画像メディアのみをフィルタリングする", () => {
      const media: TweetMedia[] = [
        { url: "https://example.com/photo.jpg", thumbnailUrl: "", type: "photo" },
        { url: "https://example.com/video.mp4", thumbnailUrl: "", type: "video" },
        { url: "https://example.com/photo2.jpg", thumbnailUrl: "", type: "photo" },
      ];

      const photos = mediaHandler.filterPhotos(media);

      expect(photos).toHaveLength(2);
      expect(photos[0].url).toBe("https://example.com/photo.jpg");
      expect(photos[1].url).toBe("https://example.com/photo2.jpg");
    });

    it("画像がない場合は空配列を返す", () => {
      const media: TweetMedia[] = [{ url: "https://example.com/video.mp4", thumbnailUrl: "", type: "video" }];

      const photos = mediaHandler.filterPhotos(media);

      expect(photos).toEqual([]);
    });
  });
});

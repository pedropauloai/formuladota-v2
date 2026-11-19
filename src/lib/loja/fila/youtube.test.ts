import { describe, expect, it } from "vitest";
import { parseYoutubeVideoId, youtubeEmbedUrl, YOUTUBE_CHANNEL_ID } from "./youtube";

describe("parseYoutubeVideoId", () => {
  it.each([
    ["eptAu_jWRMg", "eptAu_jWRMg"],
    ["https://www.youtube.com/watch?v=eptAu_jWRMg", "eptAu_jWRMg"],
    ["https://youtube.com/watch?v=eptAu_jWRMg&t=30s", "eptAu_jWRMg"],
    ["https://youtu.be/eptAu_jWRMg?si=abc", "eptAu_jWRMg"],
    ["https://www.youtube.com/live/eptAu_jWRMg?feature=share", "eptAu_jWRMg"],
    ["youtube.com/live/eptAu_jWRMg", "eptAu_jWRMg"],
    ["https://m.youtube.com/watch?v=eptAu_jWRMg", "eptAu_jWRMg"],
  ])("lê %s", (input, expected) => {
    expect(parseYoutubeVideoId(input)).toBe(expected);
  });

  it.each(["", "https://www.twitch.tv/formuladota", "https://youtube.com/@formuladota", "curto", "https://evil.com/watch?v=eptAu_jWRMg"])(
    "recusa %s",
    (input) => {
      expect(parseYoutubeVideoId(input)).toBeNull();
    },
  );
});

describe("youtubeEmbedUrl", () => {
  it("usa o vídeo escolhido, ou a live do canal sem ele", () => {
    expect(youtubeEmbedUrl("eptAu_jWRMg")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/eptAu_jWRMg\?/);
    expect(youtubeEmbedUrl(null)).toContain(`live_stream?channel=${YOUTUBE_CHANNEL_ID}`);
    expect(youtubeEmbedUrl(null)).toContain("mute=1");
  });
});

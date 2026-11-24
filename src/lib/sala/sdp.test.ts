import { describe, expect, it } from "vitest";
import { midKinds } from "./sdp";

const offer = [
  "v=0",
  "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0 1 2",
  "m=audio 9 UDP/TLS/RTP/SAVPF 111",
  "c=IN IP4 0.0.0.0",
  "a=mid:0",
  "a=sendonly",
  "a=rtpmap:111 opus/48000/2",
  "m=video 9 UDP/TLS/RTP/SAVPF 96",
  "c=IN IP4 0.0.0.0",
  "a=mid:1",
  "a=sendonly",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
  "a=mid:2",
  "",
].join("\r\n");

describe("midKinds", () => {
  it("liga cada mid ao tipo da sua seção de mídia", () => {
    const kinds = midKinds(offer);
    expect(kinds.get("0")).toBe("audio");
    expect(kinds.get("1")).toBe("video");
  });

  it("ignora a seção de dados (application)", () => {
    expect(midKinds(offer).has("2")).toBe(false);
  });

  it("ignora seção sem a=mid e aceita quebra de linha sem \\r", () => {
    const sdp = ["v=0", "m=audio 9 UDP/TLS/RTP/SAVPF 111", "a=sendonly", "m=video 9 UDP/TLS/RTP/SAVPF 96", "a=mid:7"].join("\n");
    const kinds = midKinds(sdp);
    expect(kinds.size).toBe(1);
    expect(kinds.get("7")).toBe("video");
  });
});

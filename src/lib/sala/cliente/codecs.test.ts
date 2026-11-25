import { describe, expect, it } from "vitest";
import { h264Primeiro } from "./codecs";

const vp8 = { mimeType: "video/VP8", clockRate: 90000 };
const rtx = { mimeType: "video/rtx", clockRate: 90000, sdpFmtpLine: "apt=96" };
const vp9 = { mimeType: "video/VP9", clockRate: 90000, sdpFmtpLine: "profile-id=0" };
const h264Basico = { mimeType: "video/H264", clockRate: 90000, sdpFmtpLine: "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f" };
const h264Alto = { mimeType: "video/H264", clockRate: 90000, sdpFmtpLine: "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640034" };
const h264Modo0 = { mimeType: "video/H264", clockRate: 90000, sdpFmtpLine: "level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f" };

describe("h264Primeiro: a ordem dos codecs da tela", () => {
  it("põe o H.264 básico com pacotes em sequência na frente, depois o outro H.264, e mantém o resto na ordem", () => {
    expect(h264Primeiro([vp8, rtx, vp9, h264Modo0, h264Alto, h264Basico])).toEqual([h264Basico, h264Alto, vp8, rtx, vp9, h264Modo0]);
  });

  it("sem H.264 no navegador, a ordem fica como veio", () => {
    expect(h264Primeiro([vp8, rtx, vp9])).toEqual([vp8, rtx, vp9]);
  });
});

// A ordem dos codecs da tela: H.264 primeiro, que a placa de vídeo codifica (o VP8 do Chrome é só no
// processador, e um jogo em 1080p60 com o OBS da live ao lado não deixa processador sobrando). Entre os
// H.264, o perfil básico com pacotes em sequência (42e01f, packetization-mode=1), que todo navegador decodifica.

interface Codec {
  mimeType: string;
  sdpFmtpLine?: string;
}

function peso(c: Codec): number {
  if (c.mimeType.toLowerCase() !== "video/h264") return 2;
  const fmtp = c.sdpFmtpLine ?? "";
  if (!fmtp.includes("packetization-mode=1")) return 2;
  return fmtp.includes("profile-level-id=42e01f") ? 0 : 1;
}

export function h264Primeiro<T extends Codec>(codecs: T[]): T[] {
  return codecs
    .map((c, i) => ({ c, i }))
    .sort((a, b) => peso(a.c) - peso(b.c) || a.i - b.i)
    .map(({ c }) => c);
}

// A live na página da fila: o vídeo que o Pedro colou no painel ou, sem ele, a transmissão ao vivo
// do canal. Domínio sem cookie, que a CSP já libera (frame-src).

/** Canal @formuladota no YouTube. */
export const YOUTUBE_CHANNEL_ID = "UC5UuNYdMKCrsoBITiphwinA";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** ID do vídeo a partir do link que o Pedro cola (watch, youtu.be, live, shorts ou o ID puro); null se não for do YouTube. */
export function parseYoutubeVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (VIDEO_ID.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const candidate =
    host === "youtu.be"
      ? url.pathname.slice(1)
      : host === "youtube.com" || host === "youtube-nocookie.com"
        ? (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:live|embed|shorts)\/([^/?#]+)/)?.[1] ?? "")
        : "";
  return VIDEO_ID.test(candidate) ? candidate : null;
}

/** Endereço do player: o vídeo escolhido ou a live do canal, sem som até a pessoa tocar. */
export function youtubeEmbedUrl(videoId: string | null): string {
  const params = "autoplay=1&mute=1&playsinline=1&rel=0";
  return videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?${params}`
    : `https://www.youtube-nocookie.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}&${params}`;
}

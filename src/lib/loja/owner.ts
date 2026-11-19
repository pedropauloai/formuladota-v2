// Quem vende na loja: o nick e o retrato do Pedro (fã-arte que ele escolheu em 19/11/2026) e o
// canal da Twitch que passa no palco quando ele está no ar. Nome próprio não se traduz.

export const OWNER = {
  /** Nick nas placas e na credencial. */
  nick: "PeterPPA",
  /** Nick curto, onde o espaço é de um lugar da party. */
  short: "PPA",
  /** Recorte quadrado do rosto: 256 px para miniatura, 512 px para destaque. */
  avatar: "/loja/ppa-avatar-256.webp",
  avatarLarge: "/loja/ppa-avatar-512.webp",
  /** Retrato inteiro, 1222x1287. */
  portrait: "/loja/ppa-retrato.webp",
  /** twitch.tv/formuladota */
  twitchChannel: "formuladota",
} as const;

/** Quadro real da live (1920x1080 na origem, nicks de terceiros borrados): o que aparece fora do ar. */
export const LIVE_FRAME = {
  src: "/loja/live-quadro-1280.webp",
  srcSet: "/loja/live-quadro-800.webp 800w, /loja/live-quadro-1280.webp 1280w, /loja/live-quadro-1920.webp 1920w",
  width: 1920,
  height: 1080,
} as const;

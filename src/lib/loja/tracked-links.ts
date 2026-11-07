// Links com origem (UTM) que cada rede usa para levar à loja. O painel mostra para copiar, e o
// next.config tem os atalhos curtos (/ig, /tt...) que redirecionam para o mesmo endereço.

export interface TrackedLink {
  channel: string;
  shortPath: string;
  target: string;
}

export const TRACKED_LINKS: TrackedLink[] = [
  { channel: "Instagram (bio)", shortPath: "/ig", target: "/loja?utm_source=instagram&utm_medium=bio&utm_campaign=loja" },
  { channel: "TikTok (bio)", shortPath: "/tt", target: "/loja?utm_source=tiktok&utm_medium=bio&utm_campaign=loja" },
  { channel: "YouTube (descrição)", shortPath: "/yt", target: "/loja?utm_source=youtube&utm_medium=descricao&utm_campaign=loja" },
  { channel: "YouTube e Twitch (chat da live)", shortPath: "/live", target: "/loja?utm_source=live&utm_medium=chat&utm_campaign=loja" },
  { channel: "Twitch (painel)", shortPath: "/twitch", target: "/loja?utm_source=twitch&utm_medium=painel&utm_campaign=loja" },
  { channel: "WhatsApp (grupo)", shortPath: "/zap", target: "/loja?utm_source=whatsapp&utm_medium=grupo&utm_campaign=loja" },
  { channel: "Discord", shortPath: "/dc", target: "/loja?utm_source=discord&utm_medium=servidor&utm_campaign=loja" },
];

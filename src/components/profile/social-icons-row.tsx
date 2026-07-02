// SocialIconsRow — fileira de redes sociais sob o nick no header do /me.
//
// Substitui o subtítulo fixo "FORMULADOTA" (decisão do pacote de identidade,
// Pedro 2026-06-12). Ícones de MARCA oficiais como SVG inline: o lucide
// deprecou brand icons, então os paths (simple-icons, viewBox 24x24) ficam
// embutidos aqui — ZERO dependência nova.
//
// FUTURO (sistema de multi-login de validação de identidade): cada ícone
// "acende" (text-text-body) quando o user vincular a conta correspondente —
// hoje só o Discord acende, porque é a conta já conectada via login.
// Quando os vínculos existirem, trocar `connected` por dados reais e cada
// ícone vira link/botão de conexão.
//
// Server Component — Tooltip é client, mas pode ser consumido daqui.

import { useTranslations } from "next-intl";
import { Tooltip } from "@/components/ui/tooltip";

/** Redes que o usuário registra (o Discord vem do login, não entra aqui). */
export type SocialNetwork = "twitch" | "youtube" | "kick" | "instagram" | "twitter";
export const SOCIAL_KEYS: SocialNetwork[] = [
  "twitch",
  "youtube",
  "kick",
  "instagram",
  "twitter",
];
/** Mapa rede → URL do perfil (o que o user salva). */
export type SocialLinks = Partial<Record<SocialNetwork, string>>;

interface SocialBrand {
  /** Nome da rede (usado no aria-label). */
  name: string;
  /** Chave da rede (undefined = Discord, sempre conectado via login). */
  key?: SocialNetwork;
  /** Path SVG oficial da marca (simple-icons, viewBox 0 0 24 24). */
  path: string;
  /** Conta já conectada? Hoje: só Discord (login). */
  connected: boolean;
  /**
   * Cor OFICIAL da marca (exceção deliberada à C14: identidade de marca
   * externa não é tematizável — igual aos PNGs das medalhas). X usa branco
   * porque a marca é preta e a UI é dark.
   */
  color: string;
}

// Ordem decidida no pacote: Discord, Twitch, YouTube, Kick, Instagram, X.
const SOCIAL_BRANDS: SocialBrand[] = [
  {
    name: "Discord",
    connected: true,
    color: "#5865F2",
    path: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
  },
  { name: "Twitch", key: "twitch",
    connected: false,
    color: "#9146FF",
    path: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z",
  },
  { name: "YouTube", key: "youtube",
    connected: false,
    color: "#FF0000",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  { name: "Kick", key: "kick",
    connected: false,
    color: "#53FC18",
    path: "M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z",
  },
  { name: "Instagram", key: "instagram",
    connected: false,
    color: "#E4405F",
    path: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
  },
  { name: "X", key: "twitter",
    connected: false,
    color: "#FFFFFF",
    path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  },
];

/**
 * Fileira de ícones sociais (~16px) nas cores OFICIAIS das marcas (Pedro
 * 2026-06-12). Conectado = cor plena; não conectado = cor com opacidade
 * reduzida (acende ao vincular). Sem links por enquanto — tooltip único
 * explica o futuro sistema de validação de identidade.
 */
export function SocialIconsRow({ links }: { links?: SocialLinks }) {
  const t = useTranslations("perfil");
  return (
    <span className="mt-1.5 flex items-center gap-2.5">
      {SOCIAL_BRANDS.map((brand) => {
        const { name, key, path, connected, color } = brand;
        // Discord = sempre conectado (login). As outras acendem quando têm URL.
        const url = key ? links?.[key] : undefined;
        const lit = connected || Boolean(url);
        const icon = (
          <svg
            role="img"
            aria-label={
              lit ? t("socialConnected", { name }) : t("socialComingSoon", { name })
            }
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill={color}
            className={lit ? "" : "opacity-40"}
          >
            <path d={path} />
          </svg>
        );
        // Rede vinculada → link externo pro perfil; senão só o ícone (apagado).
        if (url) {
          return (
            <Tooltip key={name} content={name} side="bottom" focusable={false}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="transition-transform hover:scale-110"
              >
                {icon}
              </a>
            </Tooltip>
          );
        }
        return (
          <Tooltip
            key={name}
            content={connected ? t("socialConnected", { name }) : t("socialComingSoon", { name })}
            side="bottom"
            focusable={false}
          >
            {icon}
          </Tooltip>
        );
      })}
    </span>
  );
}

/**
 * Ícone oficial Steam (path simple-icons) — exportado pra uso ao lado do nick
 * no perfil (link pro STRATZ do usuário). Mesmo padrão inline dos demais.
 */
export function SteamIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  )
}

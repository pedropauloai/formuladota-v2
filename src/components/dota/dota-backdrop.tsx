// DotaBackdrop — background atmosferico full-bleed (arte OFICIAL do Dota 2).
//
// Regra do projeto (Pedro): SEMPRE arte oficial do Dota 2 (Steam CDN). Default:
// `featuredTeal` (New Frontiers) — favorito do Pedro pra background principal, alta
// resolucao (segura bem em ultrawide). Pra outra arte oficial, passe `src`. Nunca video.

import { DOTA_BACKGROUNDS } from "@/components/frontier/assets";

interface DotaBackdropProps {
  /**
   * URL de imagem estatica (keyart oficial). Se omitido, usa `featuredTeal` (New Frontiers).
   * Outras opcoes em DOTA_BACKGROUNDS (featuredPurple, mapDark, mapBanner, greyfade).
   * IMPORTANTE: NAO passar URL de video.
   */
  src?: string;
  /**
   * Intensidade do overlay escuro sobre a imagem.
   * "subtle" (mais imagem visivel) | "strong" (mais escuro). Default: "strong".
   */
  overlay?: "subtle" | "strong";
}

export function DotaBackdrop({ src, overlay = "strong" }: DotaBackdropProps) {
  const imageUrl = src ?? DOTA_BACKGROUNDS.featuredTeal;
  const overlayClass =
    overlay === "subtle"
      ? "bg-gradient-to-b from-black/30 via-black/40 to-black/70"
      : "bg-gradient-to-b from-black/55 via-black/65 to-black/85";

  return (
    <div className="pointer-events-none fixed inset-0 z-[var(--z-atmosphere)] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${imageUrl})` }}
        aria-hidden="true"
      />
      <div className={`absolute inset-0 ${overlayClass}`} />
    </div>
  );
}

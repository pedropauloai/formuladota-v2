// DotaBackdrop — background estático full-bleed igual ao site oficial Dota 2.
//
// O site dota2.com usa a imagem `greyfade.jpg` (Steam CDN) como textura atmospheric em
// TODAS as pages internas (/heroes, /news, /esports). Esse componente replica esse pattern
// pra dar identidade visual consistente e legibilidade boa pra texto sobreposto.
//
// V1: 1 imagem default. V2: pode aceitar override por page se Pedro pedir variação visual
// (ex: /perfil/[steamid] com art keyart de hero específico — sempre estático, nunca video).

const DOTA_BACKGROUND_GREYFADE =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/backgrounds/greyfade.jpg";

interface DotaBackdropProps {
  /**
   * URL custom de imagem estática. Se não passado, usa o `greyfade.jpg` oficial Dota 2.
   * Aceitável: outras imagens estáticas Steam CDN ou self-hosted em public/.
   * IMPORTANTE: NÃO passar URL de video — esse componente é só pra background estático.
   */
  src?: string;
  /**
   * Intensidade do overlay escuro. "subtle" (mais imagem visível) | "strong" (mais escuro).
   * Default: "strong" — alinha com pages internas Dota oficial onde texto domina.
   */
  overlay?: "subtle" | "strong";
}

export function DotaBackdrop({ src, overlay = "strong" }: DotaBackdropProps) {
  const imageUrl = src ?? DOTA_BACKGROUND_GREYFADE;
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

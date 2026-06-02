// DotaBackdrop — background atmosferico full-bleed pras pages internas.
//
// DEFAULT (sem `src`): atmosfera por GRADIENTE CSS — resolucao-independente, crispo em
// qualquer monitor (ultrawide 3440px incluso). Substitui o raster `greyfade.jpg` antigo, que
// era ampliado por bg-cover e pixelava em telas grandes.
//
// COM `src`: usa a imagem keyart (cover) + overlay escuro — pra pages que quiserem art de hero
// especifico. Sempre estatico, nunca video.

const DOTA_BACKGROUND_GREYFADE =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/backgrounds/greyfade.jpg";

export { DOTA_BACKGROUND_GREYFADE };

interface DotaBackdropProps {
  /**
   * URL de imagem estatica (keyart). Se omitido, usa o gradiente atmosferico CSS (crispo).
   * Para forcar a textura oficial Dota: passe `src={DOTA_BACKGROUND_GREYFADE}`.
   * IMPORTANTE: NAO passar URL de video.
   */
  src?: string;
  /**
   * Intensidade do overlay escuro sobre a imagem. Aplica-se apenas quando `src` e passado.
   * "subtle" (mais imagem visivel) | "strong" (mais escuro). Default: "strong".
   */
  overlay?: "subtle" | "strong";
}

export function DotaBackdrop({ src, overlay = "strong" }: DotaBackdropProps) {
  // Default: atmosfera por gradiente CSS (sem raster → sem pixelacao em alta resolucao).
  if (!src) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-[var(--z-atmosphere)] overflow-hidden bg-bg-base"
        aria-hidden="true"
      >
        {/* Brilho brand atmosferico vindo do topo */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(130% 90% at 50% -10%, color-mix(in srgb, var(--color-brand-primary) 14%, transparent), transparent 60%)",
          }}
        />
        {/* Brilho sutil na base oposta — profundidade cinematografica */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 88% 112%, color-mix(in srgb, var(--color-brand-primary) 6%, transparent), transparent 70%)",
          }}
        />
        {/* Vinheta / fade de profundidade (texto domina) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>
    );
  }

  // Com src: imagem keyart estatica + overlay escuro.
  const overlayClass =
    overlay === "subtle"
      ? "bg-gradient-to-b from-black/30 via-black/40 to-black/70"
      : "bg-gradient-to-b from-black/55 via-black/65 to-black/85";

  return (
    <div className="pointer-events-none fixed inset-0 z-[var(--z-atmosphere)] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${src})` }}
        aria-hidden="true"
      />
      <div className={`absolute inset-0 ${overlayClass}`} />
    </div>
  );
}

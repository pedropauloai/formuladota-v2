// Componente reutilizável pra renderizar videos oficiais Dota 2 (Steam CDN HotLink).
// Usado no hero da landing (default homepage montage) e em qualquer card/perfil/stats
// que mostre um hero específico (props.heroSlug).
//
// Pattern URL Steam CDN:
// - Homepage montage: cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_webm.webm
// - Hero individual:   cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/{slug}.webm
//
// Retorna <video> com sources webm + mp4 fallback. autoplay+loop+muted+playsinline
// (requisito browsers pra autoplay sem user gesture).

interface HeroVideoProps {
  /**
   * Slug do hero pra renderizar video idle individual.
   * Ex: "pudge", "antimage", "invoker", "juggernaut".
   * Se não passado, renderiza o video oficial homepage Dota 2.
   */
  heroSlug?: string;
  /**
   * Override completo das URLs (webm + mp4). Útil pra catalog custom de videos.
   */
  src?: { webm: string; mp4?: string };
  className?: string;
  /**
   * Imagem poster mostrada antes do video carregar.
   */
  poster?: string;
  /**
   * Loop infinito (default true).
   */
  loop?: boolean;
}

const HOMEPAGE_WEBM =
  "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_webm.webm";
const HOMEPAGE_MP4 =
  "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_02.mp4";

function buildHeroUrls(slug: string): { webm: string; mp4: string } {
  return {
    webm: `https://cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/${slug}.webm`,
    mp4: `https://cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/${slug}.mp4`,
  };
}

export function HeroVideo({
  heroSlug,
  src,
  className,
  poster,
  loop = true,
}: HeroVideoProps) {
  const urls = src
    ? { webm: src.webm, mp4: src.mp4 }
    : heroSlug
      ? buildHeroUrls(heroSlug)
      : { webm: HOMEPAGE_WEBM, mp4: HOMEPAGE_MP4 };

  return (
    <video
      autoPlay
      loop={loop}
      muted
      playsInline
      poster={poster}
      className={className}
      aria-hidden="true"
    >
      <source src={urls.webm} type="video/webm" />
      {urls.mp4 && <source src={urls.mp4} type="video/mp4" />}
    </video>
  );
}

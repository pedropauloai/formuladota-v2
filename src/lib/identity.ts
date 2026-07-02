// Identidade canônica do usuário — fonte ÚNICA de verdade pro nome/avatar exibidos.
// Decisão Pedro 2026-06-03 (ver memory/project_identidade_antianonimato): anonimato é
// PROIBIDO. O nome é o nick consistente entre as redes (Discord + Steam hoje; Twitch/
// YouTube/Instagram/X no futuro).
//
// NOME = HANDLE DO DISCORD primeiro (Pedro 2026-07-02): o @ do Discord é ESTÁVEL, e a
// persona da Steam tem cultura de ser trocada (às vezes a cada derrota) pra se esconder
// — o oposto do anti-anonimato. Steam persona vira só fallback. O AVATAR continua Steam
// (mais "de jogo") > Discord.
//
// Use displayName()/displayAvatar() em TODO lugar em vez de espalhar
// `steamLink?.persona ?? profile?.username` — isso elimina a bagunça de nomes divergentes.

export interface IdentitySources {
  /** Persona da conta Steam vinculada (nome no jogo). */
  steamPersona?: string | null;
  /** Avatar da Steam. */
  steamAvatar?: string | null;
  /** Username do Discord (login). */
  discordUsername?: string | null;
  /** Avatar do Discord. */
  discordAvatar?: string | null;
}

/** Nome canônico: HANDLE do Discord (estável) > persona Steam (fallback). Nunca vazio. */
export function displayName(src: IdentitySources): string {
  const discord = src.discordUsername?.trim();
  if (discord) return discord;
  const steam = src.steamPersona?.trim();
  if (steam) return steam;
  return "Anônimo";
}

/** Avatar canônico: Steam > Discord > null. */
export function displayAvatar(src: IdentitySources): string | null {
  return src.steamAvatar ?? src.discordAvatar ?? null;
}

/** Iniciais pro fallback de avatar (2 chars). */
export function displayInitials(src: IdentitySources): string {
  return displayName(src).slice(0, 2).toUpperCase();
}

// Normaliza um nick pra comparação (case-insensitive, sem espaços nas pontas).
function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Os nicks das redes batem? Anti-anonimato: o usuário DEVE usar o mesmo nick em todas
 * as redes. Só compara quando ambos existem (Steam vinculada + Discord). Se uma falta,
 * considera "consistente" (não há o que comparar ainda).
 */
export function nicksConsistent(src: IdentitySources): boolean {
  const steam = norm(src.steamPersona);
  const discord = norm(src.discordUsername);
  if (!steam || !discord) return true;
  return steam === discord;
}

/** Mensagem de instrução quando os nicks divergem (null se consistente). */
export function identityWarning(src: IdentitySources): string | null {
  if (nicksConsistent(src)) return null;
  return "Seu nick na Steam e no Discord estão diferentes. Na FormulaDota o anonimato não é permitido — use o MESMO nome em todas as redes. Sincronize seu nick.";
}

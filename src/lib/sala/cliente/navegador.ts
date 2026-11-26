// Qual navegador e qual sistema a pessoa usa, para o guia do microfone (R22) apontar para o lugar certo:
// onde o aviso de permissão aparece (à esquerda, junto do endereço, nos Chromium e no Firefox; no centro,
// no Safari), qual ícone ao lado do endereço abre a permissão do site e qual caminho de privacidade do
// sistema libera o microfone. O Brave se apresenta como Chrome: vem pela marca ou pelo navigator.brave.

export type Navegador = "chrome" | "edge" | "opera" | "brave" | "firefox" | "safari" | "outro";
export type Sistema = "windows" | "mac" | "outro";
export type IconeDoSite = "ajustes" | "cadeado" | "microfone" | "safari";

export function navegadorDe(ua: string, extras: { brave?: boolean; marcas?: string[] } = {}): Navegador {
  if (/Edg(A|iOS)?\//.test(ua)) return "edge";
  if (/OPR\/|Opera/.test(ua)) return "opera";
  if (extras.brave || extras.marcas?.includes("Brave")) return "brave";
  if (/Firefox\/|FxiOS/.test(ua)) return "firefox";
  if (/Chrome\/|CriOS/.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "outro";
}

export function sistemaDe(ua: string): Sistema {
  if (/Windows/.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "mac";
  return "outro";
}

/** Onde o aviso de permissão do navegador aparece em relação à página. */
export function ondeAvisa(n: Navegador): "esquerda" | "centro" {
  return n === "safari" ? "centro" : "esquerda";
}

/** O ícone ao lado do endereço que abre as permissões do site: o Chrome trocou o cadeado pelos ajustes na versão 117. */
export function iconeDoSite(n: Navegador): IconeDoSite {
  if (n === "edge" || n === "opera") return "cadeado";
  if (n === "firefox") return "microfone";
  if (n === "safari") return "safari";
  return "ajustes";
}

/** O navegador e o sistema desta página (no servidor, "outro"). */
export function esteNavegador(): { navegador: Navegador; sistema: Sistema } {
  if (typeof navigator === "undefined") return { navegador: "outro", sistema: "outro" };
  const n = navigator as Navigator & { brave?: unknown; userAgentData?: { brands?: Array<{ brand: string }> } };
  const marcas = n.userAgentData?.brands?.map((b) => b.brand);
  return { navegador: navegadorDe(n.userAgent, { brave: !!n.brave, marcas }), sistema: sistemaDe(n.userAgent) };
}

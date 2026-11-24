// Páginas por sessão (site_pageviews): o caminho que se grava, o que conta como fila e quando a aba
// manda a página de novo. Regra pura, sem banco: o beacon, a rota /api/visita e a leitura do funil
// usam isto. Funil da home: docs/funil-da-home.md.

const PATH_MAX = 300;

/** Caminhos da fila da party: /party e o nome dela em espanhol. */
const QUEUE_PATHS = new Set(["/party", "/grupo"]);

/** Só o caminho, sem query nem âncora, sem a barra do fim (menos na raiz), no limite da coluna. */
export function pageviewPath(url: URL): string {
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  return (path || "/").slice(0, PATH_MAX);
}

export function isQueuePath(path: string): boolean {
  return QUEUE_PATHS.has(path);
}

/** A aba manda cada caminho uma vez; campanha nova (utm) manda sempre, para o cookie de origem. */
export function shouldSendPageview(sentPaths: readonly string[], path: string, hasCampaign: boolean): boolean {
  return hasCampaign || !sentPaths.includes(path);
}

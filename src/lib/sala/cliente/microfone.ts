// O estado do microfone de quem pode falar, para a tela mostrar o caminho (R22): abrindo, pedindo (o aviso
// do navegador está aberto), pergunta (falta o clique em "Ativar microfone"), negado (o site está bloqueado
// no navegador), sistema (o navegador liberou, mas o Windows ou o macOS barram), sem aparelho ou falhou.

export type EstadoMicrofone = "ok" | "abrindo" | "pedindo" | "pergunta" | "negado" | "sistema" | "sem_aparelho" | "falhou";
export type FalhaMicrofone = Extract<EstadoMicrofone, "pergunta" | "negado" | "sistema" | "sem_aparelho" | "falhou">;
export type Permissao = "granted" | "denied" | "prompt";

/** Abrindo há mais que isso sem saber da permissão: o navegador está pedindo (ou travou), e a tela avisa. */
export const PEDINDO_MS = 1_500;

/** A linha de cada estado (em messages/*.json, seção "sala"); "ok" e "abrindo" não têm. */
export const AVISO_MICROFONE: Partial<Record<EstadoMicrofone, string>> = {
  pedindo: "microfonePedindo",
  pergunta: "microfonePergunta",
  negado: "microfoneNegado",
  sistema: "microfoneSistema",
  sem_aparelho: "microfoneSemAparelho",
  falhou: "microfoneFalhou",
};

export function falhaDoMicrofone(erro: unknown, permissao: Permissao | null): FalhaMicrofone {
  const nome = (erro as { name?: string } | null)?.name;
  const mensagem = erro instanceof Error ? erro.message : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    // O Chrome diz "Permission denied by system" quando é o Windows ou o macOS que barram.
    if (/system/i.test(mensagem) || permissao === "granted") return "sistema";
    if (permissao === "prompt") return "pergunta";
    return "negado";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") return "sem_aparelho";
  if (erro instanceof Error && mensagem === "sem microfone") return "sem_aparelho";
  // O navegador deixou, mas o aparelho não abriu: privacidade do sistema ou outro programa segurando.
  if (nome === "NotReadableError" || nome === "AbortError") return "sistema";
  return "falhou";
}

export function falhou(estado: EstadoMicrofone): estado is FalhaMicrofone {
  return estado === "pergunta" || estado === "negado" || estado === "sistema" || estado === "sem_aparelho" || estado === "falhou";
}

export type PassoDaEntrada = EstadoMicrofone | "carregando";

export interface FatosDaEntrada {
  permissao: Permissao | null | "carregando";
  /** A pessoa pediu para abrir (o clique em "Ativar microfone"), ou a permissão já estava liberada. */
  ligado: boolean;
  aberto: boolean;
  falha: FalhaMicrofone | null;
}

/** O que o cartão do microfone mostra na entrada da sala: a falha vence; aberto, a checagem; pedindo, o guia do
 *  aviso do navegador (só quando ele vai mesmo aparecer); bloqueado, o guia; sem resposta, o botão de ativar. */
export function passoDaEntrada(f: FatosDaEntrada): PassoDaEntrada {
  if (f.falha) return f.falha;
  if (f.aberto) return "ok";
  if (f.permissao === "carregando") return "carregando";
  if (f.ligado) return f.permissao === "prompt" ? "pedindo" : "abrindo";
  if (f.permissao === "granted") return "abrindo";
  if (f.permissao === "denied") return "negado";
  return "pergunta";
}

/** "Microfone funcionando": a porta aberta por 300 ms seguidos (6 medidas de 50 ms); aceso, fica aceso. */
const FUNCIONANDO_MEDIDAS = 6;
export interface Funcionando {
  seguidas: number;
  ok: boolean;
}
export const FUNCIONANDO_INICIAL: Funcionando = { seguidas: 0, ok: false };

export function seguirFuncionando(e: Funcionando, aberta: boolean): Funcionando {
  if (e.ok) return e;
  const seguidas = aberta ? e.seguidas + 1 : 0;
  return { seguidas, ok: seguidas >= FUNCIONANDO_MEDIDAS };
}

async function consultar(): Promise<PermissionStatus | null> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return null;
  try {
    return await navigator.permissions.query({ name: "microphone" as PermissionName });
  } catch {
    // Navegador sem a consulta da permissão do microfone.
    return null;
  }
}

/** A permissão do microfone neste site agora (nula se o navegador não diz). */
export async function permissaoDoMicrofone(): Promise<Permissao | null> {
  return (await consultar())?.state ?? null;
}

/** Avisa cada mudança da permissão do microfone (liberada pelo ícone do endereço, bloqueada); devolve a função que para. */
export function vigiarPermissao(aviso: (p: Permissao) => void): () => void {
  let status: PermissionStatus | null = null;
  let vivo = true;
  const mudou = () => status && aviso(status.state);
  void (async () => {
    const s = await consultar();
    if (!s || !vivo) return;
    status = s;
    s.addEventListener("change", mudou);
  })();
  return () => {
    vivo = false;
    status?.removeEventListener("change", mudou);
  };
}

/** Avisa quando a permissão do microfone vira "permitido" ou quando um aparelho é ligado ou desligado;
 *  devolve a função que para de vigiar. */
export function vigiarMicrofone(aviso: () => void): () => void {
  if (typeof navigator === "undefined") return () => undefined;
  const soltar = vigiarPermissao((p) => p === "granted" && aviso());
  const media = navigator.mediaDevices;
  media?.addEventListener?.("devicechange", aviso);
  return () => {
    soltar();
    media?.removeEventListener?.("devicechange", aviso);
  };
}

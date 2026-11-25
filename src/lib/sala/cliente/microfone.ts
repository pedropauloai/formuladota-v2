// O estado do microfone de quem pode falar, para a tela dizer o que houve e como resolver: abrindo (o
// navegador pode estar pedindo a permissão), negado, sem aparelho ou ocupado por outro programa.

export type EstadoMicrofone = "ok" | "abrindo" | "pedindo" | "negado" | "sem_aparelho" | "ocupado" | "falhou";
export type FalhaMicrofone = Extract<EstadoMicrofone, "negado" | "sem_aparelho" | "ocupado" | "falhou">;

/** Abrindo há mais que isso: o navegador está pedindo a permissão (ou travou), e a tela avisa. */
export const PEDINDO_MS = 1_500;

/** A mensagem de cada estado (em messages/*.json, seção "sala"); "ok" e "abrindo" não têm aviso. */
export const AVISO_MICROFONE: Partial<Record<EstadoMicrofone, string>> = {
  pedindo: "microfonePedindo",
  negado: "microfoneNegado",
  sem_aparelho: "microfoneSemAparelho",
  ocupado: "microfoneOcupado",
  falhou: "microfoneFalhou",
};

export function falhaDoMicrofone(erro: unknown): FalhaMicrofone {
  const nome = (erro as { name?: string } | null)?.name;
  if (nome === "NotAllowedError" || nome === "SecurityError") return "negado";
  if (nome === "NotFoundError" || nome === "OverconstrainedError") return "sem_aparelho";
  if (erro instanceof Error && erro.message === "sem microfone") return "sem_aparelho";
  if (nome === "NotReadableError" || nome === "AbortError") return "ocupado";
  return "falhou";
}

export function falhou(estado: EstadoMicrofone): estado is FalhaMicrofone {
  return estado === "negado" || estado === "sem_aparelho" || estado === "ocupado" || estado === "falhou";
}

/** Avisa quando a permissão do microfone vira "permitido" (pelo cadeado do endereço) ou quando um
 *  aparelho é ligado ou desligado; devolve a função que para de vigiar. */
export function vigiarMicrofone(aviso: () => void): () => void {
  if (typeof navigator === "undefined") return () => undefined;
  let status: PermissionStatus | null = null;
  let vivo = true;
  const mudou = () => {
    if (status?.state === "granted") aviso();
  };
  void (async () => {
    try {
      const s = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (!vivo) return;
      status = s;
      s.addEventListener("change", mudou);
    } catch {
      // Navegador sem a consulta da permissão do microfone: ficam o clique e o aparelho novo.
    }
  })();
  const media = navigator.mediaDevices;
  media?.addEventListener?.("devicechange", aviso);
  return () => {
    vivo = false;
    status?.removeEventListener("change", mudou);
    media?.removeEventListener?.("devicechange", aviso);
  };
}

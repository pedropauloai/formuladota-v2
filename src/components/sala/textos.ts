// Liga os códigos do servidor às chaves de texto do grupo "sala" (messages/{pt,en,es}.json).

export const SAIDA_TEXTO: Record<string, string> = {
  saiu: "saidaSaiu",
  expulso: "saidaExpulso",
  fora_da_sala: "saidaFora",
  sala_encerrada: "saidaEncerrada",
  flag_desligada: "saidaDesligada",
  conta_bloqueada: "saidaBloqueada",
  sem_microfone: "saidaSemMicrofone",
  sala_indisponivel: "saidaIndisponivel",
  sala_lotada: "saidaLotada",
};

export const TELA_TEXTO: Record<string, string> = {
  teto_de_trafego: "telaTeto",
  tela_ocupada: "telaOcupada",
  tela_nao_permitida: "telaSoDono",
};

export const MOTIVO_TEXTO = {
  assedio: "motivoAssedio",
  conteudo_sexual: "motivoConteudoSexual",
  menor_em_risco: "motivoMenorEmRisco",
  ameaca: "motivoAmeaca",
  discriminacao: "motivoDiscriminacao",
  spam: "motivoSpam",
  outro: "motivoOutro",
} as const;

export type Motivo = keyof typeof MOTIVO_TEXTO;

/** Quem saiu por estes motivos pode tentar entrar de novo na hora. */
export const PODE_VOLTAR = new Set(["saiu", "sem_microfone", "sala_indisponivel", "sala_lotada", "sem_rede", "erro"]);

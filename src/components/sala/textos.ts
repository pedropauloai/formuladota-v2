// Liga os códigos do servidor às chaves de texto do grupo "sala" (messages/{pt,en,es}.json).

export const SAIDA_TEXTO: Record<string, string> = {
  saiu: "saidaSaiu",
  expulso: "saidaExpulso",
  banido: "saidaBanido",
  fora_da_sala: "saidaFora",
  so_beneficio: "saidaBeneficio",
  sala_encerrada: "saidaEncerrada",
  flag_desligada: "saidaDesligada",
  conta_bloqueada: "saidaBloqueada",
  conta_sem_identidade: "saidaIdentidade",
  sem_maioridade: "saidaMaioridade",
  sem_microfone: "saidaSemMicrofone",
  sala_indisponivel: "saidaIndisponivel",
  sala_lotada: "saidaLotada",
};

export const TELA_TEXTO: Record<string, string> = {
  teto_de_trafego: "telaTeto",
  tela_ocupada: "telaOcupada",
  tela_nao_permitida: "telaSoDono",
};

export const CHAT_ERRO: Record<string, string> = {
  devagar: "chatDevagar",
  chat_fechado: "chatFechado",
  mensagem_invalida: "chatInvalida",
};

export const MODERAR_ERRO: Record<string, string> = {
  palco_cheio: "palcoCheio",
  sala_lotada: "moverCheio",
  so_beneficio: "moverSemAcesso",
  banido: "moverSemAcesso",
  sem_maioridade: "moverSemAcesso",
  conta_bloqueada: "moverSemAcesso",
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

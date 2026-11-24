"use client";

// Canal de texto: só o chat, sem voz nem tela (nada de SFU). Entra uma vez (a linha de membro deixa o
// dono moderar), pergunta o estado a cada 3 s com batimento a cada 10 s, junta as mensagens novas, busca
// nome e avatar de quem escreveu e carrega as anteriores sob pedido. Sair da página não avisa saída: o
// canal de texto não mostra quem está lendo, e um aviso atrasado tiraria a pessoa que acabou de voltar
// (a presença some sozinha em 30 s sem batimento).

import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Estado, MensagemEstado } from "../estado";
import type { Pessoa } from "../pessoas";
import { api } from "./acoes";
import { comMinha, cursorDoChat, juntarChat } from "./chat-local";

const CICLO_MS = 3_000;
const BATIMENTO_MS = 10_000;
const GUARDA = 1000;
/** O estado entrega as 30 últimas na primeira consulta; menos que isso, não há anteriores. */
const PRIMEIRO_LOTE = 30;
const LOTE_ANTERIOR = 50;

export interface CanalTextoSnapshot {
  fase: "entrando" | "dentro" | "saiu";
  motivo: string | null;
  eu: Estado["eu"] | null;
  sala: Estado["sala"] | null;
  donoId: string | null;
  chat: MensagemEstado[];
  pessoas: Record<string, Pessoa>;
  temAnteriores: boolean;
}

const INICIAL: CanalTextoSnapshot = { fase: "entrando", motivo: null, eu: null, sala: null, donoId: null, chat: [], pessoas: {}, temAnteriores: false };

/** Falha de rede ou do servidor: tenta de novo no próximo ciclo, sem tirar a pessoa do canal. */
const transitoria = (code: string) => code === "sem_rede" || code === "erro_interno" || code.startsWith("http_5");

/** Busca nome e avatar só de quem ainda não se conhece (até 60 por vez). */
function useNomes(roomId: string) {
  const conhecidos = useRef(new Set<string>());
  const [pessoas, setPessoas] = useState<Record<string, Pessoa>>({});
  const conhecer = useCallback(async (msgs: MensagemEstado[]) => {
    const novos = [...new Set(msgs.flatMap((m) => (m.userId && !conhecidos.current.has(m.userId) ? [m.userId] : [])))].slice(0, 60);
    if (novos.length === 0) return;
    novos.forEach((id) => conhecidos.current.add(id));
    const res = await api(roomId).pessoas(novos);
    if (res.ok) setPessoas((p) => ({ ...p, ...res.data }));
  }, [roomId]);
  return { pessoas, conhecer };
}

interface Ciclo {
  chat: MutableRefObject<MensagemEstado[]>;
  cursor: MutableRefObject<number>;
  setSnap: Dispatch<SetStateAction<CanalTextoSnapshot>>;
  conhecer: (msgs: MensagemEstado[]) => Promise<void>;
}

/** Entra e pergunta o estado em ciclo; devolve a limpeza (para o ciclo e avisa a saída). */
function iniciarCiclo(roomId: string, c: Ciclo): () => void {
  let vivo = true;
  let ultimoBatimento = 0;
  let timer: number | undefined;
  const a = api(roomId);
  const sair = (motivo: string) => {
    window.clearInterval(timer);
    if (vivo) c.setSnap((s) => ({ ...s, fase: "saiu", motivo }));
  };
  const ciclo = async () => {
    const agora = Date.now();
    const beat = agora - ultimoBatimento >= BATIMENTO_MS ? { muted: true, hand: false } : undefined;
    const res = await a.estado({ sessionId: null, chatAfter: c.cursor.current, beat });
    if (!vivo) return;
    if (!res.ok) return transitoria(res.code) ? undefined : sair(res.code);
    if (beat) ultimoBatimento = agora;
    if (res.data.saida) return sair(res.data.saida);
    const novas = res.data.chat ?? [];
    const primeira = c.cursor.current === 0;
    c.chat.current = juntarChat(c.chat.current, novas, res.data.apagadas ?? [], false, GUARDA);
    c.cursor.current = cursorDoChat(c.cursor.current, novas);
    const donoId = res.data.membros?.find((m) => m.papel === "dono")?.userId ?? null;
    c.setSnap((s) => ({ ...s, fase: "dentro", eu: res.data.eu ?? null, sala: res.data.sala ?? null, donoId: donoId ?? s.donoId, chat: c.chat.current, temAnteriores: primeira ? novas.length >= PRIMEIRO_LOTE : s.temAnteriores }));
    void c.conhecer(novas);
  };
  void (async () => {
    const entrada = await a.entrar();
    if (!vivo) return;
    if (!entrada.ok) return sair(entrada.code);
    await ciclo();
    timer = window.setInterval(() => void ciclo(), CICLO_MS);
  })();
  return () => {
    vivo = false;
    window.clearInterval(timer);
  };
}

export function useCanalTexto(roomId: string) {
  const [snap, setSnap] = useState<CanalTextoSnapshot>(INICIAL);
  const { pessoas, conhecer } = useNomes(roomId);
  const chat = useRef<MensagemEstado[]>([]);
  const cursor = useRef(0);
  const eu = snap.eu?.userId ?? null;

  useEffect(() => iniciarCiclo(roomId, { chat, cursor, setSnap, conhecer }), [roomId, conhecer]);

  const enviar = useCallback(async (texto: string): Promise<{ ok: true } | { ok: false; code: string }> => {
    const a = api(roomId);
    let res = await a.chat(texto);
    // Sem batimento recente (aba que dormiu), entra de novo e tenta uma vez.
    if (!res.ok && res.code === "fora_da_sala" && (await a.entrar()).ok) res = await a.chat(texto);
    if (!res.ok) return res;
    chat.current = comMinha(chat.current, res.data.id, eu, texto, GUARDA);
    setSnap((s) => ({ ...s, chat: chat.current }));
    return { ok: true };
  }, [roomId, eu]);

  const carregarAnteriores = useCallback(async () => {
    const primeira = chat.current[0]?.id;
    if (!primeira) return;
    const res = await fetch(`/api/sala/${roomId}/chat?antes=${primeira}`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const anteriores = (await res.json()) as MensagemEstado[];
    chat.current = juntarChat(chat.current, anteriores, [], false, GUARDA);
    setSnap((s) => ({ ...s, chat: chat.current, temAnteriores: anteriores.length >= LOTE_ANTERIOR }));
    void conhecer(anteriores);
  }, [roomId, conhecer]);

  const apagar = useCallback(async (id: number) => {
    const res = await api(roomId).apagarMensagem(id);
    if (!res.ok) return;
    chat.current = chat.current.filter((m) => m.id !== id);
    setSnap((s) => ({ ...s, chat: chat.current }));
  }, [roomId]);

  return { snap: { ...snap, pessoas }, enviar, carregarAnteriores, apagar, acoes: api(roomId) };
}

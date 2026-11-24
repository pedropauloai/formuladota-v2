// A lista de canais do servidor para a coluna da esquerda (spec, seção 14): os canais públicos saem do
// banco uma vez a cada 5 s por instância (iguais para todos) e as salas privadas de cada pessoa a cada
// 15 s, para o plano grátis do Supabase. Os canais de teste só aparecem no servidor local do e2e.

import "server-only";
import { montarLista, type ListaDeCanais } from "./canais";
import { ListaDeCanaisSchema, SalasPrivadasSchema, type CanalBruto, type PrivadaBruta } from "./contratos";
import type { Db } from "./dados-sala";
import { canaisDeTeste } from "./flag-chave";
import { TtlCache } from "./memoria";

const comuns = new TtlCache<CanalBruto[]>(5_000, 2);
const privadas = new TtlCache<PrivadaBruta[]>(15_000, 5000);

function deTeste(): boolean {
  return canaisDeTeste({ NODE_ENV: process.env.NODE_ENV, SALA_FLAG_KEY: process.env.SALA_FLAG_KEY });
}

async function canaisPublicos(db: Db, teste: boolean, now: number): Promise<CanalBruto[]> {
  const chave = teste ? "teste" : "producao";
  const guardados = comuns.get(chave, now);
  if (guardados) return guardados;
  const { data, error } = await db.rpc("voice_channel_list", { p_is_test: teste });
  if (error) throw new Error(`ler os canais: ${error.message}`);
  const canais = ListaDeCanaisSchema.parse(data);
  comuns.set(chave, canais, now);
  return canais;
}

async function salasPrivadas(db: Db, userId: string, teste: boolean, now: number): Promise<PrivadaBruta[]> {
  const chave = `${teste ? "teste" : "producao"}:${userId}`;
  const guardadas = privadas.get(chave, now);
  if (guardadas) return guardadas;
  const { data, error } = await db.rpc("voice_private_rooms", { p_user: userId, p_is_test: teste });
  if (error) throw new Error(`ler as salas privadas: ${error.message}`);
  const salas = SalasPrivadasSchema.parse(data);
  privadas.set(chave, salas, now);
  return salas;
}

export async function listaDeCanais(db: Db, userId: string, now = Date.now()): Promise<ListaDeCanais> {
  const teste = deTeste();
  const [canais, minhas] = await Promise.all([canaisPublicos(db, teste, now), salasPrivadas(db, userId, teste, now)]);
  return montarLista(canais, minhas);
}

/** Depois de uma mudança do admin (canal novo, nome, ordem), esta instância lê de novo na hora. */
export function esquecerCanais(): void {
  comuns.delete("teste");
  comuns.delete("producao");
}

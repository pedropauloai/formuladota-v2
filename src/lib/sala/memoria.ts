// Memória do servidor para o plano grátis do Supabase (spec, ADR-004): o estado comum da sala sai do
// banco uma vez a cada 3 s por instância e o chat novo se junta ao que já estava guardado; a decisão
// de acesso de cada pessoa vale até o próximo batimento. Nada aqui decide permissão.

import type { MemberRole, Quality, TrackKind, TrackLabel } from "./tipos";

export interface ChatMessage {
  /** id da mensagem (crescente). */
  i: number;
  /** autor; nulo se a conta foi apagada. */
  u: string | null;
  /** texto. */
  b: string;
  /** quando. */
  a: string;
}

export interface SnapshotMember {
  u: string;
  r: MemberRole;
  m: boolean;
  /** Mutado pelo dono (só vem quando verdadeiro). */
  f?: boolean;
  /** Mão levantada desde (só vem quando levantada). */
  h?: string;
  on: boolean;
  /** Canal para onde o dono moveu a pessoa (só vem nos 60 s depois de mover). */
  mv?: string;
}

export interface SnapshotTrack {
  s: string;
  u: string;
  n: string;
  k: TrackKind;
  t: TrackLabel;
  q?: Quality;
}

/** O que `voice_room_snapshot` devolve (chaves curtas de propósito: é o que sai do banco). */
export interface RawSnapshot {
  room: { status: string; chat_open: boolean; closes_at: string } | null;
  members: SnapshotMember[];
  tracks: SnapshotTrack[];
  chat: ChatMessage[];
  deleted: number[];
  removed: string[];
}


/** Junta o chat guardado com o novo, sem repetir nem as apagadas, e fica com as últimas `keep`. */
export function mergeChat(current: ChatMessage[], incoming: ChatMessage[], deleted: number[], keep: number): ChatMessage[] {
  const gone = new Set(deleted);
  const byId = new Map<number, ChatMessage>();
  for (const m of [...current, ...incoming]) if (!gone.has(m.i)) byId.set(m.i, m);
  return [...byId.values()].sort((a, b) => a.i - b.i).slice(-keep);
}

export class SnapshotCache {
  private entries = new Map<string, { at: number; snap: RawSnapshot }>();
  private inflight = new Map<string, Promise<RawSnapshot>>();

  constructor(private readonly ttlMs: number, private readonly maxRooms = 50, private readonly chatKeep = 50) {}

  /** Da memória se tiver menos de `ttlMs`; senão, uma busca só por sala, pedindo o chat depois do último guardado. */
  get(roomId: string, now: number, fetcher: (chatAfter: number) => Promise<RawSnapshot>): Promise<RawSnapshot> {
    const entry = this.entries.get(roomId);
    if (entry && now - entry.at < this.ttlMs) return Promise.resolve(entry.snap);
    const pending = this.inflight.get(roomId);
    if (pending) return pending;
    const kept = entry?.snap.chat ?? [];
    const chatAfter = kept.at(-1)?.i ?? 0;
    const p = (async () => {
      try {
        const fresh = await fetcher(chatAfter);
        const snap = { ...fresh, chat: mergeChat(kept, fresh.chat, fresh.deleted, this.chatKeep) };
        this.entries.delete(roomId);
        this.entries.set(roomId, { at: now, snap });
        while (this.entries.size > this.maxRooms) {
          const oldest = this.entries.keys().next().value;
          if (oldest === undefined) break;
          this.entries.delete(oldest);
        }
        return snap;
      } finally {
        this.inflight.delete(roomId);
      }
    })();
    this.inflight.set(roomId, p);
    return p;
  }

  /** A próxima consulta vai ao banco (depois de uma mudança feita por esta instância). */
  invalidate(roomId: string): void {
    const entry = this.entries.get(roomId);
    if (entry) entry.at = Number.NEGATIVE_INFINITY;
  }
}

export class TtlCache<V> {
  private map = new Map<string, { at: number; v: V }>();

  constructor(private readonly ttlMs: number, private readonly max: number) {}

  get(key: string, now: number): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (now - e.at >= this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    return e.v;
  }

  set(key: string, v: V, now: number): void {
    this.map.delete(key);
    this.map.set(key, { at: now, v });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}

import { describe, expect, it, vi } from "vitest";
import { mergeChat, SnapshotCache, TtlCache, type ChatMessage, type RawSnapshot } from "./memoria";

const msg = (i: number, b = `m${i}`): ChatMessage => ({ i, u: "u1", b, a: "2026-11-24T20:00:00Z" });

describe("mergeChat", () => {
  it("junta as novas em ordem, sem repetir, e guarda só as últimas", () => {
    const merged = mergeChat([msg(1), msg(2), msg(3)], [msg(3), msg(5), msg(4)], [], 4);
    expect(merged.map((m) => m.i)).toEqual([2, 3, 4, 5]);
  });

  it("tira as apagadas", () => {
    expect(mergeChat([msg(1), msg(2)], [msg(3)], [2], 50).map((m) => m.i)).toEqual([1, 3]);
  });
});

function snapshot(chat: ChatMessage[], extra: Partial<RawSnapshot> = {}): RawSnapshot {
  return { room: { status: "aberta", chat_open: true, closes_at: "2026-11-24T23:00:00Z" }, members: [], tracks: [], chat, deleted: [], removed: [], ...extra };
}

describe("SnapshotCache (estado comum da sala guardado por 3 s)", () => {
  it("busca no banco uma vez e responde da memória dentro de 3 s", async () => {
    const fetcher = vi.fn(async () => snapshot([msg(1)]));
    const cache = new SnapshotCache(3000);
    await cache.get("sala", 1000, fetcher);
    const second = await cache.get("sala", 3500, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second.chat.map((m) => m.i)).toEqual([1]);
  });

  it("depois de 3 s pede ao banco só o chat posterior ao que já tem e junta", async () => {
    const fetcher = vi.fn(async (chatAfter: number) => (chatAfter === 0 ? snapshot([msg(1), msg(2)]) : snapshot([msg(3)])));
    const cache = new SnapshotCache(3000);
    await cache.get("sala", 0, fetcher);
    const later = await cache.get("sala", 3000, fetcher);
    expect(fetcher).toHaveBeenLastCalledWith(2);
    expect(later.chat.map((m) => m.i)).toEqual([1, 2, 3]);
  });

  it("mensagem apagada sai da memória", async () => {
    let call = 0;
    const fetcher = vi.fn(async () => (call++ === 0 ? snapshot([msg(1), msg(2)]) : snapshot([], { deleted: [1] })));
    const cache = new SnapshotCache(3000);
    await cache.get("sala", 0, fetcher);
    expect((await cache.get("sala", 5000, fetcher)).chat.map((m) => m.i)).toEqual([2]);
  });

  it("pedidos ao mesmo tempo com a memória vencida fazem uma busca só", async () => {
    const fetcher = vi.fn(async () => snapshot([]));
    const cache = new SnapshotCache(3000);
    await Promise.all([cache.get("sala", 0, fetcher), cache.get("sala", 0, fetcher), cache.get("sala", 0, fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("invalidar faz a próxima consulta ir ao banco", async () => {
    const fetcher = vi.fn(async () => snapshot([]));
    const cache = new SnapshotCache(3000);
    await cache.get("sala", 0, fetcher);
    cache.invalidate("sala");
    await cache.get("sala", 100, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("TtlCache (decisão de acesso guardada até o próximo batimento)", () => {
  it("vale pelo prazo e some depois", () => {
    const cache = new TtlCache<string>(15_000, 100);
    cache.set("sala:u1", "ok", 0);
    expect(cache.get("sala:u1", 14_999)).toBe("ok");
    expect(cache.get("sala:u1", 15_000)).toBeUndefined();
  });

  it("não cresce além do limite (sai a mais antiga)", () => {
    const cache = new TtlCache<number>(15_000, 2);
    cache.set("a", 1, 0);
    cache.set("b", 2, 0);
    cache.set("c", 3, 0);
    expect(cache.get("a", 1)).toBeUndefined();
    expect(cache.get("c", 1)).toBe(3);
  });
});

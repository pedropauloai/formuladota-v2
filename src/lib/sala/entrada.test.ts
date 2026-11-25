import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./realtime-api", () => ({
  realtimeEnv: () => ({ appId: "app", appSecret: "segredo", turnKeyId: "chave", turnKeyToken: "token" }),
  generateIceServers: vi.fn(),
  revokeTurnCredential: vi.fn(async () => true),
}));
vi.mock("./sessoes", () => ({ revokeTurn: vi.fn(async () => undefined), closeUserSessions: vi.fn(async () => undefined) }));
vi.mock("./estado", () => ({ forgetRoomState: vi.fn() }));

import type { CallContext } from "./contexto";
import { enterRoom } from "./entrada";
import { generateIceServers, revokeTurnCredential } from "./realtime-api";

type Linha = Record<string, unknown>;

/** O banco de mentira: uma linha de membro que aceita o upsert e o update com filtros (e devolve o que mudou). */
function bancoCom(linha: Linha): CallContext["db"] {
  const from = () => ({
    upsert: async () => ({ error: null }),
    update: (patch: Linha) => {
      const filtros: Array<[string, unknown]> = [];
      let devolver = false;
      const consulta = {
        eq(coluna: string, valor: unknown) {
          filtros.push([coluna, valor]);
          return consulta;
        },
        select() {
          devolver = true;
          return consulta;
        },
        then(ok: (r: { data: Linha[] | null; error: null }) => void) {
          const casa = filtros.every(([c, v]) => linha[c] === v);
          if (casa) Object.assign(linha, patch);
          ok({ data: devolver ? (casa ? [linha] : []) : null, error: null });
        },
      };
      return consulta;
    },
  });
  return { from } as unknown as CallContext["db"];
}

function contexto(linha: Linha): CallContext {
  return {
    userId: "aluno",
    room: {
      id: "sala", kind: "mentoria", title: "Mentoria", status: "aberta", ownerId: "dono", isTest: true, maxMembers: 2,
      screenPolicy: "dono", audience: "todos", chatOpen: true, closesAt: "2100-01-01T00:00:00.000Z", voiceMode: "palco", channelPosition: null,
    },
    settings: { capGb30d: 800, videoMaxKbps: 6000, palcoMaxSpeakers: 4, partyScreenEnabled: true, usageBytes30d: 0 },
    member: null,
    speakers: 0,
    blocked: [],
    decision: { ok: true, role: "falante" },
    db: bancoCom(linha),
    now: new Date("2026-11-25T00:00:00.000Z"),
  };
}

const linhaAtiva = (): Linha => ({ room_id: "sala", user_id: "aluno", status: "ativo", turn_username: null });

describe("enterRoom: a credencial do TURN de quem entra", () => {
  afterEach(() => vi.clearAllMocks());

  it("quem segue na sala recebe a credencial nova, gravada na linha dele", async () => {
    const linha = linhaAtiva();
    vi.mocked(generateIceServers).mockResolvedValue({ iceServers: [{ urls: "turn:turn.exemplo:3478" }], username: "credencialnova1" });
    const r = await enterRoom(contexto(linha));
    expect(r.ok).toBe(true);
    expect(linha.turn_username).toBe("credencialnova1");
    expect(revokeTurnCredential).not.toHaveBeenCalled();
  });

  it("expulso enquanto a entrada pedia a credencial: a nova é revogada, não fica na linha e a entrada é recusada", async () => {
    const linha = linhaAtiva();
    vi.mocked(generateIceServers).mockImplementation(async () => {
      // O dono expulsa no meio do pedido à Cloudflare: a expulsão já revogou o que estava na linha.
      linha.status = "expulso";
      return { iceServers: [{ urls: "turn:turn.exemplo:3478" }], username: "credencialnova1" };
    });
    const r = await enterRoom(contexto(linha));
    expect(r).toEqual({ ok: false, code: "expulso" });
    expect(linha.turn_username).toBeNull();
    expect(revokeTurnCredential).toHaveBeenCalledWith(expect.anything(), "credencialnova1");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => undefined }));
vi.mock("@/actions/friends", () => ({ blockUser: vi.fn() }));
vi.mock("@/lib/cron/alert", () => ({ sendOpsAlert: vi.fn(async () => true) }));
vi.mock("./dados-sala", () => ({ banUser: vi.fn(), getMemberRow: vi.fn(async () => ({ status: "ativo" })), kickMember: vi.fn(), updateMember: vi.fn() }));
vi.mock("./dados-rtc", () => ({ openSessions: vi.fn(async () => []) }));
vi.mock("./estado", () => ({ forgetRoomState: vi.fn() }));
vi.mock("./lista-canais", () => ({ avisarCanais: vi.fn() }));
vi.mock("./realtime-api", () => ({ realtimeEnv: () => null }));
vi.mock("./sessoes", () => ({ closeUserSessions: vi.fn(), closeVoice: vi.fn(), cutSubscriptions: vi.fn(), revokeTurn: vi.fn() }));

import { sendOpsAlert } from "@/lib/cron/alert";
import type { CallContext } from "./contexto";
import { report } from "./moderacao";

/** O banco de mentira da denúncia: nenhuma denúncia na última hora, a gravação passa e os nomes existem. */
function banco(): CallContext["db"] {
  const respostas: Record<string, unknown> = {
    voice_room_reports: { count: 0, error: null },
    public_player_identities: { data: [{ id: "quem", username: "Quem" }, { id: "alvo", username: "Alvo" }], error: null },
  };
  const from = (tabela: string) => {
    const consulta = {
      select: () => consulta,
      eq: () => consulta,
      gt: () => consulta,
      in: () => consulta,
      insert: async () => ({ error: null }),
      then: (ok: (r: unknown) => void) => ok(respostas[tabela]),
    };
    return consulta;
  };
  return { from } as unknown as CallContext["db"];
}

function contexto(isTest: boolean): CallContext {
  return {
    userId: "quem",
    room: {
      id: "sala", kind: "palco", title: "Live do PPA", status: "aberta", ownerId: "dono", isTest, maxMembers: 30,
      screenPolicy: "dono", audience: "todos", chatOpen: true, closesAt: "2100-01-01T00:00:00.000Z", voiceMode: "palco", channelPosition: 10,
    },
    settings: { capGb30d: 800, videoMaxKbps: 6000, palcoMaxSpeakers: 4, partyScreenEnabled: true, usageBytes30d: 0 },
    member: null,
    speakers: 0,
    blocked: [],
    decision: { ok: true, role: "ouvinte" },
    db: banco(),
    now: new Date("2026-11-25T00:00:00.000Z"),
  };
}

describe("report: o aviso da denúncia", () => {
  afterEach(() => vi.clearAllMocks());

  it("denúncia em sala de teste vai ao canal de teste, sem marcar o PPA", async () => {
    expect(await report(contexto(true), { userId: "alvo", motivo: "spam", detalhes: "" })).toEqual({ ok: true });
    expect(sendOpsAlert).toHaveBeenCalledWith(expect.stringContaining("[TESTE]"), false, true);
  });

  it("denúncia de verdade vai ao canal de vendas, marcando o PPA", async () => {
    expect(await report(contexto(false), { userId: "alvo", motivo: "spam", detalhes: "" })).toEqual({ ok: true });
    expect(sendOpsAlert).toHaveBeenCalledWith(expect.stringContaining("Quem denunciou Alvo"), true, false);
  });
});

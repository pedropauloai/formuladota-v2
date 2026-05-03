// Handlers HTTP — lobby create + match capture.
// Recebe POST do app FORMULADOTA, opera Dota 2 GC via node-dota2.

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SteamBotState } from "./steam-client.js";

const createLobbySchema = z.object({
  lobbyId: z.string().uuid(),     // ID da row em lobbies (Supabase)
  name: z.string().min(1).max(60),
  password: z.string().min(4).max(32),
  gameMode: z.enum(["all_pick", "captains_mode", "random_draft", "single_draft"]).default("all_pick"),
});

interface HandlerResult {
  ok: boolean;
  steamLobbyId?: string;
  error?: string;
}

export async function createLobbyHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  bot: SteamBotState,
  body: unknown
): Promise<HandlerResult> {
  const parsed = createLobbySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid input: " + JSON.stringify(parsed.error.flatten()) };
  }

  const { lobbyId, name, password, gameMode } = parsed.data;

  // Cria lobby no Dota 2 GC
  // node-dota2 API: dota.createPracticeLobby(password, options, callback)
  const gameModeMap: Record<typeof gameMode, number> = {
    all_pick: 22,           // ALL_DRAFT
    captains_mode: 2,       // CAPTAINS_MODE
    random_draft: 4,        // RANDOM_DRAFT
    single_draft: 5,        // SINGLE_DRAFT
  };

  return new Promise<HandlerResult>((resolve) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      bot.dota.createPracticeLobby(
        password,
        {
          game_name: name,
          server_region: 17,    // South America (Brazil)
          game_mode: gameModeMap[gameMode],
          allow_cheats: false,
          fill_with_bots: false,
          allow_spectating: true,
          pass_key: password,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (err: Error | null, body: any) => {
          if (err) {
            // Marca lobby como bot_unavailable (H3.6)
            await supabase
              .from("lobbies")
              .update({ status: "bot_unavailable", bot_error: err.message })
              .eq("id", lobbyId);
            resolve({ ok: false, error: err.message });
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const steamLobbyId = String(body?.lobby_id ?? "");
          await supabase
            .from("lobbies")
            .update({ steam_lobby_id: steamLobbyId, status: "open" })
            .eq("id", lobbyId);
          resolve({ ok: true, steamLobbyId });
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      void supabase
        .from("lobbies")
        .update({ status: "bot_unavailable", bot_error: msg })
        .eq("id", lobbyId);
      resolve({ ok: false, error: msg });
    }
  });
}

const captureMatchSchema = z.object({
  lobbyId: z.string().uuid(),
});

export async function captureMatchHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  bot: SteamBotState,
  body: unknown
): Promise<HandlerResult> {
  const parsed = captureMatchSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid input" };
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const matchId = String(bot.dota.Lobby?.match_id ?? "");
  if (!matchId) return { ok: false, error: "no match in progress" };

  await supabase
    .from("lobbies")
    .update({ dota_match_id: matchId, status: "completed" })
    .eq("id", parsed.data.lobbyId);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  bot.dota.leavePracticeLobby();
  return { ok: true };
}

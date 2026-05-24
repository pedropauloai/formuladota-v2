// Zod schemas para os comandos HTTP do bot.
// Usados em rotas Express + chamados da plataforma via Server Actions.

import { z } from "zod";

// -------------------------------------------------------------------
// Sala Geral
// -------------------------------------------------------------------

/** Resposta de POST /api/general-room/ensure */
export const EnsureGeneralRoomResponseSchema = z.object({
  channelId: z.string(),
  existed: z.boolean(),
  created: z.boolean(),
});

export type EnsureGeneralRoomResponse = z.infer<
  typeof EnsureGeneralRoomResponseSchema
>;

// -------------------------------------------------------------------
// Sala de Partida (temp)
// -------------------------------------------------------------------

/** Body de POST /api/match-room/create */
export const CreateMatchRoomBodySchema = z.object({
  customName: z
    .string()
    .min(3, "Nome da sala deve ter ao menos 3 caracteres.")
    .max(50, "Nome da sala deve ter no máximo 50 caracteres."),
  userDiscordIds: z
    .array(z.string().regex(/^\d{17,20}$/, "Discord ID inválido."))
    .min(1)
    .max(5),
});

export type CreateMatchRoomBody = z.infer<typeof CreateMatchRoomBodySchema>;

/** Resposta de POST /api/match-room/create */
export const CreateMatchRoomResponseSchema = z.object({
  channelId: z.string(),
  movedCount: z.number(),
});

export type CreateMatchRoomResponse = z.infer<
  typeof CreateMatchRoomResponseSchema
>;

// -------------------------------------------------------------------
// Erro padrão
// -------------------------------------------------------------------

export interface ApiError {
  error: string;
}

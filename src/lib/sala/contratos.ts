// Formato do que as funções do banco devolvem (migration 196): o servidor só confia no que passa por
// aqui. Conferido contra a saída real das funções em __fixtures__/funcoes-do-banco.json (capturada
// no banco de produção, em transação desfeita, com ids e nomes trocados por exemplos).

import { z } from "zod";

const Role = z.enum(["dono", "membro", "falante", "ouvinte"]);

export const RoomFacts = z.object({
  id: z.string(),
  kind: z.enum(["palco", "mentoria", "party", "texto"]),
  title: z.string(),
  owner_id: z.string(),
  status: z.enum(["aberta", "encerrada"]),
  closes_at: z.string(),
  max_members: z.number(),
  screen_policy: z.enum(["dono", "um_por_vez"]),
  audience: z.enum(["todos", "beneficio"]),
  chat_open: z.boolean(),
  is_test: z.boolean(),
  // Migration 198: sem as chaves (formato da 196), a sala é palco e fica fora da lista de canais.
  voice_mode: z.enum(["palco", "livre"]).default("palco"),
  channel_position: z.number().nullable().default(null),
});

const SettingsFacts = z.object({
  cap_gb_30d: z.number(),
  video_max_kbps: z.number(),
  palco_max_speakers: z.number(),
  party_screen_enabled: z.boolean(),
  usage_bytes_30d: z.number(),
});

const MemberFacts = z.object({
  role: Role,
  status: z.enum(["ativo", "expulso"]),
  muted: z.boolean(),
  force_muted: z.boolean(),
  hand_raised_at: z.string().nullable(),
  last_seen_at: z.string().nullable(),
});

/** voice_room_access e voice_room_tick (sala inexistente: só `room: null`; a conta fecha por padrão). */
export const Facts = z.object({
  room: RoomFacts.nullable(),
  settings: SettingsFacts.nullable().default(null),
  member: MemberFacts.nullable().default(null),
  age_confirmed: z.boolean().default(false),
  steam_linked: z.boolean().default(false),
  account_blocked: z.boolean().default(true),
  banned_by_owner: z.boolean().default(false),
  party_now: z.boolean().default(false),
  battlepass: z.boolean().default(false),
  online_others: z.number().default(0),
  speakers: z.number().default(0),
  blocked: z.array(z.string()).default([]),
});

/** voice_room_snapshot: chaves curtas de propósito (é o que sai do banco a cada 3 s). */
export const SnapshotSchema = z.object({
  room: z.object({ status: z.string(), chat_open: z.boolean(), closes_at: z.string() }).nullable(),
  // "on" ausente vale como fora: um campo que falta nunca derruba o estado da sala inteira.
  // mv: o canal para onde o dono moveu a pessoa (por 60 s; só vai no estado dela).
  members: z.array(z.object({ u: z.string(), r: Role, m: z.boolean(), f: z.boolean().optional(), h: z.string().optional(), on: z.boolean().default(false), mv: z.string().optional() })),
  tracks: z.array(z.object({
    s: z.string(), u: z.string(), n: z.string(), k: z.enum(["audio", "video"]), t: z.enum(["voz", "tela", "tela_audio"]),
    q: z.enum(["leve", "padrao", "alta", "fluida"]).optional(),
  })),
  chat: z.array(z.object({ i: z.number(), u: z.string().nullable(), b: z.string(), a: z.string() })),
  deleted: z.array(z.number()),
  removed: z.array(z.string()),
});

/** voice_room_identities: nome e avatar por id (sem as chaves nulas). */
export const Identidades = z.record(
  z.string(),
  z.object({ username: z.string().optional(), avatarUrl: z.string().optional(), steamPersona: z.string().optional(), steamAvatar: z.string().optional() })
);

/** voice_channel_list (migration 198): os canais abertos do servidor e quem está nos de voz. */
export const CanalBrutoSchema = z.object({
  id: z.string(),
  k: z.enum(["palco", "texto"]),
  t: z.string(),
  p: z.number(),
  v: z.enum(["palco", "livre"]),
  a: z.enum(["todos", "beneficio"]),
  o: z.string(),
  c: z.boolean(),
  n: z.number(),
  // Limite de pessoas (migration 200); sem a chave, o padrão da sala pública.
  x: z.number().default(30),
  m: z.array(z.object({
    u: z.string(), r: Role, mu: z.boolean(), s: z.boolean().optional(),
    nm: z.string().optional(), av: z.string().optional(), sp: z.string().optional(), sa: z.string().optional(),
  })).optional(),
});
export const ListaDeCanaisSchema = z.array(CanalBrutoSchema);
export type CanalBruto = z.infer<typeof CanalBrutoSchema>;

/** voice_private_rooms (migration 198): as salas privadas que a pessoa vê na lista. */
export const PrivadaBrutaSchema = z.object({ id: z.string(), k: z.enum(["mentoria", "party"]), t: z.string(), o: z.string(), n: z.number() });
export const SalasPrivadasSchema = z.array(PrivadaBrutaSchema);
export type PrivadaBruta = z.infer<typeof PrivadaBrutaSchema>;

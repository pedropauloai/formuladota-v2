"use server";
// Server Actions de friendships (Phase 9 — D-31).
// RLS já filtra por auth.uid() — Server Action é defesa em profundidade
// + validação Zod + auth check + erro descritivo.
//
// D-31 manda 5 actions: sendFriendRequest, acceptFriendRequest,
// rejectFriendRequest, removeFriend, blockUser.
//
// Per decisão Pedro plan 09-03: rejected = DELETE imediato (sem manter row 7d).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUIDSchema = z.string().uuid("ID inválido");

// ---------------------------------------------------------------------------
// sendFriendRequest
// ---------------------------------------------------------------------------

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(addresseeId);
  if (!parsed.success) throw new Error("ID inválido");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  if (user.id === parsed.data) {
    throw new Error("Você não pode adicionar a si mesmo");
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: parsed.data,
    status: "pending",
  });

  if (error) {
    // 23505 = unique_violation (constraint unique_pair pegou duplicata bidirecional)
    if (error.code === "23505") {
      throw new Error("Já existe um pedido entre vocês");
    }
    console.error("[sendFriendRequest] error:", error);
    throw new Error("Não foi possível enviar o pedido");
  }

  revalidatePath("/me");
  revalidatePath("/", "layout"); // FriendsList global na sidebar
}

// ---------------------------------------------------------------------------
// acceptFriendRequest — só addressee pode aceitar, e só se status=pending
// ---------------------------------------------------------------------------

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(friendshipId);
  if (!parsed.success) throw new Error("ID inválido");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { data, error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", parsed.data)
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .select("id")
    .single();

  if (error || !data) {
    console.error("[acceptFriendRequest] error:", error);
    throw new Error("Pedido não encontrado ou já respondido");
  }

  revalidatePath("/me");
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// rejectFriendRequest — DELETE imediato (decisão Pedro plan 09-03)
// ---------------------------------------------------------------------------

export async function rejectFriendRequest(friendshipId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(friendshipId);
  if (!parsed.success) throw new Error("ID inválido");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", parsed.data)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("[rejectFriendRequest] error:", error);
    throw new Error("Não foi possível recusar o pedido");
  }

  revalidatePath("/me");
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// removeFriend — qualquer participante pode remover, independente de status
// ---------------------------------------------------------------------------

export async function removeFriend(friendshipId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(friendshipId);
  if (!parsed.success) throw new Error("ID inválido");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // RLS DELETE policy garante: requester_id = auth.uid() OR addressee_id = auth.uid()
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", parsed.data);

  if (error) {
    console.error("[removeFriend] error:", error);
    throw new Error("Não foi possível remover a amizade");
  }

  revalidatePath("/me");
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// blockUser — D-31 5ª action mandatória
// ---------------------------------------------------------------------------
// Bloqueia user X (parâmetro = userId do alvo, NÃO friendshipId).
// Comportamento:
//   1. Se friendship A↔B existe (qualquer status) → UPDATE status='blocked'
//      e força requester_id = auth.uid() (quem bloqueia detém autoridade)
//   2. Se não existe → INSERT (requester=auth.uid(), addressee=userId, status='blocked')
//   3. Unique constraint funcional (LEAST/GREATEST) garante 1 row por par
//
// V2: lógica de "unblock", workflow de moderação, notificação ao bloqueado.
// MVP: bloqueio simples — user bloqueado não aparece em listas/sugestões via
// filtros nas queries (getAcceptedFriends ignora status='blocked').

export async function blockUser(userId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(userId);
  if (!parsed.success) throw new Error("ID inválido");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  if (user.id === parsed.data) {
    throw new Error("Você não pode bloquear a si mesmo");
  }

  // Procura friendship existente em qualquer direção (RLS + unique_pair)
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data}),` +
        `and(requester_id.eq.${parsed.data},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) {
    // Atualiza status, mantendo a ordem original (unique_pair LEAST/GREATEST
    // tolera quem é requester/addressee — apenas o par importa).
    const { error: updateError } = await supabase
      .from("friendships")
      .update({ status: "blocked" })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[blockUser] update error:", updateError);
      throw new Error("Não foi possível bloquear o usuário");
    }
  } else {
    // Insere nova friendship blocked
    const { error: insertError } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: parsed.data,
      status: "blocked",
    });

    if (insertError) {
      // 23505 race condition: outra request inseriu primeiro
      if (insertError.code === "23505") {
        throw new Error("Operação concorrente — tente novamente");
      }
      console.error("[blockUser] insert error:", insertError);
      throw new Error("Não foi possível bloquear o usuário");
    }
  }

  revalidatePath("/me");
  revalidatePath("/", "layout");
}

"use client";

// RealtimeAuthSync — seta o access token do usuário na conexão de REALTIME.
// Sem UI. Montado uma vez no layout root.
//
// POR QUÊ (crítico, 2026-06-30): a entrega de eventos realtime via postgres_changes
// respeita a RLS da tabela avaliando auth.uid() com o token que o CLIENT de realtime
// carrega. Se esse token não for setado, auth.uid() é nulo → a RLS nega → NENHUM
// evento é entregue a outros usuários (membro que entra no grupo, mensagem nova...),
// e só "atualiza" com F5 (que refaz tudo no servidor). Aqui garantimos o token
// atual no realtime e o mantemos fresco a cada refresh/login/logout.

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function RealtimeAuthSync() {
  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getSession().then(({ data }) => {
      supabase.realtime.setAuth(data.session?.access_token ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      supabase.realtime.setAuth(session?.access_token ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}

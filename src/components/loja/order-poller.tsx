"use client";

// Consulta o pedido enquanto ele espera pagamento: a cada 4 s nos primeiros 15 minutos, depois a
// cada 30 s. Quando o status muda, recarrega a página do servidor.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { consultarPedido } from "@/app/loja/actions";

const FAST_MS = 4000;
const SLOW_MS = 30000;
const FAST_WINDOW_MS = 15 * 60 * 1000;

export function OrderPoller({ orderId }: { orderId: string }) {
  const router = useRouter();
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    startedAt.current ??= Date.now();

    async function tick() {
      if (stopped) return;
      const result = await consultarPedido(orderId).catch(() => null);
      if (stopped) return;
      if (result && result.status !== "pendente") {
        router.refresh();
        return;
      }
      const elapsed = Date.now() - (startedAt.current ?? Date.now());
      timer = setTimeout(tick, elapsed < FAST_WINDOW_MS ? FAST_MS : SLOW_MS);
    }

    timer = setTimeout(tick, FAST_MS);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, router]);

  return null;
}

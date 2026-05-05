// Bottom Bar do dashboard — replica footer do Dota 2 client com Play button gigante.
// Esquerda: avatar mini + status text + chat input placeholder
// Centro: counter players online (placeholder)
// Direita: BOTÃO GIGANTE "JOGAR" — vermelho FORMULADOTA (substitui amarelo "Jogar Dota" do oficial)

import Link from "next/link";
import { Play, MessageSquare, Users } from "lucide-react";

interface Props {
  persona: string;
  avatar: string | null;
  subActive: boolean;
  isAdmin: boolean;
}

export function DashboardBottomBar({ persona, avatar, subActive, isAdmin }: Props) {
  // Texto do botão muda conforme estado
  const playLabel = !subActive && !isAdmin ? "Ativar mensalidade" : "Criar lobby";
  const playHref = !subActive && !isAdmin ? "/assinatura" : "/criar-lobby";

  return (
    <footer className="relative z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border)] bg-gradient-to-t from-black/95 to-black/80 px-3 backdrop-blur-md xl:h-20 xl:px-6">
      {/* Esquerda — Avatar mini + status + chat input */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="size-9 shrink-0 rounded-full border border-[var(--color-border)]"
          />
        ) : (
          <div className="size-9 shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-card)]" />
        )}
        <div className="hidden md:flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-2 flex-1 max-w-md">
          <MessageSquare size={12} className="text-white/40 shrink-0" aria-hidden="true" />
          <input
            type="text"
            placeholder={`Mensagem como ${persona}...`}
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
            disabled
            aria-label="Chat (em breve)"
          />
          <span className="font-mono text-[10px] text-white/30 shrink-0">0/256</span>
        </div>
      </div>

      {/* Centro — Counter (placeholder) */}
      <div className="hidden xl:flex items-center gap-3 px-4">
        <div className="flex items-center gap-1.5 text-white/50">
          <Users size={12} aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-widest">
            Online · em breve
          </span>
        </div>
      </div>

      {/* Direita — BOTÃO GIGANTE "JOGAR" */}
      <Link
        href={playHref}
        className="group relative flex h-12 items-center gap-2 overflow-hidden rounded-md border-2 border-[var(--color-brand-red)] bg-gradient-to-b from-[var(--color-brand-red)] to-[var(--color-brand-red-dark)] px-6 font-display text-base font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-[var(--color-brand-red)]/30 transition-all hover:scale-[1.02] hover:shadow-[var(--color-brand-red)]/50 xl:h-14 xl:px-10 xl:text-lg xl:tracking-[0.3em]"
      >
        <Play size={18} fill="currentColor" aria-hidden="true" />
        <span>{playLabel}</span>
        {/* Shine effect */}
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          aria-hidden="true"
        />
      </Link>
    </footer>
  );
}

"use client";

// Compra da vaga na fila: preço e vagas abertas no topo, a vez de quem já comprou, o Pix pendente
// e o botão. Quem está logado com a Steam vinculada compra em dois toques: "Garantir minha vaga"
// e "Copiar código Pix". Sem login ou sem Steam, o botão leva a resolver isso e voltar. Quem tem o
// Battlepass entra na fila sem pagar, com um toque; quem não tem vê o convite para conhecer. A vaga
// vale o dia (migration 194): quem já tem uma de pé vê a nota no lugar da compra.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock, Crown, LogIn, Minus, Plus } from "lucide-react";
import { useSound } from "@/lib/sound/hooks";
import { formatPrice } from "@/lib/loja/money";
import { entrarComBattlepass, garantirVaga } from "@/app/party/actions";
import type { MyQueueEntry, PublicLive, QueueView } from "@/lib/loja/fila/model";
import { CtaWarp, Panel, Price, plate } from "@/components/v2";
import { cn } from "@/lib/utils";
import { MyEntryCard, PendingPayment } from "./my-status";

export interface FilaViewer {
  loggedIn: boolean;
  hasSteam: boolean;
  /** ID de amigo do Dota de quem está logado (pela Steam vinculada). */
  dotaId: string | null;
  /** Chave pública do Mercado Pago: abre o formulário de cartão dentro da página. */
  mpPublicKey: string | null;
}

export interface FilaOffer {
  priceCents: number;
  maxQuantity: number;
  onSale: boolean;
}


function SeatsLine({ live, priceCents }: { live: PublicLive | null; priceCents: number }) {
  const t = useTranslations("fila");
  const open = live?.seatsOpen ?? 0;
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <Price cents={priceCents} unit={t("perDay")} className="text-[2.8rem]" />
      {live && (
        <p data-fila-vagas={open} className={`text-sm font-medium ${open > 0 ? "text-play-primary" : "text-error"}`}>
          {t("seatsOpen", { count: open })}
        </p>
      )}
    </div>
  );
}

function Gate({ href, label, text }: { href: string; label: string; text: string }) {
  return (
    <div className="space-y-3">
      <a href={href} className={plate({ kind: "brand", block: true })}>
        <CtaWarp />
        <LogIn size={18} aria-hidden="true" /> {label}
      </a>
      <p className="text-xs leading-relaxed text-text-muted">{text}</p>
    </div>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  const t = useTranslations("fila");
  const button = cn(plate({ kind: "ghost" }), "size-11 px-0");
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-text-body">{t("matchesLabel")}</span>
      <div className="flex items-center gap-2">
        <button type="button" className={button} aria-label={t("fewer")} disabled={value <= 1} onClick={() => onChange(value - 1)}>
          <Minus size={16} aria-hidden="true" />
        </button>
        <output aria-live="polite" className="w-8 text-center font-display-condensed text-[2.2rem] leading-none text-text-display">{value}</output>
        <button type="button" className={button} aria-label={t("more")} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Compra em andamento e erro da última tentativa, guardados na caixa e não no formulário. */
interface PurchaseState {
  buying: boolean;
  setBuying: (buying: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

interface BuyFormProps {
  max: number;
  priceCents: number;
  initialQuantity: number;
  /** Fila aberta sem live: a nota diz que a fila anda quando a live começar. */
  openQueue: boolean;
  onBought: () => Promise<void>;
  state: PurchaseState;
}

function BuyForm({ max, priceCents, initialQuantity, openQueue, onBought, state }: BuyFormProps) {
  const t = useTranslations("fila");
  const play = useSound();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [, startTransition] = useTransition();
  const count = Math.max(1, Math.min(quantity, max));
  const pending = state.buying;

  const buy = (method: "pix" | "cartao") => {
    state.setBuying(true);
    state.setError(null);
    startTransition(async () => {
      const result = await garantirVaga(count, method).catch(() => ({ ok: false as const, error: "pagamento" as const }));
      if (!result.ok) {
        play("error");
        state.setError(t(`errors.${result.error}`));
        state.setBuying(false);
        // A contagem de vagas da tela pode estar atrasada: atualiza já, junto com o aviso.
        await onBought();
        return;
      }
      // Cartão: o pedido fica pendente e o formulário do Mercado Pago abre aqui mesmo, no lugar do Pix.
      play("confirm");
      await onBought();
      state.setBuying(false);
    });
  };

  return (
    <div id="fila-comprar" className="space-y-3">
      {max > 1 && <Stepper value={count} max={max} onChange={setQuantity} />}
      <button type="button" data-fila-comprar="pix" disabled={pending} onClick={() => buy("pix")} className={plate({ kind: "cta", large: true, block: true })}>
        <CtaWarp />
        {pending ? t("buying") : t("buy", { price: formatPrice(priceCents * count) })}
      </button>
      <button type="button" data-fila-comprar="cartao" disabled={pending} onClick={() => buy("cartao")} className="w-full text-center text-sm text-text-muted underline-offset-2 hover:text-text-display hover:underline">
        {t("buyCard")}
      </button>
      <p className="text-xs leading-relaxed text-text-muted">{t(openQueue ? "buyNoteOpenQueue" : "buyNote")}</p>
    </div>
  );
}

function PurchaseError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-sm border border-error/40 bg-error/10 p-2 text-sm text-text-body">
      {error}
    </p>
  );
}

/** Assinante do Battlepass: entra na fila sem pagar (uma entrada por vez, a fila anda pelo revezamento). */
function BattlepassJoin({ onJoined, state }: { onJoined: () => Promise<void>; state: PurchaseState }) {
  const t = useTranslations("fila");
  const play = useSound();
  const [, startTransition] = useTransition();
  const join = () => {
    state.setBuying(true);
    state.setError(null);
    startTransition(async () => {
      const result = await entrarComBattlepass().catch(() => ({ ok: false as const, error: "entrar" as const }));
      if (!result.ok) {
        play("error");
        state.setError(t(`battlepass.errors.${result.error}`));
        state.setBuying(false);
        await onJoined();
        return;
      }
      play("confirm");
      await onJoined();
      state.setBuying(false);
    });
  };
  return (
    <div className="space-y-3">
      <button type="button" data-fila-battlepass disabled={state.buying} onClick={join} className={plate({ kind: "cta", large: true, block: true })}>
        <CtaWarp />
        <Crown size={18} aria-hidden="true" /> {state.buying ? t("battlepass.joining") : t("battlepass.join")}
      </button>
      <p className="text-xs leading-relaxed text-text-muted">{t("battlepass.joinNote")}</p>
    </div>
  );
}

/** Quem não tem o Battlepass vê, embaixo da compra, que dá para entrar sem pagar a vaga. */
function BattlepassInvite() {
  const t = useTranslations("fila");
  return (
    <a href="/planos" data-fila-battlepass-convite className="flex items-start gap-3 rounded-sm border border-gold/30 bg-gold/5 p-3 text-sm leading-relaxed text-text-body hover:border-gold/60">
      <Crown size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
      <span>
        {t("battlepass.invite")} <span className="font-medium text-gold underline-offset-2 hover:underline">{t("battlepass.inviteCta")}</span>
      </span>
    </a>
  );
}

/** Fila sem venda agora: a caixa diz quando abre, no lugar do botão. */
function ClosedNote({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-3 rounded-sm border border-border-subtle bg-bg-deep/60 p-3 text-sm leading-relaxed text-text-muted">
      <CalendarClock size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
      {text}
    </p>
  );
}

interface PurchaseProps {
  live: PublicLive | null;
  viewer: FilaViewer;
  offer: FilaOffer;
  initialQuantity: number;
  onBought: () => Promise<void>;
  state: PurchaseState;
  /** Quem olha tem o Battlepass ativo. */
  battlepass: boolean;
  /** Quem olha já tem uma entrada de pé na fila (ou na party). */
  inQueue: boolean;
  /** A entrada de pé é uma vaga do dia: ela já joga a live inteira, então a compra some. */
  dayPassActive: boolean;
}

function Purchase({ live, viewer, offer, initialQuantity, onBought, state, battlepass, inQueue, dayPassActive }: PurchaseProps) {
  const t = useTranslations("fila");
  if (!offer.onSale) return <ClosedNote text={t("errors.fechada")} />;
  // Sem nenhuma fila (a fila aberta saiu do banco): as vagas abrem quando o Pedro abrir a live.
  if (!live) return <ClosedNote text={t("closedText")} />;
  const openQueue = live.status === "fila";
  // O assinante não ocupa a lotação da vaga paga: entra mesmo com a fila esgotada para quem compra.
  if (battlepass) {
    if (inQueue) return <p className="text-xs leading-relaxed text-text-muted">{t("battlepass.inQueueNote")}</p>;
    if (!viewer.hasSteam) return <Gate href="/vincular/steam?next=%2Fparty" label={t("steamCta")} text={t("steamText")} />;
    return <BattlepassJoin onJoined={onBought} state={state} />;
  }
  if (dayPassActive) {
    return (
      <p data-fila-vaga-do-dia className="text-xs leading-relaxed text-text-muted">
        {t("dayPassNote")}
      </p>
    );
  }
  // Esgotado vem antes do login: o botão de entrar prometeria uma vaga que não existe agora. Com a
  // compra da própria pessoa em andamento, o formulário fica: a vaga contada pode ser a dela.
  if (live.seatsOpen === 0 && !state.buying) {
    return (
      <div className="space-y-2">
        <button type="button" disabled className={plate({ kind: "ghost", block: true })}>
          {t("soldOut")}
        </button>
        <p className="text-xs leading-relaxed text-text-muted">{t(openQueue ? "soldOutTextOpenQueue" : "soldOutText")}</p>
      </div>
    );
  }
  if (!viewer.loggedIn) return <Gate href="/login?next=%2Fparty" label={t("loginCta")} text={t("loginText")} />;
  if (!viewer.hasSteam) return <Gate href="/vincular/steam?next=%2Fparty" label={t("steamCta")} text={t("steamText")} />;
  return (
    <>
      <BuyForm
        max={Math.min(offer.maxQuantity, live.seatsOpen)}
        priceCents={offer.priceCents}
        initialQuantity={initialQuantity}
        openQueue={openQueue}
        onBought={onBought}
        state={state}
      />
      <BattlepassInvite />
    </>
  );
}

/** As entradas que a pessoa vê: as ativas; sem nenhuma, só a última que terminou. */
function visibleEntries(entries: MyQueueEntry[]): MyQueueEntry[] {
  const active = entries.filter((e) => e.state === "aguardando" || e.state === "na_party");
  if (active.length > 0) return active;
  return entries.slice(-1);
}

interface BuyBoxProps {
  view: QueueView;
  viewer: FilaViewer;
  offer: FilaOffer;
  initialQuantity: number;
  onBought: () => Promise<void>;
}

export function BuyBox({ view, viewer, offer, initialQuantity, onBought }: BuyBoxProps) {
  const live = view.queue.live;
  const mine = view.mine;
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state: PurchaseState = { buying, setBuying, error, setError };
  const active = mine?.entries.filter((e) => e.state === "aguardando" || e.state === "na_party") ?? [];
  return (
    <Panel tone="gold" shadow="gold" data-fila-live={live?.status ?? "fechada"} className="space-y-4 p-4 md:p-5">
      <SeatsLine live={live} priceCents={offer.priceCents} />
      {mine &&
        visibleEntries(mine.entries).map((entry) => (
          <MyEntryCard key={entry.id} entry={entry} dotaId={viewer.dotaId} onAir={live?.status === "ao_vivo"} onChanged={onBought} />
        ))}
      {mine?.pending && <PendingPayment pending={mine.pending} publicKey={viewer.mpPublicKey} onChanged={onBought} />}
      {/* Com pagamento pendente (Pix ou cartão) a compra some: o pedido aberto é o caminho. */}
      {mine?.pending ? null : (
        <Purchase
          live={live}
          viewer={viewer}
          offer={offer}
          initialQuantity={initialQuantity}
          onBought={onBought}
          state={state}
          battlepass={mine?.battlepass === true}
          inQueue={active.length > 0}
          dayPassActive={active.some((e) => e.dayPass)}
        />
      )}
      <div id="fila-erro">
        <PurchaseError error={mine?.pending ? null : error} />
      </div>
    </Panel>
  );
}

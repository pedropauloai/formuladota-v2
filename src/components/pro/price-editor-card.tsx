"use client";

// PriceEditorCard — Editor de preço de ficha para PROs FormulaDota.
//
// Client Component: PRO pode ajustar preço dentro dos guardrails do tier HONOR.
//
// Guardrails aplicados (via Server Action):
// - Floor: R$ 10 (universal anti-dumping)
// - Ceiling: escalonado por tier HONOR (R$ 25 → 35 → 45 → 50, Pedro = R$ 100)
// - Cooldown: 30 dias entre mudanças
// - Razão obrigatória (min 10 chars)
//
// Preço é compromisso, não marketing. Subir tier HONOR destrava ceiling maior.
//
// Decisão Pedro 2026-05-23: sistema descentralizado com transparência sagrada.

import { useState, useTransition } from "react";
import { Calendar, TrendingUp, Info, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateMyPackagePrice } from "@/app/pro/pricing-actions";

// ---------------------------------------------------------------------------
// Mapa de labels legíveis por tier HONOR
// ---------------------------------------------------------------------------

const TIER_LABELS: Record<string, string> = {
  aprendiz: "Aprendiz",
  disciplinado: "Disciplinado",
  confiavel: "Confiável",
  respeitado: "Respeitado",
  honrado: "Honrado",
  mestre: "Mestre",
  lendario: "Lendário",
  "imortal-da-formula": "Imortal da Fórmula",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PriceHistoryEntry {
  priceBefore: number;
  priceAfter: number;
  reason: string | null;
  honorTierAtChange: string | null;
  changedAt: string;
}

export interface PriceEditorCardProps {
  packageId: string;
  packageName: string;
  currentPrice: number;
  maxAllowed: number;
  honorTier: string;
  honorScore: number;
  canChangeNow: boolean;
  nextChangeAt: string | null;
  daysRemaining: number;
  history: PriceHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function PriceEditorCard({
  packageId,
  packageName,
  currentPrice,
  maxAllowed,
  honorTier,
  honorScore,
  canChangeNow,
  nextChangeAt,
  daysRemaining,
  history,
}: PriceEditorCardProps) {
  const [newPrice, setNewPrice] = useState<number>(currentPrice);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const tierLabel = TIER_LABELS[honorTier] ?? honorTier;
  const isDisabled = !canChangeNow || isPending;
  const reasonValid = reason.trim().length >= 10;
  const priceChanged = newPrice !== currentPrice;
  const canSubmit = isDisabled === false && reasonValid && priceChanged;

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      // Garante que o valor não ultrapasse o ceiling (UI side)
      setNewPrice(Math.min(Math.max(10, val), maxAllowed));
    }
  }

  function handleSubmit() {
    setFeedbackMsg(null);
    startTransition(async () => {
      const result = await updateMyPackagePrice({ packageId, newPrice, reason });
      if (result.success) {
        setFeedbackMsg({ type: "success", text: "Preço atualizado. Histórico registrado." });
        setReason("");
      } else {
        setFeedbackMsg({ type: "error", text: result.error ?? "Erro ao atualizar preço." });
      }
    });
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6 flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base uppercase tracking-widest text-text-display">
            {packageName}
          </h3>
          <p className="text-sm text-text-muted mt-0.5 font-mono">
            Preço atual:{" "}
            <span className="text-brand-cyan font-semibold">
              R$ {currentPrice.toFixed(2)}
            </span>
          </p>
        </div>

        {/* Badge de tier HONOR */}
        <div className="flex items-center gap-1.5 shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
          <span className="text-sm text-text-muted uppercase tracking-wider">
            {tierLabel}
          </span>
          <span className="text-sm font-mono text-text-subtle">
            ({honorScore} pts)
          </span>
        </div>
      </div>

      {/* Limite de preço pelo tier HONOR */}
      <div className="flex items-start gap-2 rounded-lg bg-bg-base border border-border-subtle p-3">
        <Info className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-text-body">
          Seu tier <strong className="text-text-display">{tierLabel}</strong> permite cobrar entre{" "}
          <span className="font-mono text-brand-cyan">R$ 10,00</span> e{" "}
          <span className="font-mono text-brand-cyan">R$ {maxAllowed.toFixed(2)}</span>.{" "}
          Subir de tier HONOR destrava um ceiling maior.
        </p>
      </div>

      {/* Cooldown ativo */}
      {!canChangeNow && (
        <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 p-3">
          <Clock className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm text-warning font-medium">
              Cooldown ativo — {daysRemaining} dia{daysRemaining !== 1 ? "s" : ""} restantes
            </p>
            {nextChangeAt && (
              <p className="text-sm text-text-muted mt-0.5 font-mono">
                Próxima mudança permitida em:{" "}
                {new Date(nextChangeAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            <p className="text-sm text-text-muted mt-1">
              Preço é compromisso. O cooldown de 30 dias protege seus alunos de instabilidade.
            </p>
          </div>
        </div>
      )}

      {/* Formulário de edição */}
      <fieldset disabled={isDisabled} className="flex flex-col gap-4">
        <legend className="sr-only">Editar preço do package</legend>

        {/* Input de preço */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`price-input-${packageId}`}
            className="text-sm uppercase tracking-wider text-text-muted"
          >
            Novo preço (R$)
          </label>
          <div className="flex items-center gap-3">
            <input
              id={`price-input-${packageId}`}
              type="number"
              min={10}
              max={maxAllowed}
              step={1}
              value={newPrice}
              onChange={handlePriceChange}
              disabled={isDisabled}
              className={cn(
                "w-32 rounded-lg border border-border-subtle bg-bg-base px-3 py-2",
                "text-text-body font-mono text-sm",
                "focus:outline-none focus:ring-2 focus:ring-brand-cyan/50",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-describedby={`price-range-${packageId}`}
            />
            <input
              type="range"
              min={10}
              max={maxAllowed}
              step={1}
              value={newPrice}
              onChange={handlePriceChange}
              disabled={isDisabled}
              className={cn(
                "flex-1 accent-brand-cyan",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label="Slider de preço"
            />
            <span className="text-sm font-mono text-text-muted shrink-0" id={`price-range-${packageId}`}>
              máx R$ {maxAllowed.toFixed(0)}
            </span>
          </div>

          {/* Escala visual do range */}
          <div className="flex justify-between text-sm text-text-subtle font-mono px-0.5">
            <span>R$ 10</span>
            <span>R$ {maxAllowed.toFixed(0)}</span>
          </div>
        </div>

        {/* Razão obrigatória */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`reason-input-${packageId}`}
            className="text-sm uppercase tracking-wider text-text-muted"
          >
            Justificativa da mudança{" "}
            <span className="text-text-subtle font-normal normal-case">(obrigatória, 10–500 chars)</span>
          </label>
          <textarea
            id={`reason-input-${packageId}`}
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isDisabled}
            placeholder="Ex: Subi de Honrado para Mestre, justificando ceiling maior. Continuarei entregando valor proporcional ao preço."
            className={cn(
              "w-full rounded-lg border border-border-subtle bg-bg-base px-3 py-2",
              "text-text-body text-sm resize-none",
              "placeholder:text-text-subtle",
              "focus:outline-none focus:ring-2 focus:ring-brand-cyan/50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <div className="flex justify-between items-center">
            <span
              className={cn(
                "text-sm font-mono",
                reason.trim().length < 10 ? "text-text-subtle" : "text-success"
              )}
            >
              {reason.trim().length}/500
              {reason.trim().length < 10 && ` (mínimo ${10 - reason.trim().length} caracteres)`}
            </span>
          </div>
        </div>

        {/* Feedback */}
        {feedbackMsg && (
          <p
            role="alert"
            className={cn(
              "text-sm rounded-lg px-3 py-2 border",
              feedbackMsg.type === "success"
                ? "text-success bg-success/10 border-success/30"
                : "text-error bg-error/10 border-error/30"
            )}
          >
            {feedbackMsg.text}
          </p>
        )}

        {/* Botão de ação */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant="primary"
          size="sm"
          className="self-start"
          aria-busy={isPending}
        >
          {isPending ? "Atualizando..." : "Atualizar preço"}
        </Button>
      </fieldset>

      {/* Disclaimer filosófico */}
      <p className="text-sm text-text-subtle italic border-t border-border-subtle pt-4">
        Preço é compromisso, não marketing. Cobrar mais exige entregar mais. O cooldown de 30 dias
        protege seus alunos de instabilidade. Subir tier HONOR destrava ceiling maior — a reputação
        precede o preço.
      </p>

      {/* Histórico de mudanças */}
      {history.length > 0 && (
        <div className="border-t border-border-subtle pt-4">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-sm uppercase tracking-wider text-text-muted hover:text-text-body transition-colors"
            aria-expanded={showHistory}
            aria-controls={`history-${packageId}`}
          >
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            Histórico de preços ({history.length})
            {showHistory ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          {showHistory && (
            <div
              id={`history-${packageId}`}
              className="mt-3 flex flex-col gap-2"
              role="list"
              aria-label="Histórico de mudanças de preço"
            >
              {history.map((entry, idx) => (
                <div
                  key={idx}
                  role="listitem"
                  className="rounded-lg border border-border-subtle bg-bg-base p-3 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-text-subtle line-through">
                      R$ {entry.priceBefore.toFixed(2)}
                    </span>
                    <span className="text-text-subtle">→</span>
                    <span className="font-mono text-sm font-semibold text-brand-cyan">
                      R$ {entry.priceAfter.toFixed(2)}
                    </span>
                    {entry.honorTierAtChange && (
                      <span className="text-sm text-text-subtle">
                        ({TIER_LABELS[entry.honorTierAtChange] ?? entry.honorTierAtChange})
                      </span>
                    )}
                    <span className="ml-auto text-sm font-mono text-text-subtle">
                      {new Date(entry.changedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="text-sm text-text-muted italic">{entry.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

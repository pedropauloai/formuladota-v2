"use client";

// Modais client do painel /admin/users/[id]:
//   - AdjustFichasModal: ajuste de saldo (reutiliza lógica existente)
//   - ApplyStrikeModal: aplicar strike leve/grave
//   - HonorBonusModal: conceder bonus de honor
//   - GrantAchievementModal: conceder achievement
//   - PromoveCoachModal: promover a PRO
//   - RevokeCoachModal: revogar status PRO
//   - CoachNotesModal: notas privadas admin (leitura/edição via admin_notes)

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Coins, ShieldAlert, Star, Trophy, ChevronUp, ChevronDown,
  Loader2, X, CheckCircle, AlertCircle, RefreshCw,
} from "lucide-react";
import {
  adjustUserFichasAdmin,
  applyStrike,
  applyHonorBonus,
  grantAchievement,
  swapSteamLink,
  updateUsernameAdmin,
  updateUserRegionAdmin,
  setSeasonMmrAdmin,
  setBanStatusAdmin,
  setUserAccessAdmin,
} from "@/app/admin/users/actions";
import { Pencil } from "lucide-react";
import {
  promoveCoach,
  revokeCoachStatus,
} from "@/app/actions/pro-management";
import { saveAdminNotes } from "@/app/admin/users/notes-actions";
import { GAME_REGIONS, REGION_LABELS } from "@/lib/regions";

// ─── Modal base reutilizável ─────────────────────────────────────────────────

function ModalBase({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("misc2");
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-md border border-border-subtle bg-bg-elevated p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            {eyebrow && (
              <p className="font-display font-semibold text-sm uppercase tracking-wide text-brand-primary mb-1">
                {eyebrow}
              </p>
            )}
            <h2 className="font-display text-xl uppercase text-text-display">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-faded hover:text-text-muted transition-colors ml-4 mt-0.5"
            aria-label={t("closeModal")}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Campos reutilizáveis
function FormLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block font-display font-semibold text-sm uppercase tracking-wide text-text-faded mb-2">
      {children}
    </label>
  );
}

function FormTextarea({ id, value, onChange, placeholder, rows = 3 }: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-sans text-sm text-text-body placeholder:text-text-faded focus:outline-none focus:border-brand-primary/60"
    />
  );
}

function StatusMsg({ type, msg }: { type: "error" | "success"; msg: string }) {
  return (
    <div className={`flex items-center gap-2 font-mono text-sm ${type === "error" ? "text-error" : "text-emerald-400"}`}>
      {type === "error" ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
      {msg}
    </div>
  );
}

function ModalActions({
  pending,
  onClose,
  onConfirm,
  confirmLabel,
  confirmCls,
  disabled,
}: {
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmCls?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("misc2");
  return (
    <div className="flex items-center justify-end gap-3 mt-6">
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="rounded-md px-4 py-2 font-sans text-sm uppercase tracking-widest text-text-faded hover:text-text-muted transition-colors"
      >
        {t("close")}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending || disabled}
        className={`inline-flex items-center gap-2 rounded-md px-5 py-2 font-sans text-sm font-semibold uppercase tracking-widest text-white transition-colors disabled:opacity-50 ${confirmCls ?? "bg-brand-primary hover:bg-brand-primary/80"}`}
      >
        {pending && <Loader2 size={12} className="animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  );
}

// ─── AdjustFichasModal ───────────────────────────────────────────────────────

export function AdjustFichasModal({
  userId,
  username,
  currentBalance,
}: {
  userId: string;
  username: string;
  currentBalance: number;
}) {
  const t = useTranslations("misc2");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"grant" | "debit">("grant");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setError(null);
    setSuccess(null);
    setAmount("1");
    setReason("");
    setMode("grant");
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    setError(null);
    setSuccess(null);
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setError(t("amountMustBePositive"));
      return;
    }
    const delta = mode === "grant" ? n : -n;
    startTransition(async () => {
      const res = await adjustUserFichasAdmin({ userId, delta, reason });
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(t("fichasAdjustedSuccess", { balance: res.newBalance }));
        setAmount("1");
        setReason("");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide text-emerald-400 hover:bg-emerald-500/15 transition-colors"
      >
        <Coins size={11} />
        {t("adjustFichas")}
      </button>

      <ModalBase open={open} onClose={close} eyebrow={t("ebFichas")} title={username}>
        <p className="font-display text-sm font-semibold text-text-body mb-4">
          {t("currentBalance")}{" "}
          <span className="text-text-body">{t("fichasCount", { count: currentBalance })}</span>
        </p>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(["grant", "debit"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 font-sans text-sm font-semibold uppercase tracking-widest transition-colors ${
                mode === m
                  ? m === "grant"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/60 bg-amber-500/10 text-amber-300"
                  : "border-border-subtle text-text-faded hover:text-text-muted"
              }`}
            >
              {m === "grant" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {m === "grant" ? t("add") : t("remove")}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <FormLabel htmlFor="fichas-amount">{t("quantity")}</FormLabel>
            <input
              id="fichas-amount"
              type="number"
              min="1"
              max="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-mono text-sm text-text-body"
            />
          </div>
          <div>
            <FormLabel htmlFor="fichas-reason">{t("reasonRequiredFem")}</FormLabel>
            <FormTextarea
              id="fichas-reason"
              value={reason}
              onChange={setReason}
              placeholder={t("fichasReasonPlaceholder2")}
            />
          </div>

          {error && <StatusMsg type="error" msg={error} />}
          {success && <StatusMsg type="success" msg={success} />}
        </div>

        <ModalActions
          pending={pending}
          onClose={close}
          onConfirm={submit}
          confirmLabel={`${mode === "grant" ? t("add") : t("remove")} ${amount || "0"}`}
          confirmCls={mode === "grant" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-amber-600 hover:bg-amber-500"}
          disabled={!reason.trim() || !amount}
        />
      </ModalBase>
    </>
  );
}

// ─── ApplyStrikeModal ────────────────────────────────────────────────────────

export function ApplyStrikeModal({
  targetUserId,
  username,
}: {
  targetUserId: string;
  username: string;
}) {
  const t = useTranslations("misc2");
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<"leve" | "grave">("leve");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setReason("");
    setSeverity("leve");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await applyStrike({ targetUserId, severity, reason });
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(t("strikeAppliedHonor"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/5 px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide text-red-400 hover:bg-red-500/15 transition-colors"
      >
        <ShieldAlert size={11} />
        {t("applyStrike")}
      </button>

      <ModalBase open={open} onClose={close} eyebrow={t("ebConduct")} title={t("strikeTitle", { name: username })}>
        <div className="space-y-4">
          <div>
            <FormLabel htmlFor="strike-severity">{t("severity")}</FormLabel>
            <div className="grid grid-cols-2 gap-2" id="strike-severity">
              {(["leve", "grave"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`rounded-md border px-3 py-2 font-sans text-sm font-semibold uppercase tracking-widest transition-colors ${
                    severity === s
                      ? s === "leve"
                        ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                        : "border-red-500/60 bg-red-500/10 text-red-300"
                      : "border-border-subtle text-text-faded hover:text-text-muted"
                  }`}
                >
                  {s === "leve" ? t("strikeLightHonor") : t("strikeHeavyHonor")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FormLabel htmlFor="strike-reason">{t("reasonRequired")}</FormLabel>
            <FormTextarea
              id="strike-reason"
              value={reason}
              onChange={setReason}
              placeholder={t("strikeReasonPlaceholder")}
            />
          </div>

          {error && <StatusMsg type="error" msg={error} />}
          {success && <StatusMsg type="success" msg={success} />}
        </div>

        <ModalActions
          pending={pending}
          onClose={close}
          onConfirm={submit}
          confirmLabel={t("applyStrike")}
          confirmCls="bg-red-600 hover:bg-red-500"
          disabled={!reason.trim()}
        />
      </ModalBase>
    </>
  );
}

// ─── HonorBonusModal ─────────────────────────────────────────────────────────

export function HonorBonusModal({
  targetUserId,
  username,
}: {
  targetUserId: string;
  username: string;
}) {
  const t = useTranslations("misc2");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setAmount("10");
    setReason("");
  }

  function submit() {
    setError(null);
    const n = parseInt(amount, 10);
    startTransition(async () => {
      const res = await applyHonorBonus({ targetUserId, amount: n, reason });
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(t("honorGrantedSuccess", { amount }));
        setAmount("10");
        setReason("");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-yellow-500/40 bg-yellow-500/5 px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide text-yellow-400 hover:bg-yellow-500/15 transition-colors"
      >
        <Star size={11} />
        {t("honorBonus")}
      </button>

      <ModalBase open={open} onClose={close} eyebrow={t("ebHonor")} title={t("bonusTitle", { name: username })}>
        <div className="space-y-4">
          <div>
            <FormLabel htmlFor="honor-amount">{t("pointsPositive")}</FormLabel>
            <input
              id="honor-amount"
              type="number"
              min="1"
              max="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-mono text-sm text-text-body"
            />
          </div>
          <div>
            <FormLabel htmlFor="honor-reason">{t("reasonRequired")}</FormLabel>
            <FormTextarea
              id="honor-reason"
              value={reason}
              onChange={setReason}
              placeholder={t("honorReasonPlaceholder")}
            />
          </div>

          {error && <StatusMsg type="error" msg={error} />}
          {success && <StatusMsg type="success" msg={success} />}
        </div>

        <ModalActions
          pending={pending}
          onClose={close}
          onConfirm={submit}
          confirmLabel={t("grantHonorCta", { amount: amount || "0" })}
          confirmCls="bg-yellow-600 hover:bg-yellow-500"
          disabled={!reason.trim() || !amount}
        />
      </ModalBase>
    </>
  );
}

// ─── GrantAchievementModal ───────────────────────────────────────────────────

const ACHIEVEMENT_VARIANTS = [
  "champion-s1", "champion-s2", "comendado", "fundador",
  "mentor", "veteran", "mvp", "top-player",
  "sem-strikes", "pontual", "motivador", "vanguard",
  "coach-recommended", "reformed", "guardian-da-formula",
];

export function GrantAchievementModal({
  targetUserId,
  username,
}: {
  targetUserId: string;
  username: string;
}) {
  const t = useTranslations("misc2");
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState(ACHIEVEMENT_VARIANTS[0] ?? "comendado");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setReason("");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await grantAchievement({ targetUserId, variant, reason });
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(t("achievementGrantedSuccess", { variant }));
        setReason("");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-yellow-500/40 bg-yellow-500/5 px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide text-yellow-400 hover:bg-yellow-500/15 transition-colors"
      >
        <Trophy size={11} />
        {t("grantAchievement")}
      </button>

      <ModalBase open={open} onClose={close} eyebrow={t("ebAchievement")} title={username}>
        <div className="space-y-4">
          <div>
            <FormLabel htmlFor="ach-variant">{t("variant")}</FormLabel>
            <select
              id="ach-variant"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-mono text-sm text-text-body"
            >
              {ACHIEVEMENT_VARIANTS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <FormLabel htmlFor="ach-reason">{t("reasonRequired")}</FormLabel>
            <FormTextarea
              id="ach-reason"
              value={reason}
              onChange={setReason}
              placeholder={t("achievementReasonPlaceholder")}
            />
          </div>

          {error && <StatusMsg type="error" msg={error} />}
          {success && <StatusMsg type="success" msg={success} />}
        </div>

        <ModalActions
          pending={pending}
          onClose={close}
          onConfirm={submit}
          confirmLabel={t("grant")}
          confirmCls="bg-yellow-600 hover:bg-yellow-500"
          disabled={!reason.trim()}
        />
      </ModalBase>
    </>
  );
}

// ─── PromoveCoachModal ───────────────────────────────────────────────────────

export function PromoveCoachModal({
  targetUserId,
  username,
  criteriosAtendidos,
}: {
  targetUserId: string;
  username: string;
  criteriosAtendidos: string[];
}) {
  const t = useTranslations("misc2");
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setNotes("");
  }

  function submit() {
    setError(null);
    if (!notes.trim()) {
      setError(t("promoNotesRequired"));
      return;
    }
    startTransition(async () => {
      const res = await promoveCoach({ targetUserId, promotionNotes: notes.trim() });
      if (!res.success) {
        setError(res.error ?? t("unknownError"));
      } else {
        setSuccess(t("promoSuccess", { name: username }));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-primary/60 bg-brand-primary/10 px-3 py-1.5 font-sans text-sm font-semibold uppercase tracking-widest text-brand-primary hover:bg-brand-primary/20 transition-colors"
      >
        <Trophy size={12} />
        {t("promoteToProBtn")}
      </button>

      <ModalBase open={open} onClose={close} eyebrow={t("ebProEligibility")} title={t("promoteTitle", { name: username })}>
        {criteriosAtendidos.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded mb-2">
              {t("criteriaMet")}
            </p>
            {criteriosAtendidos.map((c) => (
              <div key={c} className="flex items-center gap-2 font-mono text-sm text-emerald-400">
                <CheckCircle size={11} />
                {c}
              </div>
            ))}
          </div>
        )}

        <div>
          <FormLabel htmlFor="promo-notes">{t("promoNotesLabel")}</FormLabel>
          <FormTextarea
            id="promo-notes"
            value={notes}
            onChange={setNotes}
            placeholder={t("promoNotesPlaceholder")}
            rows={4}
          />
        </div>

        {error && <StatusMsg type="error" msg={error} />}
        {success && <StatusMsg type="success" msg={success} />}

        <ModalActions
          pending={pending}
          onClose={close}
          onConfirm={submit}
          confirmLabel={t("confirmPromotion")}
          disabled={!notes.trim()}
        />
      </ModalBase>
    </>
  );
}

// ─── RevokeCoachModal ────────────────────────────────────────────────────────

export function RevokeCoachModal({
  targetUserId,
  username,
}: {
  targetUserId: string;
  username: string;
}) {
  const t = useTranslations("misc2");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setReason("");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await revokeCoachStatus(targetUserId, reason);
      if (!res.success) {
        setError(res.error ?? t("unknownError"));
      } else {
        setSuccess(t("proStatusRevoked"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/5 px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide text-red-400 hover:bg-red-500/15 transition-colors"
      >
        <ShieldAlert size={11} />
        {t("revokeProStatus")}
      </button>

      <ModalBase open={open} onClose={close} eyebrow="PRO" title={t("revokeTitle", { name: username })}>
        <div>
          <FormLabel htmlFor="revoke-reason">{t("reasonRequired")}</FormLabel>
          <FormTextarea
            id="revoke-reason"
            value={reason}
            onChange={setReason}
            placeholder={t("revokeReasonPlaceholder")}
            rows={4}
          />
        </div>

        {error && <StatusMsg type="error" msg={error} />}
        {success && <StatusMsg type="success" msg={success} />}

        <ModalActions
          pending={pending}
          onClose={close}
          onConfirm={submit}
          confirmLabel={t("confirmRevocation")}
          confirmCls="bg-red-600 hover:bg-red-500"
          disabled={!reason.trim()}
        />
      </ModalBase>
    </>
  );
}

// ─── CoachNotesModal ─────────────────────────────────────────────────────────

export function CoachNotesModal({
  targetUserId,
  username,
  initialNotes,
}: {
  targetUserId: string;
  username: string;
  initialNotes: string;
}) {
  const t = useTranslations("misc2");
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
  }

  function submit() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      // Persiste na tabela admin_notes (migration 011) via action admin-gated.
      const res = await saveAdminNotes({ targetUserId, note: notes });
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(t("notesSaved"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide text-text-muted hover:border-brand-primary/60 hover:text-brand-primary transition-colors"
      >
        {t("privateNotesBtn")}
      </button>

      <ModalBase open={open} onClose={close} eyebrow={t("ebPrivate")} title={t("notesTitle", { name: username })}>
        <p className="mb-4 font-mono text-sm text-text-faded">
          {t("notesAdminOnly")}
        </p>
        <div>
          <FormLabel htmlFor="coach-notes-textarea">{t("notesLabel")}</FormLabel>
          <FormTextarea
            id="coach-notes-textarea"
            value={notes}
            onChange={setNotes}
            placeholder={t("notesPlaceholder")}
            rows={6}
          />
        </div>

        {error && <StatusMsg type="error" msg={error} />}
        {success && <StatusMsg type="success" msg={success} />}

        <ModalActions
          pending={pending}
          onClose={close}
          onConfirm={submit}
          confirmLabel={t("saveNotes")}
        />
      </ModalBase>
    </>
  );
}

// ─── EditUserModal ───────────────────────────────────────────────────────────
// Edição direta dos dados do usuário (Pedro 2026-07-03): nome, MMR da temporada,
// ban/desban e acesso (role/admin). Cada seção salva de forma independente.

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border-subtle/60 bg-black/20 p-4">
      <p className="mb-3 font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
        {title}
      </p>
      {children}
    </div>
  );
}

function SaveBtn({ pending, onClick, disabled, label = "Salvar", cls }: {
  pending: boolean; onClick: () => void; disabled?: boolean; label?: string; cls?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-sans text-sm font-semibold uppercase tracking-widest text-white transition-colors disabled:opacity-50 ${cls ?? "bg-brand-primary hover:bg-brand-primary/80"}`}
    >
      {pending && <Loader2 size={12} className="animate-spin" />}
      {label}
    </button>
  );
}

const TEXT_INPUT_CLS =
  "w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-mono text-sm text-text-body outline-none focus:border-brand-primary/60";

export function EditUserModal({
  targetUserId,
  username,
  seasonMmr,
  isBanned,
  isAdmin,
  role,
  region: initialRegion,
  steamId64: initialSteamId64 = null,
}: {
  targetUserId: string;
  username: string;
  seasonMmr: number | null;
  isBanned: boolean;
  isAdmin: boolean;
  role: string;
  region?: string;
  /** SteamID64 atual (steam_links) — pra editar o vínculo aqui no mesmo modal. */
  steamId64?: string | null;
}) {
  const [open, setOpen] = useState(false);

  // Estado por seção
  const [nick, setNick] = useState(username);
  const [regionVal, setRegionVal] = useState(initialRegion ?? "BR");
  const [steamIdVal, setSteamIdVal] = useState("");
  const [steamReason, setSteamReason] = useState("");
  const [mmr, setMmr] = useState(seasonMmr != null ? String(seasonMmr) : "");
  const [mmrReason, setMmrReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [roleVal, setRoleVal] = useState(role || "player");
  const [adminVal, setAdminVal] = useState(isAdmin);
  const [accessReason, setAccessReason] = useState("");

  // Feedback por seção
  const [msg, setMsg] = useState<Record<string, { type: "error" | "success"; text: string } | null>>({});
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function setSectionMsg(key: string, m: { type: "error" | "success"; text: string } | null) {
    setMsg((prev) => ({ ...prev, [key]: m }));
  }

  function run(key: string, fn: () => Promise<{ success: boolean; error?: string }>, okText: string) {
    setSectionMsg(key, null);
    setBusy(key);
    startTransition(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.success) setSectionMsg(key, { type: "error", text: res.error ?? "Erro." });
      else setSectionMsg(key, { type: "success", text: okText });
    });
  }

  function close() {
    setOpen(false);
    setMsg({});
    setBusy(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-primary/60 bg-brand-primary/10 px-3 py-1.5 font-sans text-sm font-semibold uppercase tracking-widest text-brand-primary hover:bg-brand-primary/20 transition-colors"
      >
        <Pencil size={12} />
        Editar dados
      </button>

      <ModalBase open={open} onClose={close} eyebrow="Admin · edição" title={`Editar ${username}`}>
        <div className="space-y-4">
          {/* NOME */}
          <EditSection title="Nome / nick oficial">
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              className={TEXT_INPUT_CLS}
              maxLength={32}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              {msg.nick ? <StatusMsg type={msg.nick.type} msg={msg.nick.text} /> : <span />}
              <SaveBtn
                pending={busy === "nick" && pending}
                disabled={!nick.trim() || nick.trim() === username}
                onClick={() => run("nick", () => updateUsernameAdmin(targetUserId, nick), "Nome atualizado.")}
              />
            </div>
          </EditSection>

          {/* STEAM ID (steam_id_64) — reaproveita swapSteamLink (mesma ação do botão
              "Trocar Steam"): valida 17 dígitos, BLOQUEIA se o Steam já é de outro
              (anti-smurf), zera persona/avatar pra re-sincronizar e registra no audit.
              O motivo é obrigatório (é exceção anti-smurf, exige comprovação). */}
          <EditSection title="Steam ID (SteamID64)">
            <p className="mb-2 font-body text-xs text-text-faded">
              {initialSteamId64 ? `Atual: ${initialSteamId64}` : "Nenhuma conta vinculada hoje."}
            </p>
            <input
              value={steamIdVal}
              onChange={(e) => setSteamIdVal(e.target.value)}
              placeholder="Novo SteamID64 (17 dígitos, 7656119…)"
              inputMode="numeric"
              className={TEXT_INPUT_CLS}
            />
            <input
              value={steamReason}
              onChange={(e) => setSteamReason(e.target.value)}
              placeholder="Motivo / comprovação (obrigatório)"
              className={`${TEXT_INPUT_CLS} mt-2`}
              maxLength={200}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              {msg.steam ? <StatusMsg type={msg.steam.type} msg={msg.steam.text} /> : <span />}
              <SaveBtn
                pending={busy === "steam" && pending}
                disabled={!steamIdVal.trim() || !steamReason.trim()}
                onClick={() =>
                  run(
                    "steam",
                    () => swapSteamLink(targetUserId, steamIdVal, steamReason),
                    "Vínculo Steam atualizado — re-sincroniza no próximo acesso do jogador."
                  )
                }
              />
            </div>
          </EditSection>

          {/* REGIÃO DE JOGO — escolha única do user no onboarding; troca SÓ aqui.
              Filas nunca se misturam (BR não é LATAM). */}
          <EditSection title="Região de jogo">
            <div className="flex gap-2">
              {GAME_REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegionVal(r)}
                  aria-pressed={regionVal === r}
                  className={`rounded-md border px-3 py-1.5 font-sans text-sm font-semibold uppercase tracking-widest transition-colors ${
                    regionVal === r
                      ? "border-brand-primary bg-brand-primary/20 text-brand-primary"
                      : "border-border-subtle text-text-faded hover:text-text-body"
                  }`}
                >
                  {REGION_LABELS[r]}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              {msg.region ? <StatusMsg type={msg.region.type} msg={msg.region.text} /> : <span />}
              <SaveBtn
                pending={busy === "region" && pending}
                disabled={regionVal === (initialRegion ?? "BR")}
                onClick={() =>
                  run("region", () => updateUserRegionAdmin(targetUserId, regionVal), "Região atualizada.")
                }
              />
            </div>
          </EditSection>

          {/* MMR TEMPORADA */}
          <EditSection title="MMR da temporada">
            <input
              type="number"
              min="0"
              max="10000"
              value={mmr}
              onChange={(e) => setMmr(e.target.value)}
              placeholder="ex.: 5620"
              className={TEXT_INPUT_CLS}
            />
            <input
              value={mmrReason}
              onChange={(e) => setMmrReason(e.target.value)}
              placeholder="Motivo (ex.: correção de calibração)"
              className={`${TEXT_INPUT_CLS} mt-2`}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              {msg.mmr ? <StatusMsg type={msg.mmr.type} msg={msg.mmr.text} /> : <span />}
              <SaveBtn
                pending={busy === "mmr" && pending}
                disabled={!mmr || !mmrReason.trim()}
                onClick={() =>
                  run("mmr", () => setSeasonMmrAdmin(targetUserId, parseInt(mmr, 10), mmrReason), "MMR ajustado.")
                }
              />
            </div>
          </EditSection>

          {/* CONDUTA: BAN */}
          <EditSection title={isBanned ? "Conduta — banido" : "Conduta — banir"}>
            <p className="mb-2 font-body text-sm text-text-muted">
              {isBanned
                ? "Este usuário está banido. Você pode remover o banimento."
                : "Banir remove o jogador do ranking e o coloca no Mural da Vergonha."}
            </p>
            {!isBanned && (
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Motivo do banimento (obrigatório)"
                className={TEXT_INPUT_CLS}
              />
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              {msg.ban ? <StatusMsg type={msg.ban.type} msg={msg.ban.text} /> : <span />}
              <SaveBtn
                pending={busy === "ban" && pending}
                disabled={!isBanned && !banReason.trim()}
                label={isBanned ? "Desbanir" : "Banir"}
                cls={isBanned ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}
                onClick={() =>
                  run(
                    "ban",
                    () => setBanStatusAdmin(targetUserId, !isBanned, isBanned ? "Desbanimento admin" : banReason),
                    isBanned ? "Banimento removido." : "Usuário banido."
                  )
                }
              />
            </div>
          </EditSection>

          {/* ACESSO */}
          <EditSection title="Acesso — role / admin">
            <div className="flex items-center gap-3">
              <select
                value={roleVal}
                onChange={(e) => setRoleVal(e.target.value)}
                className={TEXT_INPUT_CLS}
              >
                <option value="player">player</option>
                <option value="coach">coach</option>
                <option value="admin">admin</option>
              </select>
              <label className="flex shrink-0 items-center gap-2 font-display text-sm uppercase tracking-wide text-text-body">
                <input
                  type="checkbox"
                  checked={adminVal}
                  onChange={(e) => setAdminVal(e.target.checked)}
                  className="size-4 accent-brand-primary"
                />
                is_admin
              </label>
            </div>
            <input
              value={accessReason}
              onChange={(e) => setAccessReason(e.target.value)}
              placeholder="Motivo (obrigatório)"
              className={`${TEXT_INPUT_CLS} mt-2`}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              {msg.access ? <StatusMsg type={msg.access.type} msg={msg.access.text} /> : <span />}
              <SaveBtn
                pending={busy === "access" && pending}
                disabled={!accessReason.trim()}
                onClick={() =>
                  run(
                    "access",
                    () => setUserAccessAdmin(targetUserId, { isAdmin: adminVal, role: roleVal }, accessReason),
                    "Acesso atualizado."
                  )
                }
              />
            </div>
          </EditSection>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-md px-4 py-2 font-sans text-sm uppercase tracking-widest text-text-faded hover:text-text-muted transition-colors"
          >
            Fechar
          </button>
        </div>
      </ModalBase>
    </>
  );
}

// ─── SwapSteamModal ──────────────────────────────────────────────────────────
// Troca MANUAL da conta Steam vinculada (exceção anti-smurf). Só após o jogador
// comprovar ao Pedro que vinculou a conta errada por engano.

export function SwapSteamModal({
  targetUserId,
  username,
  currentSteamId,
}: {
  targetUserId: string;
  username: string;
  currentSteamId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [steamId, setSteamId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setSteamId("");
    setReason("");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await swapSteamLink(targetUserId, steamId, reason);
      if (!res.success) setError(res.error);
      else setSuccess("Vínculo Steam trocado. A identidade re-sincroniza no próximo acesso do jogador.");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide text-text-muted hover:border-brand-primary/50 hover:text-text-display transition-colors"
      >
        <RefreshCw size={11} />
        Trocar Steam
      </button>

      <ModalBase open={open} onClose={close} eyebrow="Anti-smurf · exceção" title={`Trocar Steam de ${username}`}>
        <div className="space-y-4">
          <p className="font-body text-sm text-text-muted">
            Use SÓ quando o jogador comprovar que vinculou a conta errada por engano.
            {currentSteamId ? ` Atual: ${currentSteamId}` : " (nenhuma conta vinculada hoje)"}
          </p>
          <div>
            <FormLabel htmlFor="swap-steamid">Novo SteamID64 (17 dígitos)</FormLabel>
            <input
              id="swap-steamid"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="7656119..."
              inputMode="numeric"
              className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-mono text-sm text-text-body outline-none focus:border-brand-primary/60"
            />
          </div>
          <div>
            <FormLabel htmlFor="swap-reason">Motivo / comprovação (obrigatório)</FormLabel>
            <FormTextarea
              id="swap-reason"
              value={reason}
              onChange={setReason}
              placeholder="Ex.: jogador X comprovou no Discord que vinculou o smurf por engano; conta correta é ..."
            />
          </div>

          {error && <StatusMsg type="error" msg={error} />}
          {success && <StatusMsg type="success" msg={success} />}
        </div>

        <ModalActions
          pending={pending}
          onClose={close}
          onConfirm={submit}
          confirmLabel="Trocar Steam"
          confirmCls="bg-brand-primary hover:brightness-110"
          disabled={!steamId.trim() || !reason.trim()}
        />
      </ModalBase>
    </>
  );
}

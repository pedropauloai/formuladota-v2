"use client";

// Form de criar sala — estilo "Configurações da Sala" do cliente Dota 2
// (ref: configuração lobby.png). Persiste o que o schema suporta (nome, modo, senha);
// as configs avançadas (servidor, visibilidade, regras, bots) são VISUAIS por ora — o
// bot Steam vai consumi-las quando deployado.
//
// [CRIAR SALA] = verde play (compromisso positivo), desabilitado até nome válido.
// [CANCELAR] = ghost. Seções em Teko condensed (font-display-condensed).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy, Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { createLobby, updateLobbySettings, type CreateLobbyResult } from "./actions";

interface FormProps {
  /** Quando embedded num modal/painel: ao criar, dispara onCreated em vez de mostrar
   *  a tela de senha com navegação. Cancelar dispara onClose. */
  onCreated?: (lobbyId: string) => void;
  onClose?: () => void;
  /** Quando setado, o form EDITA a sala existente em vez de criar uma nova. */
  editLobbyId?: string;
  defaults?: { name?: string; gameMode?: string };
}

export function CriarLobbyForm({ onCreated, onClose, editLobbyId, defaults }: FormProps = {}) {
  const t = useTranslations("lobbies");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ lobbyId: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  // Nome controlado só pra habilitar o CTA (validação visual; Zod valida no server).
  const [name, setName] = useState(defaults?.name ?? "");
  const router = useRouter();

  const nameValid = name.trim().length >= 3;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result: CreateLobbyResult = editLobbyId
        ? await updateLobbySettings(formData)
        : await createLobby(formData);
      if (!result.success) {
        toast({ type: "error", title: result.error });
        return;
      }
      toast({ type: "success", title: editLobbyId ? t("settingsSaved") : t("lobbyCreatedToast") });
      // Embedded (modal): fecha e abre a sala no painel. Standalone: tela de senha.
      if (onCreated) {
        onCreated(result.lobbyId);
        return;
      }
      setCreated({ lobbyId: result.lobbyId, password: result.password });
    });
  }

  async function copyPassword(pwd: string) {
    await navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <div className="rounded-sm border border-success/40 bg-bg-elevated/60 p-6 space-y-5">
        <h2 className="font-display-condensed text-3xl uppercase leading-none text-text-display">
          {t("lobbyCreatedTitle")}
        </h2>
        <p className="font-body text-sm text-text-muted">
          {t("lobbyCreatedBody")}
        </p>
        <div className="rounded-sm border border-border-subtle bg-bg-deep p-4">
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
            {t("lobbyPassword")}
          </p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <code className="font-mono text-2xl tabular-nums text-gold">
              {created.password}
            </code>
            <Button type="button" variant="secondary" size="sm" onClick={() => copyPassword(created.password)}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="cinematic" size="md" className="flex-1" onClick={() => router.push(`/lobbies/${created.lobbyId}`)}>
            {t("enterLobby")}
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={() => router.push("/lobbies")}>
            {t("viewLobbies")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {editLobbyId && <input type="hidden" name="lobbyId" value={editLobbyId} />}
      {/* Bloco principal — grid denso */}
      <div className="rounded-sm border border-border-subtle bg-bg-elevated/40 p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("matchName")}>
            <input
              name="name"
              type="text"
              required
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="FORMULADOTA #42"
              className={INPUT}
            />
          </Field>
          <Field label={t("fieldMode")}>
            <select name="gameMode" defaultValue={defaults?.gameMode ?? "all_pick"} className={INPUT}>
              <option value="all_pick">{t("modeAllPickCompetitive")}</option>
              <option value="captains_mode">{t("modeCaptainsMode")}</option>
              <option value="random_draft">{t("modeRandomDraft")}</option>
              <option value="single_draft">{t("modeSingleDraft")}</option>
            </select>
          </Field>
          <Field label={t("lobbyPassword")}>
            <div className="relative">
              <input
                name="password"
                type={showPwd ? "text" : "password"}
                maxLength={20}
                placeholder={t("passwordPlaceholder")}
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faded hover:text-text-body"
                aria-label={showPwd ? t("hide") : t("show")}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("serverLocation")}>
            <select className={INPUT} defaultValue="sa">
              <option value="sa">{t("regionSouthAmerica")}</option>
              <option value="us-e">{t("regionUsEast")}</option>
            </select>
          </Field>
          <Field label={t("lobbyVisibility")}>
            <select className={INPUT} defaultValue="publica">
              <option value="publica">{t("visibilityPublic")}</option>
              <option value="amigos">{t("visibilityFriends")}</option>
              <option value="privada">{t("visibilityPrivate")}</option>
            </select>
          </Field>
          <div className="flex flex-col justify-end gap-1.5 pb-1">
            <Checkbox label={t("enableCheats")} />
            <Checkbox label={t("immortalDraft")} />
          </div>
        </div>
      </div>

      {/* CONFIGURAÇÕES AVANÇADAS — expansível */}
      <div className="rounded-sm border border-border-subtle bg-bg-elevated/40">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
        >
          <ChevronDown
            size={16}
            className={`text-gold transition-transform ${advanced ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          <span className="font-display-condensed text-lg uppercase tracking-wide text-text-display">
            {t("advancedSettings")}
          </span>
        </button>
        {advanced && (
          <div className="grid gap-5 border-t border-border-subtle p-4 md:grid-cols-3">
            <fieldset className="space-y-2.5">
              <legend className="mb-1 font-display-condensed text-lg uppercase tracking-wide text-gold">
                {t("advCompetitive")}
              </legend>
              <SelectField label={t("advPickPriority")} options={[t("optManual"), t("optRandom")]} />
              <SelectField label={t("advStartingTeam")} options={[t("optRandom"), t("teamRadiant"), t("teamDire")]} />
              <SelectField label={t("advPenalties")} options={[t("optNone"), t("optStandard")]} />
            </fieldset>
            <fieldset className="space-y-2.5">
              <legend className="mb-1 font-display-condensed text-lg uppercase tracking-wide text-gold">
                {t("advGameRules")}
              </legend>
              <SelectField label={t("advSpectators")} options={[t("optAllowed"), t("optNotAllowed")]} />
              <SelectField label={t("advDotaTvDelay")} options={[t("opt2min"), t("opt5min"), t("optNoDelay")]} />
              <SelectField label={t("advPauses")} options={[t("optUnlimited"), t("optLimited")]} />
              <SelectField label={t("advFormat")} options={[t("optSingleMatch"), t("optBestOf3")]} />
            </fieldset>
            <fieldset className="space-y-2.5">
              <legend className="mb-1 font-display-condensed text-lg uppercase tracking-wide text-gold">
                {t("advBotConfig")}
              </legend>
              <Checkbox label={t("fillWithBots")} />
              <SelectField label={t("advDifficulty")} options={[t("optPassive"), t("optEasy"), t("optNormal"), t("optHard")]} />
            </fieldset>
          </div>
        )}
      </div>

      {/* Rodapé — [CRIAR SALA] verde play (desabilitado até nome válido) + [CANCELAR] ghost */}
      <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => (onClose ? onClose() : router.push("/lobbies"))}
          disabled={isPending}
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          variant="cinematic"
          size="md"
          loading={isPending}
          disabled={isPending || !nameValid}
          title={nameValid ? undefined : t("nameMinHint")}
        >
          {isPending
            ? editLobbyId
              ? t("saving")
              : t("creatingLobby")
            : editLobbyId
              ? t("saveSettings")
              : t("createLobby")}
        </Button>
      </div>
    </form>
  );
}

const INPUT =
  "w-full rounded-[var(--radius-sm)] border border-border-subtle bg-bg-elevated px-3 py-2 font-body text-sm text-text-display placeholder:text-text-faded transition-colors focus:border-brand-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <Field label={label}>
      <select className={INPUT} defaultValue={options[0]}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Checkbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-2 font-body text-sm text-text-body">
      <input type="checkbox" className="size-4 rounded-sm accent-brand-primary" />
      {label}
    </label>
  );
}

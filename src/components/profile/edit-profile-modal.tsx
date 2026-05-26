"use client";
// EditProfileModal — Dialog V2.5 takeover com 4 abas internas (D-16/D-17).
//
// CADA aba tem botão "SALVAR X" + chama toast() onSave success/error (BLOCKER #4).
// Fechamento APENAS pelo X do header (sem botão CANCELAR per UI-SPEC).
//
// Desvio de implementação: usa DialogContent (API real) em vez de DialogPopup (não existe).
// DialogContent variant="takeover" inclui DialogPortal + DialogBackdrop internamente.

import { useState, useTransition, type ReactNode } from "react";
import { X, Pencil } from "lucide-react";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { HeroPicker } from "./hero-picker";
import { AvatarUpload } from "./avatar-upload";
import { updateStatusMessage, updateFavoriteHeroes, updateHeroPortrait } from "@/actions/profile";

type ModalTab = "status" | "heroes" | "portrait" | "avatar";

interface Props {
  userId: string;
  initialStatus: string | null;
  initialFavorites: string[];
  initialPortrait: string | null;
  initialAvatar: string | null;
}

export function EditProfileModal({
  userId,
  initialStatus,
  initialFavorites,
  initialPortrait,
  initialAvatar,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ModalTab>("status");

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="secondary" size="sm" aria-label="Editar perfil">
            <Pencil size={14} aria-hidden="true" />
            EDITAR PERFIL
          </Button>
        }
      />

      {/* DialogContent variant="takeover" = fullscreen cinematográfico (DF6.3 + D-16) */}
      <DialogContent variant="takeover" className="bg-bg-base">
        {/* Container fullscreen com layout coluna */}
        <div className="flex flex-col w-full max-w-4xl h-full max-h-[90vh] bg-bg-base border border-border-strong rounded-lg overflow-hidden">

          {/* Header: título + X close (ÚNICO controle de fechamento per UI-SPEC) */}
          <div className="flex items-center justify-between p-6 border-b border-border-subtle shrink-0">
            <DialogTitle className="font-display text-xl font-bold uppercase tracking-wide text-text-display">
              Editar Perfil
            </DialogTitle>
            <DialogClose
              render={
                <button
                  type="button"
                  aria-label="Fechar"
                  className="text-text-muted hover:text-text-display p-1 transition-colors"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              }
            />
          </div>

          {/* Tabs internas */}
          <div
            role="tablist"
            aria-label="Abas de edição do perfil"
            className="flex items-end gap-4 px-6 pt-4 border-b border-border-subtle shrink-0"
          >
            <ModalTabButton current={tab} value="status" onClick={setTab}>Status</ModalTabButton>
            <ModalTabButton current={tab} value="heroes" onClick={setTab}>Heróis Favoritos</ModalTabButton>
            <ModalTabButton current={tab} value="portrait" onClick={setTab}>Hero Portrait</ModalTabButton>
            <ModalTabButton current={tab} value="avatar" onClick={setTab}>Avatar</ModalTabButton>
          </div>

          {/* Conteúdo da aba ativa */}
          <div className="p-6 overflow-y-auto flex-1">
            {tab === "status" && (
              <StatusForm
                initialValue={initialStatus}
                onSaved={() => closeAfterDelay(setOpen)}
              />
            )}
            {tab === "heroes" && (
              <HeroesForm
                initialValue={initialFavorites}
                onSaved={() => closeAfterDelay(setOpen)}
              />
            )}
            {tab === "portrait" && (
              <PortraitForm
                initialValue={initialPortrait}
                onSaved={() => closeAfterDelay(setOpen)}
              />
            )}
            {tab === "avatar" && (
              <AvatarUpload
                userId={userId}
                currentAvatarUrl={initialAvatar}
                onSaved={() => closeAfterDelay(setOpen)}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

// Fecha o modal 800ms após save success (UI-SPEC Interaction Contract)
function closeAfterDelay(setOpen: (v: boolean) => void) {
  setTimeout(() => setOpen(false), 800);
}

// ---------------------------------------------------------------------------
// ModalTabButton — tab interna com underline brand-primary quando ativa
// ---------------------------------------------------------------------------

function ModalTabButton({
  current,
  value,
  onClick,
  children,
}: {
  current: ModalTab;
  value: ModalTab;
  onClick: (v: ModalTab) => void;
  children: ReactNode;
}) {
  const isActive = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onClick(value)}
      className={[
        "font-display text-[13px] font-bold uppercase tracking-[0.08em] pb-2 -mb-px transition-colors border-b-2",
        isActive
          ? "text-text-display border-brand-primary"
          : "text-text-muted hover:text-text-body border-transparent",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ===========================================================================
// Aba Status (D-18) — textarea max 60 chars + counter + toast (BLOCKER #4)
// ===========================================================================

function StatusForm({
  initialValue,
  onSaved,
}: {
  initialValue: string | null;
  onSaved: () => void;
}) {
  const [text, setText] = useState(initialValue ?? "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const len = text.length;
  const nearLimit = len >= 55;

  const handleSave = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateStatusMessage(text);
        toast({ type: "success", title: "Status atualizado com sucesso." });
        onSaved();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao salvar.";
        setErrorMsg(msg);
        toast({ type: "error", title: "Não foi possível salvar. Tente novamente.", description: msg });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <p className="font-display text-[13px] font-semibold text-text-muted">
        Escreva uma mensagem curta sobre você (máx. 60 caracteres).
      </p>
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 60))}
          placeholder="Escreva algo sobre você..."
          aria-label="Mensagem de status"
          aria-describedby="status-counter"
          maxLength={60}
          rows={2}
          className="w-full p-3 bg-bg-elevated border border-border-strong rounded-sm font-display text-base font-semibold text-text-display placeholder:text-text-faded focus:outline-2 focus:outline-brand-primary resize-none"
        />
        <p
          id="status-counter"
          className={[
            "font-display text-[13px] font-semibold mt-1 text-right",
            nearLimit ? "text-error" : "text-text-faded",
          ].join(" ")}
        >
          {len}/60{nearLimit ? " — limite próximo" : ""}
        </p>
      </div>
      {errorMsg && (
        <p role="alert" className="font-display text-[13px] font-semibold text-error">
          {errorMsg}
        </p>
      )}
      <Button variant="primary" size="md" onClick={handleSave} disabled={isPending}>
        SALVAR STATUS
      </Button>
    </div>
  );
}

// ===========================================================================
// Aba Heróis Favoritos (D-19) — HeroPicker multi + toast (BLOCKER #4)
// ===========================================================================

function HeroesForm({
  initialValue,
  onSaved,
}: {
  initialValue: string[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialValue);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSave = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateFavoriteHeroes(selected);
        toast({ type: "success", title: "Heróis favoritos atualizados." });
        onSaved();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao salvar.";
        setErrorMsg(msg);
        toast({ type: "error", title: "Não foi possível salvar. Tente novamente.", description: msg });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-display text-[13px] font-semibold text-text-muted">
        Escolha até 3 heróis que representam seu estilo de jogo.
      </p>
      <HeroPicker mode="multi" initialSelected={initialValue} onChange={setSelected} />
      {errorMsg && (
        <p role="alert" className="font-display text-[13px] font-semibold text-error">
          {errorMsg}
        </p>
      )}
      <Button variant="primary" size="md" onClick={handleSave} disabled={isPending}>
        SALVAR HERÓIS
      </Button>
    </div>
  );
}

// ===========================================================================
// Aba Hero Portrait (D-20) — HeroPicker single + toast (BLOCKER #4)
// ===========================================================================

function PortraitForm({
  initialValue,
  onSaved,
}: {
  initialValue: string | null;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(
    initialValue ? [initialValue] : []
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSave = () => {
    if (selected.length === 0) {
      setErrorMsg("Selecione um herói.");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateHeroPortrait(selected[0]!);
        toast({ type: "success", title: "Hero portrait atualizado." });
        onSaved();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao salvar.";
        setErrorMsg(msg);
        toast({ type: "error", title: "Não foi possível salvar. Tente novamente.", description: msg });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-display text-[13px] font-semibold text-text-muted">
        Selecione o herói que aparecerá como background do seu perfil.
      </p>
      <HeroPicker mode="single" initialSelected={selected} onChange={setSelected} />
      {errorMsg && (
        <p role="alert" className="font-display text-[13px] font-semibold text-error">
          {errorMsg}
        </p>
      )}
      <Button variant="primary" size="md" onClick={handleSave} disabled={isPending}>
        SALVAR PORTRAIT
      </Button>
    </div>
  );
}

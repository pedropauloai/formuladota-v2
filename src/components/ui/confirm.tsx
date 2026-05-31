"use client";

// ConfirmProvider — substitui window.confirm/alert/prompt por modais
// customizados FORMULADOTA (Pedro 2026-05-26).
//
// API Promise-based via hooks `useConfirm()` e `usePrompt()`.
// Montado UMA vez no root layout (envolve toda a app).
//
// Uso:
//   const confirm = useConfirm();
//   const ok = await confirm({
//     title: "Sair da fila?",
//     message: "Você pode entrar de novo a qualquer momento.",
//     confirmLabel: "Sair",
//     variant: "destructive",
//   });
//   if (!ok) return;
//
//   const prompt = usePrompt();
//   const reason = await prompt({
//     title: "Cancelar partida",
//     message: "Motivo do cancelamento:",
//     placeholder: "Ex: aluno desconectou",
//     required: true,
//     multiline: true,
//   });
//   if (reason === null) return; // user cancelou
//
// ESC / click fora do modal = cancelar (Promise resolve false / null).
// Enter no input = confirmar (em multiline use Ctrl/Cmd+Enter).

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import { Button } from "./button";

// ─────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────

export type ConfirmVariant = "default" | "destructive";

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Texto do botão de confirmar. Default: "Confirmar". */
  confirmLabel?: string;
  /** Texto do botão de cancelar. Default: "Cancelar". */
  cancelLabel?: string;
  /** "destructive" pinta botão vermelho + ícone de warning. */
  variant?: ConfirmVariant;
}

export interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
  /** Se true, botão Confirmar desativa quando input está vazio. */
  required?: boolean;
  /** Textarea em vez de input single-line. */
  multiline?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

// ─────────────────────────────────────────────────────────────────────────
// Context + hooks
// ─────────────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm deve ser usado dentro de <ConfirmProvider>");
  }
  return ctx.confirm;
}

export function usePrompt() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("usePrompt deve ser usado dentro de <ConfirmProvider>");
  }
  return ctx.prompt;
}

// ─────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────

type DialogState =
  | {
      kind: "confirm";
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "prompt";
      options: PromptOptions;
      resolve: (value: string | null) => void;
    };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState("");

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ kind: "confirm", options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setInputValue(options.defaultValue ?? "");
      setState({ kind: "prompt", options, resolve });
    });
  }, []);

  // Cancela com valor "vazio" — confirm → false, prompt → null
  const cancel = useCallback(() => {
    if (!state) return;
    if (state.kind === "confirm") state.resolve(false);
    else state.resolve(null);
    setState(null);
    setInputValue("");
  }, [state]);

  const commit = useCallback(() => {
    if (!state) return;
    if (state.kind === "confirm") {
      state.resolve(true);
    } else {
      const opts = state.options;
      const value = inputValue.trim();
      if (opts.required && value.length === 0) return; // bloqueia confirm vazio
      state.resolve(value);
    }
    setState(null);
    setInputValue("");
  }, [state, inputValue]);

  const isPromptDisabled =
    state?.kind === "prompt" &&
    state.options.required === true &&
    inputValue.trim().length === 0;

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      <DialogRoot
        open={state !== null}
        onOpenChange={(open) => {
          if (!open) cancel();
        }}
      >
        {state && (
          <DialogContent variant="centered" className="max-w-md">
            <div className="flex items-start gap-3">
              {state.options.variant === "destructive" && (
                <AlertTriangle
                  size={20}
                  className="shrink-0 text-error mt-1"
                  aria-hidden="true"
                />
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle>{state.options.title}</DialogTitle>
                {state.options.message && (
                  <DialogDescription>
                    {state.options.message}
                  </DialogDescription>
                )}
              </div>
            </div>

            {state.kind === "prompt" && (
              <PromptInput
                value={inputValue}
                onChange={setInputValue}
                options={state.options}
                onSubmit={commit}
                onCancel={cancel}
              />
            )}

            <div className="flex items-center justify-end gap-2 mt-2">
              <Button variant="secondary" size="md" onClick={cancel}>
                {state.options.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                variant={
                  state.options.variant === "destructive"
                    ? "destructive"
                    : "cinematic"
                }
                size="md"
                onClick={commit}
                disabled={isPromptDisabled}
              >
                {state.options.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </DialogContent>
        )}
      </DialogRoot>
    </ConfirmContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PromptInput — input/textarea com auto-focus + Enter handlers
// ─────────────────────────────────────────────────────────────────────────

function PromptInput({
  value,
  onChange,
  options,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: PromptOptions;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const className =
    "w-full rounded border border-border-strong bg-bg-deep/60 px-3 py-2 font-display text-base text-text-body placeholder:text-text-faded focus:outline-none focus:border-brand-primary mt-2";

  if (options.multiline) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={options.placeholder}
        rows={3}
        className={className}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
    );
  }

  return (
    <input
      autoFocus
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={options.placeholder}
      className={className}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        } else if (e.key === "Enter") {
          e.preventDefault();
          onSubmit();
        }
      }}
    />
  );
}

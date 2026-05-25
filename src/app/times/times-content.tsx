"use client";

// /times Client Component — modal criar time + cards times + cards invites pending.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Plus, Users, X, Loader2, Mail, Check } from "lucide-react";
import { toast } from "sonner";
import {
  createTeam,
  acceptInvite,
  declineInvite,
  leaveTeam,
} from "./actions";
import { Button } from "@/components/ui/button";

interface UserTeam {
  id: string;
  slug: string;
  name: string;
  tag: string;
  captain_id: string;
  logo_url: string | null;
  description: string | null;
  role: string;
  memberCount: number;
  isCaptain: boolean;
}

interface Invite {
  id: string;
  team_id: string;
  message: string | null;
  created_at: string | null;
  expires_at: string | null;
  invited_by: string | null;
  team: { id: string; slug: string; name: string; tag: string; captain_id: string } | null;
}

export function TimesContent({
  userTeams,
  invites,
}: {
  userTeams: UserTeam[];
  invites: Invite[];
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      {/* Convites pendentes */}
      {invites.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-sans text-sm 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Convites pendentes <span className="text-white/40">({invites.length})</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {invites.map((inv) => (
              <InviteCard key={inv.id} invite={inv} />
            ))}
          </div>
        </section>
      )}

      {/* Header times + botão criar */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-sm 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Meus times <span className="text-white/40">({userTeams.length})</span>
        </h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-md border border-brand-primary bg-brand-primary/15 px-4 py-2 font-sans text-sm 2xl:text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-primary transition-colors"
        >
          <Plus size={14} aria-hidden="true" />
          Criar time
        </button>
      </div>

      {/* Lista times */}
      {userTeams.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {userTeams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-white/10 bg-black/30 p-12 text-center">
          <Users size={28} className="mx-auto mb-3 text-white/30" aria-hidden="true" />
          <p className="font-display text-base 2xl:text-lg uppercase tracking-wide text-white/60">
            Você ainda não está em nenhum time
          </p>
          <p className="mt-2 font-sans text-sm 2xl:text-sm text-white/40">
            Crie um time ou aceite um convite pra começar a competir.
          </p>
        </div>
      )}

      {showCreate && <CreateTeamModal onClose={() => setShowCreate(false)} />}
    </>
  );
}

// ============== Invite Card ==============

function InviteCard({ invite }: { invite: Invite }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      const r = await acceptInvite(invite.id);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(`Você entrou no ${invite.team?.name ?? "time"}!`);
      router.refresh();
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      const r = await declineInvite(invite.id);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      router.refresh();
    });
  };

  if (!invite.team) return null;

  return (
    <div className="rounded-md border border-amber-400/30 bg-gradient-to-b from-amber-500/10 to-transparent p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail size={14} className="text-amber-400" aria-hidden="true" />
        <span className="font-mono text-sm uppercase tracking-widest text-amber-400">
          Convite
        </span>
      </div>
      <div>
        <p className="font-display text-base uppercase tracking-wide text-white">
          {invite.team.name}
        </p>
        <p className="font-mono text-sm text-white/50">[{invite.team.tag}]</p>
      </div>
      {invite.message && (
        <p className="font-sans text-sm text-white/60 italic">
          &ldquo;{invite.message}&rdquo;
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="cinematic"
          size="sm"
          onClick={handleAccept}
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          Aceitar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDecline}
          disabled={isPending}
          className="flex-1"
        >
          <X size={12} />
          Recusar
        </Button>
      </div>
    </div>
  );
}

// ============== Team Card ==============

function TeamCard({ team }: { team: UserTeam }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLeave = () => {
    if (!confirm(`Sair do time ${team.name}?`)) return;
    startTransition(async () => {
      const r = await leaveTeam(team.id);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Você saiu do time.");
      router.refresh();
    });
  };

  return (
    <Link
      href={`/times/${team.slug}`}
      className="group relative rounded-md border border-border-subtle bg-gradient-to-b from-black/60 to-black/40 p-5 hover:border-brand-primary/60 transition-colors block"
    >
      <div className="flex items-start gap-3">
        {team.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo_url}
            alt=""
            className="size-12 rounded-md border border-white/10 shrink-0"
          />
        ) : (
          <div className="size-12 rounded-md border border-white/10 bg-brand-primary/15 flex items-center justify-center shrink-0">
            <span className="font-display text-base text-brand-primary">
              {team.tag}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-base uppercase tracking-wide text-white truncate group-hover:text-brand-primary transition-colors">
            {team.name}
          </p>
          <p className="font-mono text-sm uppercase tracking-widest text-white/40 mt-0.5">
            [{team.tag}]
          </p>
        </div>
        {team.isCaptain && (
          <Crown
            size={14}
            className="text-amber-400 shrink-0"
            aria-label="Capitão"
          />
        )}
      </div>

      {team.description && (
        <p className="mt-3 font-sans text-sm text-white/60 line-clamp-2">
          {team.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-sm uppercase tracking-widest font-mono">
        <span className="text-white/50">
          <Users size={10} className="inline mr-1" /> {team.memberCount}/7
        </span>
        <span className="text-brand-primary">{team.role}</span>
      </div>

      {!team.isCaptain && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLeave();
          }}
          disabled={isPending}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-white/40 hover:text-error transition-all"
          aria-label="Sair do time"
          title="Sair do time"
        >
          <X size={14} />
        </button>
      )}
    </Link>
  );
}

// ============== Create Team Modal ==============

function CreateTeamModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const handleNameChange = (v: string) => {
    setName(v);
    // Auto-suggest slug a partir do name
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(v));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await createTeam({
        name,
        tag: tag.toUpperCase(),
        slug: slug.toLowerCase(),
        description: description || undefined,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Time criado!");
      router.refresh();
      if (r.teamSlug) {
        router.push(`/times/${r.teamSlug}`);
      }
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-md border border-border-subtle bg-gradient-to-b from-[#0c0c0c] to-black p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base uppercase tracking-[0.2em] text-white">
            Criar time
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-white/60 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Nome do time">
            <input
              type="text"
              required
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex.: Os Imortais BR"
              className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-sans text-sm text-white placeholder:text-white/30 focus:border-brand-primary focus:outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tag (2-5 chars)">
              <input
                type="text"
                required
                minLength={2}
                maxLength={5}
                value={tag}
                onChange={(e) =>
                  setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                placeholder="IMRT"
                className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-mono text-sm uppercase text-white placeholder:text-white/30 focus:border-brand-primary focus:outline-none"
              />
            </Field>
            <Field label="Slug URL">
              <input
                type="text"
                required
                minLength={3}
                maxLength={32}
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                placeholder="os-imortais-br"
                className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-brand-primary focus:outline-none"
              />
            </Field>
          </div>

          <Field label="Descrição (opcional)">
            <textarea
              maxLength={280}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Time competitivo focado em..."
              rows={3}
              className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-sans text-sm text-white placeholder:text-white/30 focus:border-brand-primary focus:outline-none resize-none"
            />
            <p className="mt-1 text-right font-mono text-sm text-white/30">
              {description.length}/280
            </p>
          </Field>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isPending}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="cinematic"
            size="md"
            disabled={isPending || name.length < 3 || tag.length < 2 || slug.length < 3}
            className="flex-1"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {isPending ? "Criando..." : "Criar time"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block mb-1 font-sans text-sm font-semibold uppercase tracking-wide text-white/70">
        {label}
      </span>
      {children}
    </label>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 32);
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInWithDiscord } from "./actions";

// Login com Discord — Server Action chama Supabase Auth e redireciona para o OAuth do Discord.
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/perfil");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            Entrar com <span className="text-[var(--color-cyan)] text-glow-cyan">Discord</span>
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            É o único método de login. Discord é onde a comunidade do Dota vive.
          </p>
        </div>

        <form action={signInWithDiscord}>
          <button
            type="submit"
            className="w-full rounded-md bg-[#5865F2] px-4 py-3 font-medium text-white transition hover:bg-[#4752c4] focus-visible:ring-2 focus-visible:ring-[#5865F2]"
          >
            Continuar com Discord
          </button>
        </form>

        <p className="text-center text-xs text-[var(--color-muted-foreground)]">
          <Link href="/" className="hover:text-[var(--color-cyan)] transition">
            ← voltar
          </Link>
        </p>
      </div>
    </main>
  );
}

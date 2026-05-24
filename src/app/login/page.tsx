import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInWithDiscord } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Login com Discord — Server Action chama Supabase Auth e redireciona para o OAuth do Discord.
// Refatorado V2.5 (DF8.4 cleanup — 2026-05-24):
//   - <Card variant="elevated"> + tokens V2.5 (text-brand-primary, text-text-*)
//   - CTA Discord renderizado via <Button variant="primary" size="lg">
//   - Mantém fluxo Server Action signInWithDiscord intacto
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Card variant="elevated" className="w-full max-w-md space-y-8">
        <CardContent className="space-y-8">
          <header className="text-center space-y-2">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
              FORMULADOTA
            </p>
            <h1 className="font-display text-3xl uppercase tracking-tight text-text-display">
              Entrar com Discord
            </h1>
            <p className="text-sm text-text-muted">
              É o único método de login. Discord é onde a comunidade do Dota vive.
            </p>
          </header>

          <form action={signInWithDiscord}>
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Continuar com Discord
            </Button>
          </form>

          <p className="text-center text-xs text-text-muted">
            <Link href="/" className="hover:text-text-display transition-colors">
              ← voltar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

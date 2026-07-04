// Skeleton de navegação do placar pós-jogo — a página SSR resolve várias
// queries (match_players + match_details + identidades) antes de pintar.
import { ShellSkeleton } from "@/components/client-shell/shell-skeleton";

export default function Loading() {
  return <ShellSkeleton />;
}

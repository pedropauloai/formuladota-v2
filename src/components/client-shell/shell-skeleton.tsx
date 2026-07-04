// ShellSkeleton — fallback de navegação (loading.tsx) que imita o chrome do
// ClientShell (topbar + sidebar direita + bottom-bar) enquanto o SSR resolve
// as queries. Sem ele, a navegação ficava em tela BRANCA até a última query
// terminar (o shell agrega ~16 fetches antes de pintar qualquer coisa).
//
// Mantém as mesmas medidas do shell real (h-12/14 topbar, 320-380px sidebar,
// 80-96px bottom-bar) pra transição sem "pulo" de layout quando os dados chegam.

import { Skeleton } from "@/components/ui/skeleton";

export function ShellSkeleton() {
  return (
    <div className="relative h-screen overflow-hidden" aria-busy="true">
      {/* Topbar — mesma régua visual do DashboardTopBar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-brand-primary/60 bg-bg-deep/75 px-4 backdrop-blur-xl xl:h-14 xl:px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-28" />
          <div className="hidden md:flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-7 w-7 rounded-sm" />
        </div>
      </header>

      {/* Sidebar direita (lg+) — mesmas larguras do shell */}
      <div className="absolute right-0 top-[64px] bottom-[80px] hidden w-[320px] flex-col gap-3 border-l border-border/40 bg-bg-deep/60 p-4 lg:flex xl:top-[72px] xl:bottom-[96px] xl:w-[360px] 2xl:w-[380px]">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Centro — blocos genéricos de conteúdo */}
      <main className="absolute inset-0 top-[64px] bottom-[80px] overflow-hidden px-4 pt-6 xl:top-[72px] xl:bottom-[96px] lg:pr-[336px] xl:pr-[376px] 2xl:pr-[396px] lg:pl-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <Skeleton className="h-9 w-64" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </main>

      {/* Bottom-bar — reserva dos ~80-96px do [JOGAR DOTA] */}
      <div className="absolute inset-x-0 bottom-0 flex h-[80px] items-center justify-end border-t border-border/40 bg-bg-deep/75 px-6 backdrop-blur-xl xl:h-[96px]">
        <Skeleton className="h-12 w-44" />
      </div>
    </div>
  );
}

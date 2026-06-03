import { redirect } from "next/navigation";

// DEPRECADO: o onboarding doutrinario agora e o Ritual gamificado em /doutrina
// (substitui o aceite passivo de 5 slides — decisao Pedro 2026-06-02).
// Mantido como redirect pra compatibilidade de links/bookmarks antigos.
// OnboardingFlow.tsx e actions.ts (acceptDoctrine) ficam no repo mas nao sao mais usados.
export default function OnboardingDoutrinaRedirect() {
  redirect("/doutrina");
}

// Quantos acertos do quiz geram 1 permissão de partida (5 acertos = 1, acumulam).
// Em arquivo próprio (não "use server") pra poder ser importado por client components —
// um módulo "use server" só pode exportar funções async. Ver project_match_permissions.
export const QUESTIONS_PER_PERMISSION = 5;

"use client";

// StudentListClient — wrapper client para a lista de alunos.
// Gerencia refresh da lista após ações de coach note.
//
// Recebe `students` como props (data vem do Server Component pai).
// Ao chamar onActionSuccess → router.refresh() para rebuscar dados frescos.

import { useRouter } from "next/navigation";
import { StudentRow } from "@/components/pro/student-row";
import type { StudentSummary } from "@/app/pro/actions";

interface StudentListClientProps {
  students: StudentSummary[];
}

/**
 * Lista de alunos com refresh automático após coach notes.
 * Renderiza um StudentRow por aluno.
 */
export function StudentListClient({ students }: StudentListClientProps) {
  const router = useRouter();

  function handleActionSuccess() {
    // Recarrega dados do servidor após mutação bem-sucedida
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {students.map((student) => (
        <StudentRow
          key={student.userId}
          student={student}
          onActionSuccess={handleActionSuccess}
        />
      ))}
    </div>
  );
}

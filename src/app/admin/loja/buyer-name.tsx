// Nome do comprador com a foto da conta; pedido sem conta mostra só as iniciais.

import { UserAvatar } from "@/components/ui/avatar";
import { UserHoverCard } from "@/components/profile/user-hover-card";

interface BuyerNameProps {
  name: string;
  userId: string | null;
  avatarUrl?: string | null;
  /** Atalho do WhatsApp: a foto entra no mesmo link para não aninhar links. */
  whatsapp?: string | null;
}

const ROW = "inline-flex min-w-0 items-center gap-2 align-middle";

export function BuyerName({ name, userId, avatarUrl, whatsapp = null }: BuyerNameProps) {
  const content = (
    <>
      <UserAvatar src={avatarUrl ?? undefined} alt={name} fallback={name.slice(0, 2).toUpperCase()} size="xs" />
      <span className="truncate">{name}</span>
    </>
  );
  if (whatsapp) {
    return (
      <a className={`${ROW} text-text-display underline-offset-2 hover:underline`} href={whatsapp} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }
  if (userId) {
    return (
      <UserHoverCard userId={userId} className={`${ROW} text-text-display`}>
        {content}
      </UserHoverCard>
    );
  }
  return <span className={`${ROW} text-text-display`}>{content}</span>;
}

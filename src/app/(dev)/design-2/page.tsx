// /design-2: o catálogo do design 2.0 no servidor local, sem login (o layout (dev) dá 404 em
// produção). No ar, o mesmo catálogo fica em /admin/design.

import { ClientShell } from "@/components/client-shell/shell";
import { V2Catalog } from "@/components/v2/catalog";

export default function DesignCatalogDevPage() {
  return (
    <ClientShell currentRoute="/admin" hideRightSidebar>
      <V2Catalog />
    </ClientShell>
  );
}

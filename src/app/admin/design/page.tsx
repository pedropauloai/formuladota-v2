// /admin/design: catálogo vivo do design 2.0 no ar, só para admin (o layout de /admin protege).

import type { Metadata } from "next";
import { V2Catalog } from "@/components/v2/catalog";
import { requireAdminPage } from "@/lib/auth/admin-page";

export const metadata: Metadata = { title: "Design 2.0", robots: { index: false, follow: false } };

export default async function DesignCatalogPage() {
  await requireAdminPage();
  return <V2Catalog />;
}

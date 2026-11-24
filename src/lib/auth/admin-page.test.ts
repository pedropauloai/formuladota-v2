import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Sessão, perfil e modo de prévia simulados: o teste confere quem a página deixa passar.
const h = vi.hoisted(() => ({ user: null as { id: string } | null, isAdmin: false, preview: false }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("@/lib/auth/preview-mode", () => ({ getPreviewModeActive: async () => h.preview }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        single: async () => ({ data: { is_admin: h.isAdmin }, error: null }),
      };
      return builder;
    },
  }),
}));

import { requireAdminPage } from "./admin-page";

beforeEach(() => {
  h.user = { id: "admin-1" };
  h.isAdmin = true;
  h.preview = false;
});

describe("conferência de admin na página", () => {
  it("admin logado passa e recebe o próprio id", async () => {
    await expect(requireAdminPage()).resolves.toBe("admin-1");
  });

  it("visitante sem login volta para a home", async () => {
    h.user = null;
    await expect(requireAdminPage()).rejects.toThrow("redirect:/");
  });

  it("pessoa logada que não é admin não passa", async () => {
    h.isAdmin = false;
    await expect(requireAdminPage()).rejects.toThrow("redirect:/dashboard");
  });

  it("admin no modo de prévia também não passa", async () => {
    h.preview = true;
    await expect(requireAdminPage()).rejects.toThrow("redirect:/dashboard");
  });
});

function adminPages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return adminPages(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

describe("toda página do /admin confere o admin por conta própria", () => {
  const pages = adminPages(join(process.cwd(), "src", "app", "admin"));

  it("a varredura achou as páginas do admin", () => {
    expect(pages.length).toBeGreaterThanOrEqual(14);
    expect(pages.some((p) => p.endsWith(join("loja", "fila", "page.tsx")))).toBe(true);
  });

  it.each(pages.map((p) => [p.slice(p.indexOf("src")), p]))("%s chama requireAdminPage antes de ler dados", (_label, file) => {
    const source = readFileSync(file, "utf8");
    const body = source.slice(source.indexOf("export default"));
    expect(body).toContain("await requireAdminPage();");
  });
});

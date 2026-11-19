import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-next";

describe("safeInternalPath", () => {
  it.each(["/party", "/party?utm_source=live", "/loja/vaga-na-party", "/"])("aceita %s", (path) => {
    expect(safeInternalPath(path)).toBe(path);
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "party", "/party\nSet-Cookie:x", "javascript:alert(1)", null, 42, `/${"a".repeat(250)}`])(
    "recusa %s",
    (path) => {
      expect(safeInternalPath(path)).toBeNull();
    },
  );
});

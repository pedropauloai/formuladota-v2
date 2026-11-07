import { describe, it, expect } from "vitest";
import { originFromUrl, mergeOrigin, parseOrigin, serializeOrigin, sourceLabel, referrerHost, hasCampaign } from "./attribution";

const SITE = ["www.formuladota.com.br", "formuladota.com.br", "localhost"];

describe("originFromUrl", () => {
  it("lê as UTMs em minúsculas e o caminho sem query", () => {
    const url = new URL("https://www.formuladota.com.br/loja?utm_source=Instagram&utm_medium=bio&utm_campaign=Loja%20Nov");
    expect(originFromUrl(url, null, SITE)).toEqual({
      utm_source: "instagram",
      utm_medium: "bio",
      utm_campaign: "loja nov",
      landing_path: "/loja",
    });
  });

  it("guarda o domínio de origem sem www e ignora o próprio site", () => {
    const url = new URL("https://www.formuladota.com.br/");
    expect(originFromUrl(url, "https://www.youtube.com/watch?v=abc", SITE).referrer_host).toBe("youtube.com");
    expect(originFromUrl(url, "https://www.formuladota.com.br/loja", SITE).referrer_host).toBeUndefined();
  });

  it("corta valor longo e tira caractere de controle", () => {
    const url = new URL(`https://x.test/?utm_source=${"a".repeat(300)}&utm_medium=%0Abio`);
    const origin = originFromUrl(url, null, SITE);
    expect(origin.utm_source).toHaveLength(100);
    expect(origin.utm_medium).toBe("bio");
  });
});

describe("referrerHost", () => {
  it("referrer inválido vira undefined", () => {
    expect(referrerHost("não é url", SITE)).toBeUndefined();
    expect(referrerHost(undefined, SITE)).toBeUndefined();
  });
});

describe("mergeOrigin", () => {
  const insta = { utm_source: "instagram", utm_medium: "bio", landing_path: "/loja" };
  const youtube = { utm_source: "youtube", landing_path: "/" };
  const direto = { landing_path: "/loja/mentoria" };

  it("último toque com campanha vence", () => {
    expect(mergeOrigin(insta, youtube)).toEqual(youtube);
  });

  it("visita sem campanha mantém a origem anterior", () => {
    expect(mergeOrigin(insta, direto)).toEqual(insta);
  });

  it("primeira visita sem nada fica como direta", () => {
    expect(mergeOrigin(null, direto)).toEqual(direto);
    expect(hasCampaign(direto)).toBe(false);
  });
});

describe("parseOrigin", () => {
  it("volta o que foi serializado", () => {
    const origin = { utm_source: "tiktok", utm_medium: "bio", landing_path: "/loja" };
    expect(parseOrigin(serializeOrigin(origin))).toEqual(origin);
  });

  it("descarta chave desconhecida e valor que não é texto", () => {
    const raw = encodeURIComponent(JSON.stringify({ utm_source: "x", admin: true, utm_medium: 3, evil: "<script>" }));
    expect(parseOrigin(raw)).toEqual({ utm_source: "x" });
  });

  it("cookie quebrado vira null", () => {
    expect(parseOrigin("%E0%A4%A")).toBeNull();
    expect(parseOrigin("[1,2]")).toBeNull();
    expect(parseOrigin("")).toBeNull();
  });
});

describe("sourceLabel", () => {
  it("UTM manda", () => {
    expect(sourceLabel({ utm_source: "instagram", referrer_host: "youtube.com" })).toBe("instagram");
  });

  it("sem UTM, o domínio conhecido vira o canal", () => {
    expect(sourceLabel({ referrer_host: "l.instagram.com" })).toBe("instagram");
    expect(sourceLabel({ referrer_host: "m.youtube.com" })).toBe("youtube");
    expect(sourceLabel({ referrer_host: "youtu.be" })).toBe("youtube");
    expect(sourceLabel({ referrer_host: "google.com.br" })).toBe("google");
  });

  it("sem nada é direto, e domínio desconhecido aparece como é", () => {
    expect(sourceLabel({})).toBe("direto");
    expect(sourceLabel({ referrer_host: "reddit.com" })).toBe("reddit.com");
  });
});

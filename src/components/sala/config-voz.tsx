"use client";

// Configurações de voz, como no Discord: o microfone, a saída de som (só onde o navegador deixa
// escolher), o teste do microfone com o nível ao vivo e a redução de ruído. Vale na hora, sem sair da
// sala, e fica guardado neste navegador. Os nomes dos aparelhos só aparecem depois de o navegador
// liberar o microfone a primeira vez.

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { plate } from "@/components/v2";
import { aparelhoOuPadrao, CONFIG_PADRAO, configVoz } from "@/lib/sala/cliente/config-voz";
import { getMicTrack, temEscolhaDeSaida } from "@/lib/sala/cliente/midia";

const SEM_ESCOLHA = ["default", "communications"];

/** Os aparelhos de som do computador, relidos quando um é ligado ou desligado. */
function useAparelhos(ativo: boolean) {
  const [lista, setLista] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!ativo || !media?.enumerateDevices) return;
    let vivo = true;
    const ler = async () => {
      const todos = await media.enumerateDevices().catch(() => []);
      if (vivo) setLista(todos);
    };
    void ler();
    media.addEventListener("devicechange", ler);
    return () => {
      vivo = false;
      media.removeEventListener("devicechange", ler);
    };
  }, [ativo]);
  const de = (kind: MediaDeviceKind) => lista.filter((d) => d.kind === kind && !SEM_ESCOLHA.includes(d.deviceId));
  return { entradas: de("audioinput"), saidas: de("audiooutput"), semNomes: lista.some((d) => d.kind === "audioinput" && !d.label) };
}

/** Nível do microfone escolhido, ao vivo, enquanto o teste está ligado (0 a 1). */
function useTesteDoMicrofone(testando: boolean, microfone: string | null, reducaoRuido: boolean): number {
  const [nivel, setNivel] = useState(0);
  useEffect(() => {
    if (!testando) return;
    let vivo = true;
    let parar: () => void = () => undefined;
    void (async () => {
      const track = await getMicTrack({ microfone, reducaoRuido }).catch(() => null);
      if (!track || !vivo) return track?.stop();
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(new MediaStream([track])).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      const tick = window.setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        let soma = 0;
        for (const v of buffer) soma += v * v;
        setNivel(Math.sqrt(soma / buffer.length));
      }, 100);
      parar = () => {
        window.clearInterval(tick);
        track.stop();
        void ctx.close().catch(() => null);
      };
    })();
    return () => {
      vivo = false;
      parar();
      setNivel(0);
    };
  }, [testando, microfone, reducaoRuido]);
  return nivel;
}

const seletor = "h-9 w-full rounded-sm border border-border-subtle bg-bg-deep px-2 text-sm text-text-display";

function Escolha({ rotulo, valor, onChange, opcoes, padrao, data, dica }: { rotulo: string; valor: string; onChange: (v: string | null) => void; opcoes: MediaDeviceInfo[]; padrao: string; data: Record<string, string>; dica?: ReactNode }) {
  const t = useTranslations("sala");
  return (
    <label className="block space-y-1 text-sm text-text-body">
      <span>{rotulo}</span>
      <select value={valor} onChange={(e) => onChange(e.target.value || null)} className={seletor} {...data}>
        <option value="">{padrao}</option>
        {opcoes.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || t("aparelhoSemNome", { n: i + 1 })}</option>)}
      </select>
      {dica && <span className="block text-xs text-text-muted">{dica}</span>}
    </label>
  );
}

function Teste({ microfone, reducaoRuido }: { microfone: string | null; reducaoRuido: boolean }) {
  const t = useTranslations("sala");
  const [testando, setTestando] = useState(false);
  const nivel = useTesteDoMicrofone(testando, microfone, reducaoRuido);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text-body">{t("testeMicrofone")}</span>
        <button type="button" onClick={() => setTestando((v) => !v)} className={plate({ kind: testando ? "brand" : "ghost", small: true })} data-sala-config-testar={testando ? "sim" : "nao"}>
          {testando ? t("pararTeste") : t("testar")}
        </button>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm bg-bg-deep" aria-hidden="true">
        <div className="h-full bg-play-primary" style={{ width: `${Math.min(100, Math.round(nivel * 400))}%` }} data-sala-config-nivel={Math.round(nivel * 1000)} />
      </div>
    </div>
  );
}

export function ConfigVoz({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  const t = useTranslations("sala");
  const cfg = useSyncExternalStore(configVoz.subscribe, configVoz.get, () => CONFIG_PADRAO);
  const emUso = useSyncExternalStore(configVoz.subscribe, configVoz.emUso, () => null);
  const { entradas, saidas, semNomes } = useAparelhos(aberto);
  const microfone = aparelhoOuPadrao(entradas.map((d) => d.deviceId), cfg.microfone);
  return (
    <Dialog.Root open={aberto} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content playSoundOnOpen={false} className="max-w-md space-y-4" data-sala-config-voz="">
        <Dialog.Title>{t("configVozTitulo")}</Dialog.Title>
        <Dialog.Description>{t("configVozTexto")}</Dialog.Description>
        <Escolha
          rotulo={t("microfone")} valor={microfone ?? ""} onChange={(v) => configVoz.set({ microfone: v })} opcoes={entradas} padrao={t("padraoDoSistema")} data={{ "data-sala-config-microfone": "" }}
          dica={emUso && <span data-sala-microfone-em-uso={emUso}>{t("microfoneEmUso", { nome: emUso })}</span>}
        />
        {temEscolhaDeSaida() && (
          <Escolha rotulo={t("saidaDeSom")} valor={aparelhoOuPadrao(saidas.map((d) => d.deviceId), cfg.saida) ?? ""} onChange={(v) => configVoz.set({ saida: v })} opcoes={saidas} padrao={t("padraoDoSistema")} data={{ "data-sala-config-saida": "" }} />
        )}
        <Teste microfone={microfone} reducaoRuido={cfg.reducaoRuido} />
        <label className="flex items-start gap-2 text-sm text-text-body">
          <input type="checkbox" checked={cfg.reducaoRuido} onChange={(e) => configVoz.set({ reducaoRuido: e.target.checked })} className="mt-1 accent-[var(--color-play-primary)]" data-sala-config-ruido="" />
          <span>{t("reducaoRuido")}<span className="block text-xs text-text-muted">{t("reducaoRuidoDica")}</span></span>
        </label>
        {semNomes && <p className="text-xs text-gold">{t("aparelhosSemNome")}</p>}
        <div className="flex justify-end">
          <Dialog.Close className={plate({ kind: "ghost", small: true })} data-sala-config-fechar="">{t("fechar")}</Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

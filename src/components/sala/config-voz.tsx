"use client";

// Configurações de voz, como no Discord: o microfone, a saída de som (só onde o navegador deixa
// escolher), a sensibilidade de entrada e a redução de ruído. A barra mostra o nível ao vivo da voz no ar
// (fora da voz, pelo teste), verde quando a porta está aberta: no automático quem decide é a probabilidade
// de fala do RNNoise; no manual, a régua sobre a barra marca o limiar. Vale na hora, sem sair da sala, e
// fica guardado neste navegador. Os nomes dos aparelhos só aparecem depois de o navegador liberar o
// microfone a primeira vez.

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { plate } from "@/components/v2";
import { aparelhoOuPadrao, CONFIG_PADRAO, configVoz, type ConfigVoz as Config } from "@/lib/sala/cliente/config-voz";
import { filtroPossivel } from "@/lib/sala/cliente/filtro-voz";
import { medidorVoz } from "@/lib/sala/cliente/medidor-voz";
import { temEscolhaDeSaida } from "@/lib/sala/cliente/midia";
import { SENSIBILIDADE, type MedidaPorta } from "@/lib/sala/cliente/porta-voz";
import { BarraDeNivel } from "./barra-nivel";
import { useMicrofoneDeTeste } from "./use-microfone-de-teste";

const SEM_ESCOLHA = ["default", "communications"];

/** Os aparelhos de som do computador, relidos quando um é ligado ou desligado. */
export function useAparelhos(ativo: boolean) {
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

/** O nível ao vivo: o da voz no ar, quando há; senão o do teste (o microfone aberto só para medir). */
function useMedida(aberto: boolean, testando: boolean, microfone: string | null) {
  const temVoz = useSyncExternalStore(medidorVoz.subscribe, medidorVoz.temFonte, () => false);
  const [medida, setMedida] = useState<MedidaPorta | null>(null);
  useEffect(() => {
    if (!aberto || !temVoz) return;
    const soltar = medidorVoz.medir(setMedida);
    return () => {
      soltar();
      setMedida(null);
    };
  }, [aberto, temVoz]);
  const teste = useMicrofoneDeTeste(aberto && !temVoz && testando, microfone);
  return { medida: temVoz ? medida : teste.medida, temVoz };
}

const semAssinatura = () => () => undefined;

function Regua({ medida, cfg }: { medida: MedidaPorta | null; cfg: Config }) {
  const t = useTranslations("sala");
  return (
    <BarraDeNivel medida={medida}>
      {!cfg.sensibilidadeAuto && (
        <input
          type="range" min={SENSIBILIDADE.min} max={SENSIBILIDADE.max} step={1} value={cfg.sensibilidadeDb}
          onChange={(e) => configVoz.set({ sensibilidadeDb: Number(e.target.value) })}
          aria-label={t("sensibilidade")} data-sala-config-regua=""
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-0.5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-text-display [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-text-display"
        />
      )}
    </BarraDeNivel>
  );
}

function Sensibilidade({ aberto, microfone, cfg }: { aberto: boolean; microfone: string | null; cfg: Config }) {
  const t = useTranslations("sala");
  const [testando, setTestando] = useState(false);
  const { medida, temVoz } = useMedida(aberto, testando, microfone);
  return (
    <div className="space-y-1.5" data-sala-config-sensibilidade="">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text-body">{t("sensibilidade")}</span>
        <label className="flex items-center gap-2 text-sm text-text-body">
          <input type="checkbox" checked={cfg.sensibilidadeAuto} onChange={(e) => configVoz.set({ sensibilidadeAuto: e.target.checked })} className="accent-[var(--color-play-primary)]" data-sala-config-auto="" />
          <span>{t("sensibilidadeAuto")}</span>
        </label>
      </div>
      <Regua medida={medida} cfg={cfg} />
      {!temVoz && (
        <button type="button" onClick={() => setTestando((v) => !v)} className={plate({ kind: testando ? "brand" : "ghost", small: true })} data-sala-config-testar={testando ? "sim" : "nao"}>
          {testando ? t("pararTeste") : t("testar")}
        </button>
      )}
    </div>
  );
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

export function ConfigVoz({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  const t = useTranslations("sala");
  const cfg = useSyncExternalStore(configVoz.subscribe, configVoz.get, () => CONFIG_PADRAO);
  const emUso = useSyncExternalStore(configVoz.subscribe, configVoz.emUso, () => null);
  const { entradas, saidas, semNomes } = useAparelhos(aberto);
  const microfone = aparelhoOuPadrao(entradas.map((d) => d.deviceId), cfg.microfone);
  // O processador de áudio só existe no navegador: no servidor, a régua não aparece.
  const comFiltro = useSyncExternalStore(semAssinatura, filtroPossivel, () => false);
  return (
    <Dialog.Root open={aberto} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content playSoundOnOpen={false} className="max-w-md" data-sala-config-voz="">
        <Dialog.Title>{t("configVozTitulo")}</Dialog.Title>
        <div className="mt-5 space-y-5">
          <Escolha
            rotulo={t("microfone")} valor={microfone ?? ""} onChange={(v) => configVoz.set({ microfone: v })} opcoes={entradas} padrao={t("padraoDoSistema")} data={{ "data-sala-config-microfone": "" }}
            dica={emUso && <span data-sala-microfone-em-uso={emUso}>{t("microfoneEmUso", { nome: emUso })}</span>}
          />
          {temEscolhaDeSaida() && (
            <Escolha rotulo={t("saidaDeSom")} valor={aparelhoOuPadrao(saidas.map((d) => d.deviceId), cfg.saida) ?? ""} onChange={(v) => configVoz.set({ saida: v })} opcoes={saidas} padrao={t("padraoDoSistema")} data={{ "data-sala-config-saida": "" }} />
          )}
          {comFiltro && <Sensibilidade aberto={aberto} microfone={microfone} cfg={cfg} />}
          <label className="flex items-start gap-2 text-sm text-text-body">
            <input type="checkbox" checked={cfg.reducaoRuido} onChange={(e) => configVoz.set({ reducaoRuido: e.target.checked })} className="mt-1 accent-[var(--color-play-primary)]" data-sala-config-ruido="" />
            <span>{t("reducaoRuido")}</span>
          </label>
          {semNomes && <p className="text-xs text-gold">{t("aparelhosSemNome")}</p>}
          <div className="flex justify-end">
            <Dialog.Close className={plate({ kind: "ghost", small: true })} data-sala-config-fechar="">{t("fechar")}</Dialog.Close>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// O pulso da sessão: quando bater (a cada 10 s, ou na hora de uma mudança) e as métricas da conexão,
// medidas a cada 5 s para a tela e enviadas no batimento (a plateia da sala pública manda a cada 3).

import { snapshotFromStats, summarizeStats, type StatsSnapshot, type StatsSummary } from "../metricas";
import type { MemberRole, RoomKind } from "../tipos";
import type { Batimento } from "./acoes";
import type { Connection } from "./conexao";
import { beatDue, statsEveryBeats } from "./ritmo";

export interface Medida {
  qualidade: StatsSummary;
  medidas: { audioBytes: number; videoBytes: number; videoAltura: number | null };
}

export class Pulso {
  /** Algo mudou (mudo, mão, voz no ar): a próxima consulta já leva o batimento. */
  mudou = false;
  private ultimo: number | null = null;
  private batimentos = 0;
  private medido: StatsSnapshot | null = null;
  private enviado: StatsSnapshot | null = null;
  private anterior: StatsSnapshot | null = null;

  batimento(now: number, s: { papel: MemberRole | null; tipo: RoomKind | null; muted: boolean; hand: boolean }): Batimento | undefined {
    if (!beatDue({ now, lastBeatAt: this.ultimo, changed: this.mudou })) return undefined;
    this.mudou = false;
    this.ultimo = now;
    this.batimentos += 1;
    const cada = statsEveryBeats(s.papel ?? "ouvinte", s.tipo ?? "palco");
    let metricas: StatsSummary | undefined;
    if (this.batimentos % cada === 0 && this.medido) {
      metricas = summarizeStats(this.enviado, this.medido);
      this.enviado = this.medido;
    }
    return { muted: s.muted, hand: s.hand, metricas };
  }

  /** Mede a conexão para a tela: qualidade e bytes recebidos (o que o e2e confere). */
  async medir(conn: Connection): Promise<Medida> {
    const atual = snapshotFromStats(await conn.stats());
    const local = summarizeStats(this.anterior, atual);
    this.anterior = atual;
    this.medido = atual;
    return { qualidade: local, medidas: { audioBytes: atual.audioBytesReceived, videoBytes: atual.videoBytesReceived, videoAltura: local.videoHeight } };
  }

  /** Saiu ou refez a ligação: a próxima consulta bate na hora; com a ligação nova, as contagens recomeçam do zero. */
  reiniciar(ligacaoNova = false): void {
    this.ultimo = null;
    if (!ligacaoNova) return;
    this.medido = null;
    this.enviado = null;
    this.anterior = null;
  }
}

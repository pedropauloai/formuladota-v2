# SOUND_SYSTEM.md — FormulaDota V2.5

> Documento de fundacao para a camada de som da plataforma FORMULADOTA.
> Este documento e lei para todas as decisoes de implementacao de som de F5 em diante.
> Versao: 1.0 — 2026-05-23

---

## 1. Filosofia Sound

### Game client tem som. SaaS nao tem.

Essa e a divisoria que separa FORMULADOTA de qualquer SaaS dashboard com tema escuro.

Dota 2 client tem som em hover de heroi. Em click de botao. Em entrada de fila. Em partida encontrada. Riot Client tem stinger ao abrir. Battle.net tem musica ambiente ao fundo. Discord tem ping de notificacao com controle granular por servidor. Nenhum desses produtos e silencioso por padrao — porque silencio em game client nao e neutralidade, e sinal de produto inacabado.

A regra e simples: todo produto que o jogador de Dota 2 usa no computador tem som. FORMULADOTA e um desses produtos.

### O problema do overdoing

Som e cola de UX quando bem calibrado. Se vira ruido quando mal calibrado.

Sites que biipam em cada hover sao imediatamente fechados. Sites com loop de musica ambient sem controle de volume sao silenciados no primeiro minuto. O erro nao e ter som — e ter som sem sistema. Sem granularidade. Sem respeito ao mute do usuario.

A filosofia FORMULADOTA aplica tres restricoes obrigatorias:

1. **Coupling visual + sound**: todo som disparado pela interface acompanha uma acao visual correspondente. Som sem visual e fantasma. Visual sem som e informacao incompleta.
2. **Volume granular por layer**: interaction nao abafa ambient. Ambient nao engole reward. Cada layer tem token de volume proprio e independente.
3. **Mute respect persistido**: se o usuario silencia, permanece silenciado entre sessoes, abas, refreshes. Respeitar mute e questao de confianca.

### Som como cola de UX

No Dota 2 client, o som de hover num heroi confirma que a interface respondeu antes mesmo de qualquer mudanca visual ser processada cognitivamente. O stinger de "Partida Encontrada" cria urgencia que chama o jogador de volta da aba secundaria. O ambient de menu cria presenca — a sensacao de que ha vida na plataforma mesmo quando nenhum elemento visual esta em movimento.

FORMULADOTA precisa das tres funcoes:

- **Confirmacao**: som de click confirma que o sistema registrou a acao
- **Urgencia**: stinger de match found ou reward traz o jogador de volta ao foco
- **Presenca**: ambient cria atmosfera passiva de game client vivo

Qualquer componente que renderiza interacao visivel sem acoplar som (hover, click, confirmacao, erro) e um bug de UX, nao uma feature incompleta. Esta e a regra C20 do REQUIREMENTS.md.

---

## 2. As 8 Categorias de SFX UI

O sistema de som FORMULADOTA organiza todos os sons em 8 categorias canonicas. Nenhuma categoria adicional deve ser criada sem revisao deste documento. A canonica de 8 e suficiente para cobrir todo espectro de interacao de um game client web.

| Categoria | Role | Duracao | Volume Layer | Quando Dispara | Exemplo de Timbre |
|-----------|------|---------|--------------|----------------|-------------------|
| **hover** | Micro-feedback de presenca sobre elemento clicavel | 50-150ms | `--volume-interaction` (0.6) | `mouseenter` em botoes, cards interativos, links de navegacao | Breath sutil de ar, swoosh curtissimo (nao clique, nao beep — presenca) |
| **click** | Confirmacao de acao iniciada | 80-200ms | `--volume-interaction` (0.6) | `mousedown` em botoes primarios, secundarios e cards clicaveis | Tap solido com transient nitido, sem reverb longo — seco, preciso |
| **confirm** | Feedback de sucesso de acao completada | 300-500ms | `--volume-interaction` (0.6) | Acao completada com sucesso: salvar perfil, aceitar partida, entrar na fila | Chime curto ascendente, dois ou tres tons em sequencia breve — resolucao positiva |
| **error** | Sinal de falha sem alarmar | 200-400ms | `--volume-interaction` (0.6) | Falha de validacao, erro de rede, acao bloqueada | Tom descendente suave, dissonante mas nao agressivo — aviso, nao pericope |
| **notification** | Alerta de evento nao critico chegando | 400-800ms | `--volume-interaction` (0.6) | Mensagem nova no Discord integrado, aviso de sistema, ping de lobby | Bell warm ou ping melodico — reconhecivel sem urgencia, similar Discord |
| **reward** | Celebracao de conquista significativa | 500-1500ms | `--volume-reward` (0.8) | Badge desbloqueado, MMR subindo de tier, season reward, fichas concedidas | Chime mais longo com harmonica secundaria — sensacao de progressao, nao apenas conclusao |
| **ambient** | Atmosfera passiva de plataforma viva | Loop seamless (sem duracao fixa) | `--volume-ambient` (0.3) | Background ativo enquanto usuario esta na plataforma apos primeiro gesto | Low-frequency drone, wind sutis, reverb de caverna distante — presenca sem foco |
| **stinger** | Momento cinematografico de impacto maximo | 1000-2000ms | `--volume-reward` (0.8) | Login inicial da sessao, partida encontrada, reveal de season, modal critico abrindo | Musical stab cinematografico, curto mas denso — impacto de abertura de cinematica |

### Criterios de curadoria por categoria

Cada categoria tem restrições de timbre que garantem coesao do conjunto:

**hover**: O som mais discreto do sistema. Deve ser imperceptivel em volume baixo, confortavel em volume medio. Se alguem comentar "esse site bipa no hover", o hover esta errado. O alvo e subconsciente — o usuario sente que a interface respondeu sem processar conscientemente que ouviu algo. Nao deve ter click (isso e para a categoria click). Nao deve ter pitch reconhecivel (isso distrai).

**click**: Deve soar definitivo. Um transient seco e preferivel a qualquer som com cauda longa. Analogia: o click mecanico de um interruptor de qualidade alta, nao o clique plastico de um mouse barato. O usuario deve sentir que "acionou algo" de forma tangivel.

**confirm**: O unico som da categoria interaction que pode ter pitch reconhecivel. Dois ou tres tons ascendentes sao o padrao de mercado (usado em Discord, Battle.net, FACEIT). Deve soar positivo sem ser celebratorio — confirmacao e menor que reward.

**error**: O maior risco e o som de erro soar agressivo ou alarmante. Sons de erro que asustam o usuario sao piores que silencio. O alvo e "algo nao funcionou, tente novamente" — nao "ERRO CRITICO SISTEMA FALHANDO". Tom descendente breve, sem frequencias muito agudas, sem distorcao.

**notification**: Deve ser diferenciavel de confirm por timbre, nao apenas duracao. Confirm e resposta a acao propria. Notification e evento externo chegando. Um ping melodico ou bell warm cria essa distincao naturalmente.

**reward**: Pode ter sustain mais longo que todas as outras categorias de interaction. Nao deve ser confundido com musica — ainda e SFX, mas pode ter dois elementos harmonicos. O timing importa: o onset deve ser imediato (nao ha delay para celebracao), mas o tail pode durar ate 1500ms.

**ambient**: O unico som em loop continuo do sistema. Deve ser possivel ouvir por 30 minutos sem fadiga auditiva. Frequencias altas cansam — o ambient deve residir principalmente abaixo de 2kHz. Sem elementos ritmicos (ritmo prende atencao, o objetivo e liberar). Silencio em momentos do loop e aceitavel e desejavel.

**stinger**: O som de maior impacto do sistema. Onsets bruscos sao corretos nesta categoria — o stinger deve capturar atencao imediata. Analogia: o som de abertura do Dota 2 client ou o jingle de abertura do Riot Client. Deve ser memoravel — o usuario associa o stinger ao FORMULADOTA.

---

## 3. Volume Hierarchy

O sistema de volume usa tokens CSS declarados em `src/styles/tokens/sound.css` e consumidos pelo `SoundManager` em `src/lib/sound/manager.ts`.

### Tokens de volume (valores canonicos)

```css
/* src/styles/tokens/sound.css */

/* Volume por layer — valores 0.0 a 1.0 */
--volume-interaction: 0.6;   /* hover, click, confirm, error, notification */
--volume-ambient:     0.3;   /* background drone, loop seamless */
--volume-reward:      0.8;   /* reward chime, stinger cinematografico */
--volume-master:      1.0;   /* multiplicador global — ajustavel via user settings */
```

### Regras de hierarquia

**Regra de nao-abafamento**: o layer interaction (0.6) nunca deve sobrepor o ambient (0.3) de forma que o ambient desaparea da percepcao. A diferenca de 0.3 pontos entre os dois layers garante que os dois coexistam auditivamente. Se um som de interaction jogar enquanto ambient esta ativo, o usuario ouve os dois.

**Regra de nao-competicao**: dois sons do mesmo layer podem tocar simultaneamente se os eventos ocorrerem em rapida sucessao (ex: hover em dois botoes seguidos), mas o SoundManager deve limitar a no maximo 2-3 instancias simultaneas do mesmo sprite para evitar phasing indesejado.

**Regra do master**: o `--volume-master` e o multiplicador aplicado sobre todos os layers. O volume final de qualquer som e `volume-master * volume-layer`. Em V2.5, o master e sempre 1.0 (nenhum atenuacao global). Em versoes futuras com configuracoes de usuario, o master sera ajustavel entre 0.0 e 1.0 via painel de preferencias.

**Calculo de volume por som**:

```
volume_final = --volume-master * --volume-{layer}

Exemplos:
- hover:        1.0 * 0.6 = 0.60
- click:        1.0 * 0.6 = 0.60
- confirm:      1.0 * 0.6 = 0.60
- error:        1.0 * 0.6 = 0.60
- notification: 1.0 * 0.6 = 0.60
- ambient:      1.0 * 0.3 = 0.30
- reward:       1.0 * 0.8 = 0.80
- stinger:      1.0 * 0.8 = 0.80
```

### Justificativa dos valores

**0.6 para interaction**: Este e o range onde sons de interface sao perceptiveis sem dominar o ambiente sonoro do usuario. Sons acima de 0.7 comecam a parecer "altos demais" para interacoes cotidianas de click e hover. Sons abaixo de 0.4 ficam imperceptiveis em ambientes com qualquer ruido de fundo.

**0.3 para ambient**: Ambient loop deve estar sempre presente como camada de fundo mas nunca deve ocupar o primeiro plano auditivo. 0.3 posiciona o ambient claramente abaixo dos sons de interaction, evitando que o loop contamine a percepcao de outros sons.

**0.8 para reward e stinger**: Esses sons precisam capturar atencao ativa. O usuario pode estar em outra aba quando um stinger de match found ocorre. Volume mais alto (mas nao 1.0) garante que o som seja ouvido sem ser excessivamente brusco.

---

## 4. Coupling Obrigatorio Visual + Sound (Regra C20)

O requisito C20 do REQUIREMENTS.md estabelece: "cada componente que renderiza interacao visivel DEVE acoplar sound + motion."

Esta secao define o que isso significa na pratica.

### O que e coupling

Coupling visual + sound significa que os dois ocorrem no mesmo evento, disparados pela mesma causa, sem delay entre eles. Nao e "adicionar som depois". E projetar o componente para que som e visual sejam inseparaveis desde o inicio.

```tsx
// ANTI-PATTERN — visual sem sound (violacao C20)
<button
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
>
  Entrar na Fila
</button>

// CORRETO — coupling obrigatorio
const { play } = useSound()

<button
  onMouseEnter={() => {
    setHovered(true)
    play('hover')          // sound acoplado ao mesmo handler visual
  }}
  onMouseLeave={() => setHovered(false)}
  onClick={() => {
    play('click')          // click som no mousedown ou onClick
    handleEnterQueue()
  }}
>
  Entrar na Fila
</button>
```

### DSL de coupling automatico

O objetivo final do sistema e que Pedro (nao-dev) nunca precise lembrar de adicionar som manualmente. O componente `<Button>` deve disparar `useSound('hover')` e `useSound('click')` automaticamente, sem necessidade de prop adicional.

```tsx
// src/components/ui/button.tsx — implementacao alvo DF6.1
// O sound e interno ao componente — nao e responsabilidade de quem usa

function Button({ onClick, children, variant = 'primary', ...props }) {
  const { play } = useSound()

  return (
    <button
      onMouseEnter={() => play('hover')}
      onClick={(e) => {
        play('click')
        onClick?.(e)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

// Uso — zero boilerplate de som para quem consome:
<Button onClick={handleEnterQueue}>Entrar na Fila</Button>
```

### Mapeamento de casos obrigatorios

| Elemento | Evento | Sound obrigatorio | Visual obrigatorio |
|----------|--------|-------------------|-------------------|
| Qualquer botao primario | mouseenter | hover | Glow sutil ou scale 1.02 |
| Qualquer botao primario | click | click | Scale 0.97 (press feedback) |
| Acao completada com sucesso | callback de server action | confirm | Check icon ou cor verde breve |
| Acao falhando (erro de rede, validacao) | catch de server action | error | Shake sutil ou cor vermelha breve |
| Modal abrindo | onOpen | stinger | Fade-in + scale de 0.95 para 1.0 |
| Notificacao nova | evento de realtime | notification | Badge ou dot pulsante |
| Badge ou rank desbloqueado | evento de conquista | reward | Particle burst ou glow expandindo |
| Login inicial da sessao (primeiro acesso) | mount do ClientShell | stinger | Fade-in do logo |

### O que e bug de C20

- Botao sem som de hover: **bug**
- Botao sem som de click: **bug**
- Modal abrindo sem qualquer som: **oportunidade perdida** (nao e bug critico, mas e incompleto)
- Empty state sem motion de entrance: **bug**
- Server action sem feedback sonoro de sucesso ou erro: **bug**
- Som de hover sem qualquer resposta visual: **bug** (som orfao)

---

## 5. Criterios de Curadoria SFX

Esta secao define os criterios para selecionar os 6 SFX iniciais do sprite sheet (DF5.3). A sessao de curadoria esta delegada para a fase F5 (~3h dedicadas), mas os criterios sao definidos aqui como lei.

### Criterio 1: Coesao timbral

Os 6 sons do sprite inicial devem soar como se viessem do mesmo universo sonoro. Nao e aceitavel misturar timbre sci-fi eletronico de um som com timbre de fantasy organico de outro.

O universo timbral correto para FORMULADOTA e **fantasy-tech hibrido escuro**: sons que combinam elementos eletronicos (sintetizadores) com elementos organicos (metal, pedra, madeira processada). Referencia: a soundscape do proprio Dota 2 client — nao e sci-fi puro (sem laser guns), nao e fantasy organico puro (sem harps e flautas). E metal, pedra, eletricidade contida, potencia reprimida.

Sons que passam no teste: click de metal pesado com reverb curto de pedra, chime processado com distorcao sutil, drone de frequencia baixa com textura granular.

Sons que reprovam: click plastico limpo (muito SaaS), harpa (fantasy demais), laser (sci-fi demais), piano limpo sem processamento (muito SaaS), qualquer som com voz humana.

### Criterio 2: Duracao adequada por categoria

| Categoria | Duracao maxima aceitavel | Duracao ideal |
|-----------|--------------------------|---------------|
| hover | 150ms | 80-100ms |
| click | 200ms | 100-150ms |
| confirm | 500ms | 300-400ms |
| error | 400ms | 250-350ms |
| notification | 800ms | 500-700ms |
| reward | 1500ms | 800-1200ms |

Sons mais longos que os limites acima nao devem ser considerados para o sprite sheet. Sons ambient e stinger nao estao no sprite e podem ter duracao maior.

### Criterio 3: Sem voz humana

Sons sinteticos ou foley abstrato apenas. Qualquer som com voz humana, respiracao reconhecivel ou vocalizacao e descartado imediatamente. Isso inclui sussurros, samples de voz processada e qualquer som que remeta a locucao.

### Criterio 4: Sem melodia

SFX de UI nao sao musica. Sons com progressao melodica clara (ex: um riff de guitarra de 2 segundos) tiram o usuario do contexto de interface e passam a ser musica ambiente. A categoria de notification pode ter dois ou tres tons em sequencia (ping melodico), mas isso e o limite. Qualquer som que faca o usuario pensar "essa e uma melodia" deve ser descartado.

### Criterio 5: Sem cliche stock

Sons que imediatamente evocam outros produtos sao descartados:
- "Ding!" do WhatsApp (notification cliche)
- "Pop" do Messenger (notification cliche alternativo)
- "Swoosh" do iPhone Mail (email dismiss cliche)
- Qualquer som imediatamente reconhecivel de outro produto de grande audiencia

O objetivo e que o usuario nao tenha uma associacao imediata com outro produto. O sound palette do FORMULADOTA deve ser proprio.

### Criterio 6: Alinhamento com universo Dota 2

Sons "ritualisticos" sao preferidos sobre sons "sci-fi puros". O Dota 2 vive na intersecao entre magia dark-fantasy e tecnologia magica. Sons que remetem a metal, pedra, poder contido, ritual antigo — esses passam. Sons que remetem a interface de nave espacial ou computador futurista — esses nao sao o universo.

Exemplos de adjetivos guia para busca: dark, ritual, ancient, metal impact, stone resonance, arcane, somber, ominous (sutil).

### Criterio 7: Qualidade minima Freesound

Para curadoria no Freesound:
- Rating minimo: 4.0 estrelas (ou superior a 4.0 — nao ha half-stars em Freesound para filtro, usar metrica de downloads como proxy)
- Downloads minimos: 500 (indica que a comunidade validou o som)
- Preferir sons com 1000+ downloads como indicador de qualidade reconhecida

### Criterio 8: Licenca CC0 exclusiva

**Apenas CC0 1.0 Universal.** Nenhuma outra licenca e aceitavel.

Licencas rejeitadas:
- **CC-BY** (Attribution): exige credito explicito em cada uso — impraticavel em software
- **CC-BY-SA** (Attribution-ShareAlike): mesmo problema mais restricao viral
- **CC-BY-NC** (NonCommercial): restringe uso comercial — FORMULADOTA e produto comercial
- **CC-BY-ND** (NoDerivatives): proibe processamento do som
- **Qualquer licenca proprietaria**: mesmo que "free for commercial use"

A verificacao de licenca deve ser feita diretamente na pagina do som no Freesound, lendo o campo de licenca explicitamente — nao confiar em tags ou descricoes do uploader.

---

## 6. Layers Separation — Interaction vs Ambient

O sistema opera em dois layers fundamentais com naturezas radicalmente diferentes.

### Layer de Interaction

**Caracteristicas**: sons pontuais, de duracao finita, disparados por gesto do usuario ou evento de sistema.

**Regras**:
- Maximo de 2-3 instancias simultaneas do mesmo sprite (evitar pile-up em clicks rapidos)
- Nunca em loop
- Volume: `--volume-interaction` (0.6) ou `--volume-reward` (0.8) dependendo da categoria
- Disparo: sempre vinculado a evento especifico (mouseenter, click, callback de acao)

**Sons neste layer**: hover, click, confirm, error, notification, reward, stinger

### Layer Ambient

**Caracteristicas**: loop continuo, instancia unica, presenca passiva de fundo.

**Regras**:
- Sempre uma unica instancia ativa (novo ambient faz crossfade com o anterior, nunca toca em cima)
- Crossfade de 5-10 segundos ao trocar de faixa
- Volume: `--volume-ambient` (0.3) — sempre abaixo do layer de interaction
- Disparo: nunca automatico — aguarda primeiro user gesture (restricao de mobile autoplay)
- Arquivos: separados do sprite sheet (tracks longas carregadas sob demanda)

**Sons neste layer**: ambient loop (drone, wind, cave drone)

### Independencia de controle

Cada layer tem seu proprio token de volume e pode ser mutado independentemente. O usuario pode preferir:
- Interaction ativo + Ambient desligado: para sessoes de trabalho concentrado
- Interaction desligado + Ambient ativo: para quem prefere atmosfera sem feedback sonoro
- Ambos ativos: comportamento padrao
- Ambos desligados: mute global

A implementacao no SoundManager deve expor controle por layer:

```typescript
// src/lib/sound/manager.ts
soundManager.setMuted('interaction', true)   // desliga hover/click/confirm/error
soundManager.setMuted('ambient', false)      // mantém ambient ativo
soundManager.setMuted('all', true)           // mute global
```

---

## 7. Mute Persistence

O estado de mute e a unica configuracao de som que DEVE ser persistida entre sessoes em V2.5. Volumes por layer sao persistidos como melhoria futura.

### Chaves de localStorage

```typescript
// Chaves canonicas — nao alterar sem atualizar este documento
const STORAGE_KEYS = {
  muted:            'fd-sound-muted',             // boolean: true/false
  volumeInteraction: 'fd-sound-volume-interaction', // number: 0.0-1.0
  volumeAmbient:    'fd-sound-volume-ambient',     // number: 0.0-1.0
  volumeReward:     'fd-sound-volume-reward',      // number: 0.0-1.0
} as const
```

### Comportamento de restauracao

O `SoundManager` restaura o estado no constructor, antes de qualquer som ser disparado:

```typescript
// src/lib/sound/manager.ts — constructor
constructor() {
  // Restaurar mute
  const savedMuted = localStorage.getItem('fd-sound-muted')
  this.muted = savedMuted === 'true'

  // Restaurar volumes (fallback aos defaults se nao encontrado)
  this.volumes = {
    interaction: parseFloat(
      localStorage.getItem('fd-sound-volume-interaction') ?? '0.6'
    ),
    ambient: parseFloat(
      localStorage.getItem('fd-sound-volume-ambient') ?? '0.3'
    ),
    reward: parseFloat(
      localStorage.getItem('fd-sound-volume-reward') ?? '0.8'
    ),
  }
}
```

### Hook de acesso ao estado de mute

O hook `useMuteState()` expoe o estado de mute para componentes de UI:

```typescript
// src/lib/sound/hooks.ts
export function useMuteState() {
  const [muted, setMuted] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('fd-sound-muted') === 'true'
  })

  const toggleMute = useCallback(() => {
    const next = !muted
    setMuted(next)
    soundManager.setMuted('all', next)
    localStorage.setItem('fd-sound-muted', String(next))
  }, [muted])

  return { muted, toggleMute }
}
```

### Controle de UI

O icone de speaker no top-bar (DF8.1 — ClientShell) expoe o toggle de mute. O estado visual do icone (speaker ativo vs. speaker com X) e controlado pelo `useMuteState()` hook. A tecla F8 pode ser usada como atalho de teclado para toggle em V3+.

Regra: o controle de mute deve estar visivel em todas as rotas autenticadas. Nao e um item de configuracoes enterrado — e um controle de primeiro nivel na shell.

---

## 8. Mobile Autoplay Constraints

Browsers modernos bloqueiam `AudioContext` em estado `suspended` ate que o usuario realize um gesto explicito. Tentar reproduzir som antes do primeiro gesto resulta em erro silencioso ou aviso no console.

### Comportamento correto antes do gesto

Chamadas a `play()` antes do primeiro gesto devem ser **no-ops silenciosas** — sem erro no console, sem tentativa de decodificar audio, sem Promise rejeitada. O usuario simplesmente nao ouve o som, e o sistema registra que ele nao estava disponivel.

```typescript
// src/lib/sound/manager.ts
play(id: SoundId): void {
  if (!this.gestureReceived) return   // no-op silencioso
  if (this.muted) return              // no-op de mute
  this.howl.play(id)
}
```

### Inicializacao no primeiro gesto

O `SoundManager` registra listeners para o primeiro `click` ou `touchstart` no documento:

```typescript
// src/lib/sound/manager.ts — constructor
private gestureReceived = false

private initAudioContext(): void {
  const handler = () => {
    Howler.ctx?.resume()
    this.gestureReceived = true
    document.removeEventListener('click', handler)
    document.removeEventListener('touchstart', handler)
  }

  document.addEventListener('click', handler, { once: true })
  document.addEventListener('touchstart', handler, { once: true })
}
```

### Hook useFirstGesture

Para features que precisam saber se o AudioContext foi inicializado:

```typescript
// src/lib/sound/hooks.ts
export function useFirstGesture(): boolean {
  const [gestureReceived, setGestureReceived] = useState(false)

  useEffect(() => {
    const handler = () => setGestureReceived(true)
    document.addEventListener('click', handler, { once: true })
    document.addEventListener('touchstart', handler, { once: true })
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  return gestureReceived
}
```

### Ambient aguarda gesto

O ambient loop nunca deve tentar iniciar antes do primeiro gesto. O hook `useAmbient()` usa `useFirstGesture()` internamente:

```typescript
// src/lib/sound/hooks.ts
export function useAmbient(track: AmbientTrack) {
  const gestureReceived = useFirstGesture()

  useEffect(() => {
    if (!gestureReceived) return  // aguarda gesto antes de iniciar
    soundManager.playAmbient(track)
    return () => soundManager.stopAmbient()
  }, [gestureReceived, track])
}
```

### Nenhuma UI de "clique para ativar som"

Game clients nao exibem banners "click to enable audio". Essa e uma abordagem de site de marketing — nao de client. O som simplesmente nao toca ate o gesto, e passa a tocar naturalmente depois. O usuario percebera que o client tem som organicamente, sem prompt explicito.

---

## 9. Sprite Sheet vs Arquivos Separados

A arquitetura de assets de som segue uma divisao clara baseada em padroes de carregamento.

### Sprite sheet para SFX de UI (6 sons iniciais)

**Arquivo unico**: `public/sounds/ui-sprite.webm` + `public/sounds/ui-sprite.mp3`

Um unico request HTTP carrega todos os 6 sons de UI simultaneamente. O Howler gerencia o mapa de offsets internamente.

**Justificativa**: em mobile, latencia de rede pode ser 200-500ms por request. Com 6 arquivos separados, o primeiro som de hover poderia nao ter carregado ainda quando o usuario interage pela primeira vez. O sprite elimina esse risco: um request, tudo disponivel.

**Mapa de sprites** em `src/lib/sound/sprite-map.ts`:

```typescript
// src/lib/sound/sprite-map.ts
// Offsets em milissegundos [start, duration]
export const UI_SPRITE_MAP = {
  hover:        [0,     100],
  click:        [200,   150],
  confirm:      [450,   400],
  error:        [950,   350],
  notification: [1400,  600],
  reward:       [2100,  1200],
} as const

export type SoundId = keyof typeof UI_SPRITE_MAP
```

Os offsets acima sao estimativas — os valores reais serao definidos na fase F5 apos a producao do sprite com os SFX curados.

### Arquivos separados para ambient e stinger

Ambient loops e stingers sao carregados sob demanda, nao antecipados:

```
public/sounds/
├── ui-sprite.webm          # sprite dos 6 SFX de interaction
├── ui-sprite.mp3           # fallback MP3 do sprite
├── ambient/
│   ├── menu-idle.webm      # loop ambient do hub principal
│   └── queue-idle.webm     # loop ambient durante fila (opcional V2.5)
└── sfx/
    └── session-stinger.webm # stinger de login (opcional V2.5)
```

**Justificativa**: ambient tracks podem ter 1-3 minutos de duracao — incluir no sprite sheet adicionaria centenas de kilobytes ao carregamento inicial desnecessariamente. O ambient so e necessario apos o primeiro gesto do usuario, momento em que um request adicional e aceitavel.

### Build do sprite

O sprite WebM+MP3 e gerado via `audiosprite` ou `ffmpeg` na fase F5. O processo:

1. Sons CC0 curados salvos em `assets/sfx-raw/` (nao versionados apos build)
2. `audiosprite` concatena com silencio entre eles e gera o mapa de offsets
3. Output: `ui-sprite.webm`, `ui-sprite.mp3`, `sprite-map.json` (para referencia — o TS canonical e o `sprite-map.ts`)

---

## 10. Anti-Patterns Proibidos

Esta lista e exhaustiva para V2.5. Qualquer uma das seguintes situacoes encontrada no codebase e um bug que deve ser corrigido antes do PR ser aprovado.

**1. Sound silence completo**

O estado atual do FORMULADOTA (zero implementacao de audio) e o anti-pattern por definicao. Todo componente de interacao que existir ao fim de DF6 deve ter som. Qualquer componente sem som e incompleto.

**2. Sound em tudo indiscriminadamente**

O oposto do silence: adicionar som em cada pixel que responde a hover, cada texto que muda, cada counter que incrementa. Sons nao-relacionados a acao do usuario ou evento de sistema sao ruido. A regra: som apenas onde ha gesto do usuario ou evento de sistema relevante.

**3. Sound sem mute persistido**

`new Audio('/sounds/click.mp3').play()` em qualquer onClick e proibido. Nao ha controle de volume. Nao ha mute. Nao ha layer. Qualquer implementacao de audio fora do SoundManager e proibida.

**4. Sound sem volume granular**

Implementar som com volume fixo hardcoded no componente e anti-pattern. Todo volume e derivado dos tokens `--volume-{layer}` e multiplicado pelo `--volume-master`.

**5. SFX cliche stock**

Sons imediatamente associados a outros produtos (ding do WhatsApp, ping do Slack, swoosh do iOS Mail) devem ser descartados durante curadoria. Se passou na curadoria F5, deve ser substituido. Criterio de identificacao: se alguem ouvir o som e falar "isso e o som do [produto concorrente]", o som e invalido.

**6. Ambient sem opt-out**

O ambient loop nunca pode ser iniciado sem um mecanismo de desligamento disponivel ao usuario. O controle de mute no top-bar resolve isso, mas o ambient so deve iniciar em contextos onde o controle de mute esta visivelmente disponivel.

**7. Musica ou melodia em UI sounds**

Sons de interface nao sao musica. Sons que tem progressao melodica reconhecivel, ritmo marcado, ou que poderiam ser cantarolados sao descartados. A linha: dois ou tres tons em confirm ou notification sao aceitaveis. Um riff com quatro ou mais notas em sequencia nao e SFX — e musica.

---

## 11. Roadmap V2.5-F5 Asset Plan

### Sessao de curadoria delegada

A curadoria dos 6 SFX iniciais esta agendada para a fase F5, com sessao dedicada de aproximadamente 3 horas. A curadoria deve ser feita com acesso ao Freesound.org e com o universo timbral FORMULADOTA (fantasy-tech hibrido escuro) como guia constante.

### Queries de busca por categoria

As queries abaixo sao pontos de partida — devem ser ajustadas se os resultados nao produzirem sons que passem nos criterios de coesao timbral.

**hover**:
- `"ui hover subtle dark"`
- `"swoosh short ui"`
- `"interface breath subtle"`
- `"hover dark game"`

**click**:
- `"button click sci-fi dark"`
- `"tap solid transient"`
- `"click metal dark"`
- `"ui click dark game"`

**confirm**:
- `"chime short ascending"`
- `"ui success warm"`
- `"positive chime dark"`
- `"confirm game ui"`

**error**:
- `"descending tone soft"`
- `"ui error subtle"`
- `"error tone dark"`
- `"negative short tone"`

**notification**:
- `"bell warm short"`
- `"ping melodic"`
- `"notification bell dark"`
- `"alert bell soft"`

**reward**:
- `"ui reward chime"`
- `"achievement short fantasy"`
- `"reward dark chime"`
- `"level up short"`

### Filtros obrigatorios no Freesound

- Licenca: CC0 (verificar diretamente na pagina do som, nao confiar em filtro de busca exclusivamente)
- Duracao: conforme tabela da Secao 2 (max por categoria)
- Rating: preferir 4.0+ estrelas
- Downloads: preferir 500+ como proxy de qualidade

### Processo de selecao

Para cada categoria:
1. Executar queries de busca com filtros
2. Ouvir top 5-10 resultados
3. Selecionar top 3 candidatos que passem em todos os criterios da Secao 5
4. Comparar os 3 candidatos entre si buscando coesao timbral com os outros sons ja selecionados
5. Escolher 1 por categoria
6. Documentar a escolha (nome, ID Freesound, URL, licenca CC0 confirmada) em `src/lib/sound/CREDITS.md`

### Build do sprite

Apos selecionar os 6 sons:

```bash
# Instalar audiosprite globalmente (uma vez)
pnpm add -g audiosprite

# Gerar sprite na pasta public/sounds/
audiosprite \
  --output public/sounds/ui-sprite \
  --format howler2 \
  --export webm,mp3 \
  --gap 0.1 \
  assets/sfx-raw/hover.wav \
  assets/sfx-raw/click.wav \
  assets/sfx-raw/confirm.wav \
  assets/sfx-raw/error.wav \
  assets/sfx-raw/notification.wav \
  assets/sfx-raw/reward.wav
```

O output inclui `ui-sprite.webm`, `ui-sprite.mp3` e um JSON com o mapa de offsets (que sera traduzido para o `sprite-map.ts` canonico).

---

## Referencias Canonicas

### Implementacao

| Arquivo | Descricao |
|---------|-----------|
| `src/lib/sound/manager.ts` | Howler singleton + interface ISoundManager |
| `src/lib/sound/sprite-map.ts` | Mapa de offsets por ID de som |
| `src/lib/sound/hooks.ts` | useSound, useAmbient, useMuteState, useFirstGesture |
| `src/styles/tokens/sound.css` | Volume tokens CSS |
| `public/sounds/ui-sprite.webm` | Sprite sheet dos 6 SFX (gerado em F5) |
| `public/sounds/ui-sprite.mp3` | Fallback MP3 do sprite |
| `src/lib/sound/CREDITS.md` | Atribuicao CC0 por som curado |

### Requirements relacionados

- **DF1.4** — este documento (SOUND_SYSTEM.md)
- **DF2.7** — tokens de volume (`--volume-interaction`, `--volume-ambient`, `--volume-reward`)
- **DF5.1 a DF5.6** — implementacao do Sound Infrastructure completo
- **C16** — som via hook (nunca direto em onClick)
- **C20** — coupling visual + sound obrigatorio em toda interacao

### Bibliotecas

- **Howler.js v2.2.4** — unica biblioteca de audio autorizada. Nenhuma outra biblioteca de som deve ser adicionada ao projeto sem revisao deste documento e atualizacao da decisao arquitetural.
- **Sem `use-sound`** — wrapper que abstrai demais, perde acesso a sprites e ambient crossfade
- **Sem Tone.js** — sintetizador/DAW, fora do escopo de UI sounds
- **Sem Web Audio API direta** — Howler ja abstrai o necessario

---

*Documento criado: 2026-05-23*
*Milestone: V2.5 Design Foundations — Phase F1*
*Requirement: DF1.4*
*Proxima atualizacao: apos curadoria F5 (adicionar atribuicoes CC0 e valores reais de sprite-map)*

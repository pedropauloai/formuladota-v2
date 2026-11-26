// A permissão do microfone de teste (R22), injetada antes da página: a consulta de permissão e o pedido do
// microfone respondem como o navegador responderia em cada estado. "prompt": o pedido segura até a página de
// teste responder ao aviso (__responderAviso: true permite, false bloqueia, null fecha sem escolher);
// "denied": recusa como o navegador; "granted": abre o microfone falso do Chrome; "sistema": o navegador
// liberou, mas o Windows barra ("Permission denied by system") até __sistemaLibera(). __mudarPermissao muda
// a permissão e avisa a página, como o ícone do endereço faz.

export function permissaoDeTeste(inicial) {
  const md = navigator.mediaDevices;
  if (!md || !navigator.permissions) return;
  const original = md.getUserMedia.bind(md);
  const consultaOriginal = navigator.permissions.query.bind(navigator.permissions);
  let estado = inicial === "sistema" ? "granted" : inicial;
  let sistemaBarra = inicial === "sistema";
  const status = new EventTarget();
  Object.defineProperty(status, "state", { get: () => estado });
  Object.defineProperty(status, "name", { value: "microphone" });
  status.onchange = null;
  window.__mudarPermissao = (novo) => {
    estado = novo;
    const e = new Event("change");
    status.dispatchEvent(e);
    status.onchange?.(e);
  };
  window.__sistemaLibera = () => {
    sistemaBarra = false;
  };
  const avisos = [];
  window.__avisosAbertos = () => avisos.length;
  window.__responderAviso = (resposta) => {
    if (resposta === true) window.__mudarPermissao("granted");
    if (resposta === false) window.__mudarPermissao("denied");
    avisos.splice(0).forEach((seguir) => seguir(resposta));
  };
  navigator.permissions.query = async (p) => (p?.name === "microphone" ? status : consultaOriginal(p));
  md.getUserMedia = async (pedido) => {
    if (!pedido?.audio) return original(pedido);
    if (sistemaBarra) throw new DOMException("Permission denied by system", "NotAllowedError");
    if (estado === "denied") throw new DOMException("Permission denied", "NotAllowedError");
    if (estado === "prompt") {
      const resposta = await new Promise((seguir) => avisos.push(seguir));
      if (resposta === null) throw new DOMException("Permission dismissed", "NotAllowedError");
      if (resposta === false) throw new DOMException("Permission denied", "NotAllowedError");
    }
    return original(pedido);
  };
}

export const NAVEGADORES = {
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0",
  safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15",
  chromeMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

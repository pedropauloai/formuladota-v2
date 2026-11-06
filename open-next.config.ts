import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// O app roda na Cloudflare pelo OpenNext. Sem cache incremental: as páginas leem
// cookies (são dinâmicas) e nenhuma rota usa ISR, então não há R2 nem fila.
export default defineCloudflareConfig({});

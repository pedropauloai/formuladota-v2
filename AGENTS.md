# formuladota v2: instruções para agentes

A fonte da verdade das instruções deste repositório é o **`CLAUDE.md`** na raiz. Leia ele inteiro antes de qualquer tarefa: produto, lei da marca, i18n, stack, deploy (Cloudflare Workers pelo OpenNext, build no WSL), banco (migration nunca por `supabase db push`), loja, bots e fluxo de git.

Este arquivo existe para agentes que procuram `AGENTS.md` (Codex e afins). Ele era uma cópia do `CLAUDE.md` e ficou para trás (ainda dizia deploy na Vercel e o domínio antigo), por isso agora só aponta para lá.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

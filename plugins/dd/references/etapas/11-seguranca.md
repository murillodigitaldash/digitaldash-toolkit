# Etapa 11 — Segurança e supply chain

**Objetivo:** auditoria de segurança alinhada ao OWASP Top 10 + verificação de cadeia de dependências. Não substitui pentest.

**Esta etapa não repete critério de check.** Secrets, dependências e supply chain, e os checks de LGPD já têm julgamento, comando de detecção e guia de remediação próprios no núcleo — `checks/registry.yaml` mais o guia de julgamento de cada domínio dentro de `checks/` — descrevê-los de novo aqui é a duplicação que existia entre esta etapa e o antigo skill `cybersecurity-scan`, que listava os mesmos itens outra vez. A Etapa 11 **executa todo check do núcleo cujo `cadencia` inclua `release`**, sem exceção de domínio — hoje isso cobre `SEC-001` a `SEC-006`, `DEP-001` a `DEP-005`, `LOG-001` a `LOG-004` e `LOG-006`, `LGPD-001`, `LGPD-S-003`, `TEN-001` a `TEN-006` e `AI-005` —, reporta os achados por id, e trata como bloqueante todo achado com `bloqueia: true` aberto sem dono. A lista definitiva de ids é sempre a consulta ao `registry.yaml`, não esta prosa: o núcleo evolui sem esta etapa precisar mudar.

*OWASP Top 10 aplicado* — ver `references/owasp-checklist.md`. O checklist cobre, item a item, categorias que ainda não têm check formal no núcleo (SAST amplo, headers de resposta) ao lado de categorias que já têm (ex.: A01 remete a `TEN-*`, A09 remete a `LOG-*`) — preencha o status de cada item (`✅ OK` / `⚠️ Parcial` / `❌ Falha` / `N/A`) e abra plano de remediação pra todo item não-N/A diferente de OK.

*Específico React/Next.js:*
- `dangerouslySetInnerHTML` apenas com sanitizer (DOMPurify).
- `target="_blank"` com `rel="noopener noreferrer"`.
- CSP em `next.config.js` ou middleware.
- Server Actions: validar input com Zod (já endereçado na Etapa 2), revalidar permissão server-side.
- Route handlers: validar método, content-type, tamanho de payload.
- Cookies de sessão: `httpOnly`, `secure`, `sameSite=lax`/`strict`.

**Ferramentas:** as dos checks do núcleo — ver `deteccao.cmd` de cada id em `checks/registry.yaml` (`gitleaks`, `npm audit`, entre outras) — mais as que ainda não têm check formal: `semgrep` (SAST), `eslint-plugin-security`/`eslint-plugin-no-unsanitized`, e verificação de headers via `securityheaders.com` ou equivalente.

**Comandos:**
```bash
# Os comandos dos checks do núcleo (secrets, dependências, LGPD) já vivem
# em checks/registry.yaml — rode o `deteccao.cmd` de cada id com `release`
# na cadencia em vez de repeti-los aqui. SAST ainda não tem check formal:
semgrep --config=p/owasp-top-ten --config=p/react --config=p/nextjs --config=p/typescript --json > .protocolo/$STAMP/11-semgrep.json
```

**Reportar:** achados por id de check (severidade, `bloqueia` sim/não), mapa OWASP Top 10 preenchido, findings do `semgrep` por severidade, SBOM (gerado pelo check `DEP-005`), guidance React/Next.js sem achado pendente.

**Gate de saída:** zero achado Critical ou High aberto sem dono em check do núcleo com `bloqueia: true`. `SEC-004` sem achado aberto (secrets fora do histórico, não só do HEAD). Mapa OWASP Top 10 sem item `❌ Falha` sem plano de remediação. Guidance React/Next.js sem achado pendente.

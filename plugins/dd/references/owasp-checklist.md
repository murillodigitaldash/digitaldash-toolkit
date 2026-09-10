# OWASP Top 10 — Checklist aplicado

Marcar item por item durante a Etapa 11. Cada item: `✅ OK` / `⚠️ Parcial` / `❌ Falha` / `N/A`. Itens não-N/A com status diferente de OK precisam de plano de remediação.

## A01 — Broken Access Control
- [ ] Toda rota de API exige sessão válida (exceto endpoints explicitamente públicos).
- [ ] Autorização verificada server-side em cada operação.
- [ ] IDs em URLs não permitem IDOR — sempre checar ownership.
- [ ] Server Actions (Next.js) revalidam permissão antes de mutações.
- [ ] RLS (Postgres/Supabase) ou regras (Firebase) auditadas — coberto também na Etapa 8.
- [ ] Endpoints administrativos isolados ou com checagem extra (role, IP, MFA).

## A02 — Cryptographic Failures
- [ ] HTTPS forçado em produção (HSTS configurado).
- [ ] Cookies de sessão: `HttpOnly`, `Secure`, `SameSite=lax`/`strict`.
- [ ] Senhas com argon2id ou bcrypt (cost adequado). Sem MD5, SHA1, SHA256 puro pra senhas.
- [ ] Dados sensíveis em repouso criptografados (DB, S3, logs).
- [ ] JWT (se usado): algoritmo explícito (não `none`), segredo forte, expiração curta, refresh rotativo.
- [ ] Chaves criptográficas rotacionáveis e em secret manager.

## A03 — Injection
- [ ] ORM/Query builder com queries parametrizadas (Prisma, Drizzle, queries com placeholders). Sem string interpolation em SQL.
- [ ] Inputs validados com schema (Zod, Valibot) em toda rota e Server Action — conferir gate da Etapa 2.
- [ ] HTML de fonte não-confiável sanitizado (DOMPurify) antes de `dangerouslySetInnerHTML`.
- [ ] Comandos de shell sem interpolação direta — APIs estruturadas.
- [ ] NoSQL: operadores `$` filtrados em payloads de usuário (MongoDB).

## A04 — Insecure Design
- [ ] Rate limiting em login, signup, password reset, endpoints caros.
- [ ] Lockout progressivo ou CAPTCHA após N falhas.
- [ ] Webhooks: validação de assinatura (HMAC) obrigatória.
- [ ] Fluxos de pagamento idempotentes (chave de idempotência).
- [ ] Operações destrutivas exigem confirmação ou janela de desfazer.

## A05 — Security Misconfiguration
- [ ] CSP definida e restritiva (sem `unsafe-inline` em scripts; nonce ou hash).
- [ ] HSTS com `max-age` longo e `includeSubDomains`.
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` ou mais restritivo.
- [ ] `Permissions-Policy` desabilitando o que não usa.
- [ ] `X-Frame-Options: DENY` ou CSP `frame-ancestors`.
- [ ] `NODE_ENV=production` em produção, sem source maps públicos.
- [ ] Páginas de erro não vazam stack trace.
- [ ] CORS por origem explícita; sem `*` com credenciais.

## A06 — Vulnerable and Outdated Components
- [ ] `npm audit --audit-level=high` sem findings abertos.
- [ ] `osv-scanner` sem findings High/Critical.
- [ ] Renovate/Dependabot ativo.
- [ ] Lockfile commitado e `npm ci` no pipeline.
- [ ] Dependências abandonadas identificadas e plano de substituição.

## A07 — Identification and Authentication Failures
- [ ] MFA disponível (TOTP no mínimo).
- [ ] Senhas: comprimento mínimo, sem regras absurdas (NIST recomenda comprimento > complexidade).
- [ ] Verificação contra senhas vazadas (HaveIBeenPwned).
- [ ] Sessão expira por inatividade e por idade absoluta.
- [ ] Logout invalida sessão server-side.
- [ ] Password reset: token único, validade curta (15-30min), invalidado após uso.
- [ ] Email de mudança de senha/email para o endereço antigo.

## A08 — Software and Data Integrity Failures
- [ ] SRI (Subresource Integrity) em scripts externos.
- [ ] Pipeline de CI/CD não permite deploy de branch não-protegida.
- [ ] Tags/releases assinadas (se aplicável).
- [ ] Dependências críticas pinadas via lockfile.
- [ ] Auto-update desabilitado em libs sensíveis.

## A09 — Security Logging and Monitoring Failures
- [ ] Logs de eventos críticos: login, logout, falha de auth, password reset, mudança de email, mudança de permissão. (Conferir gate da Etapa 7.)
- [ ] Logs sem PII em texto plano.
- [ ] Logs estruturados (JSON) com campos consistentes.
- [ ] Alertas: pico de falhas de auth, pico de 5xx, queda de saúde de serviço.
- [ ] Retenção de logs alinhada com LGPD/contratos.

## A10 — Server-Side Request Forgery (SSRF)
- [ ] Fetch server-side com URL controlada por usuário usa allowlist.
- [ ] `next.config.js` `images.remotePatterns` com domínios específicos.
- [ ] DNS rebinding considerado em validações de URL.
- [ ] Cloud metadata endpoint (169.254.169.254) bloqueado para outbound do servidor.

## Extras específicos de React/Next.js

- [ ] `dangerouslySetInnerHTML` apenas com sanitizer.
- [ ] `target="_blank"` com `rel="noopener noreferrer"`.
- [ ] Variáveis `NEXT_PUBLIC_` / `EXPO_PUBLIC_` revisadas — só info pública.
- [ ] Route handlers validam método HTTP e content-type.
- [ ] Tamanho de payload limitado (uploads especialmente).
- [ ] Server Actions checam `headers()` quando relevante.

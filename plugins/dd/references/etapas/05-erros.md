# Etapa 5 — Tratamento de erros e resiliência

**Objetivo:** garantir que falhas são detectadas, comunicadas e recuperáveis. Vem antes de testes/observabilidade porque define os caminhos que serão instrumentados.

**Procurar:**
- Chamadas assíncronas sem `try/catch` ou `.catch()`.
- `await` em handlers sem captura.
- Promises descartadas (fire-and-forget não intencional).
- `console.error` sem destino em produção.
- Falta de error boundary em rotas/seções críticas.
- Estados de loading/error não diferenciados (endereçáveis com discriminated unions da Etapa 2).
- Falta de retry/backoff em chamadas idempotentes.
- Mensagens de erro vazando stack ou dados internos pro usuário. Credencial especificamente exposta em log de erro é o núcleo `SEC-006` — não repita o critério aqui, ver `checks/secrets.md`.
- Em Next.js App Router: ausência de `error.tsx`, `not-found.tsx`, `loading.tsx`.

**Implementar:**
- React Error Boundary por seção crítica (`react-error-boundary`).
- Em Next.js: `error.tsx` em cada segmento; `global-error.tsx` na raiz.
- Cliente HTTP centralizado com interceptors.
- Retry com backoff exponencial para idempotentes.
- UX de erro: mensagem humana, ação de retry, fallback.

A integração com sink de erros (Sentry/Datadog/BetterStack) é detalhada na Etapa 7.

**Ferramentas:** ESLint (`no-floating-promises`, `no-misused-promises`, `promise/catch-or-return`), `react-error-boundary`.

**Reportar:** mapa de async sem tratamento; rotas sem `error.tsx`/boundary; proposta de cliente HTTP padronizado; achados de `SEC-006` encontrados no caminho.

**Gate de saída:** zero floating promises. Toda rota crítica com boundary. Sink configurado (validado na Etapa 7). `SEC-006` sem achado aberto sem dono.

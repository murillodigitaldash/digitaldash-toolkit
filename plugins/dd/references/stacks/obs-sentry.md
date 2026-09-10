# Perfil de observabilidade — Sentry

Carregue este perfil quando detectar:
- Dependência `@sentry/nextjs`, `@sentry/react`, `@sentry/node`, `@sentry/react-native`.
- `sentry.client.config.*`, `sentry.server.config.*`, ou `.sentryclirc`.

Aplica-se à **Etapa 7** do protocolo.

## Setup esperado

- SDK do Sentry configurado pro framework (Next.js, React, Node, RN, etc.).
- `dsn` em env var, não hardcoded.
- `tracesSampleRate` definido (não 1.0 em produção — usar 0.1 ou menor).
- `replaysSessionSampleRate` se Session Replay habilitado (privacidade!).
- `release` setado dinamicamente (ex: SHA do commit, versão do package.json).
- `environment` setado por ambiente (`production`, `staging`, `preview`).

**Verificar:**
```bash
grep -rn "Sentry.init\|withSentryConfig" src next.config.* > .protocolo/$STAMP/07-sentry-config.txt
```

## Contexto enriquecido

Toda captura precisa de contexto pra ser útil:
- `setUser({ id })` após login — **sempre ID anonimizado, nunca email/PII bruta**.
- `setTag` pra dimensões do produto (plan, role).
- `setContext` pra payload relevante (sem PII).
- Breadcrumbs automáticos do framework + customizados em ações de negócio.

## Tracing

- Tracing habilitado nos fluxos críticos (alinhado com Etapa 6).
- Custom spans em operações de negócio importantes:
  ```ts
  Sentry.startSpan({ name: 'createOrder' }, async () => { ... });
  ```
- Integração com OpenTelemetry se for stack mista — `@sentry/opentelemetry`.

## Performance Monitoring

- Web Vitals capturados automaticamente.
- Slow queries (se backend instrumentado).
- Frontend transactions em rotas principais.

## Session Replay (se habilitado)

**Cuidado com privacidade:**
- `maskAllText: true` e `maskAllInputs: true` por default.
- Configurar `mask` e `block` em elementos sensíveis (formulários de pagamento, dados pessoais).
- `replaysSessionSampleRate` baixo (0.01-0.1).
- `replaysOnErrorSampleRate: 1.0` (capturar replays só de sessões com erro).
- LGPD: replay captura tela do usuário — política de privacidade deve mencionar.

## Source maps

- Upload de source maps no build pra ter stack trace legível.
- `withSentryConfig` no Next.js faz isso automaticamente.
- Source maps **não publicados** no site (apenas no Sentry).

## Alertas

- Alert quando taxa de erro de uma release > threshold.
- Alert em novo issue de severidade alta.
- Integração com Slack/Discord/PagerDuty.
- Cada alerta com runbook (link em `Alert → Action → URL`).

## Filtros

PII bruta em log/evento já tem check próprio no núcleo — `LOG-002`, ver `checks/logs.md#log-002`. Mecanismo específico de Sentry para evitar o achado:
- `beforeSend` pra filtrar erros conhecidos ou PII residual.
- `ignoreErrors` pra ruído (extensões de browser, scripts de terceiros).

## Checklist Sentry no relatório

- [ ] DSN em env, não hardcoded.
- [ ] `tracesSampleRate` ajustado pra produção.
- [ ] `release` e `environment` setados dinamicamente.
- [ ] `setUser` com ID anonimizado após login.
- [ ] Source maps publicados no Sentry, não no site.
- [ ] Session Replay com mask/block apropriados (se habilitado).
- [ ] Alertas configurados com runbook.
- [ ] `beforeSend` filtrando PII residual (`LOG-002` sem achado aberto).
- [ ] Erros dos boundaries da Etapa 5 chegando no Sentry (evento de teste validado).

# Etapa 7 — Observabilidade

**Objetivo:** garantir que o sistema é enxergável em produção. Logs, métricas, traces, alertas com runbook. Vem antes de performance porque medir sem observabilidade é medir só local.

**Carregue o perfil correspondente** de `references/stacks/`:
- `references/stacks/obs-sentry.md` — Sentry.
- `references/stacks/obs-datadog.md` — Datadog.
- `references/stacks/obs-betterstack.md` — BetterStack / Logtail.
- `references/stacks/obs-opentelemetry.md` — OpenTelemetry genérico (vendor-agnostic).
- Se o projeto não tem stack definido, use OpenTelemetry como recomendação default.

**Procurar (núcleo invariável):**

*Logs:* estruturação, PII em log, correlação por request/trace id e retenção têm check próprio no núcleo — `LOG-002` a `LOG-005` — não repita o critério aqui, ver `checks/logs.md`. Além disso:
- `console.log` em produção (substituir por logger configurado).
- Níveis de log usados corretamente (debug/info/warn/error/fatal).

*Métricas:*
- RUM no front (Core Web Vitals, erros de JS, navegação).
- Server timing em endpoints críticos.
- Métricas de negócio (signup completado, checkout iniciado, checkout finalizado, etc.).
- Cardinalidade controlada (tags com valor explosivo viram conta gigante).

*Tracing:*
- Tracing distribuído habilitado em fluxos críticos (request → API → DB → external service).
- Spans nomeados de forma legível.
- Context propagation entre serviços.

*Alertas:*
- Cada alerta tem runbook (link no próprio alerta).
- Alertas baseados em sintoma (latência alta, erro 5xx) e não só em causa (CPU alta).
- Sem alert fatigue: alertas que sempre disparam sem ação são removidos ou ajustados.
- SLOs definidos para os fluxos críticos da Etapa 6 com burn rate alerts.

*Cobertura:* eventos críticos de autenticação e mudança de permissão têm check próprio no núcleo — `LOG-001` e `LOG-006` — não repita o critério aqui, ver `checks/logs.md`. Além disso:
- Mudança de email logada (sem check próprio no núcleo).
- Erros do front (boundaries da Etapa 5) reportados ao sink.
- Server Actions e route handlers instrumentados.

**Implementar:**
- Logger central (Pino, Winston, ou nativo do framework) com formato estruturado.
- SDK do sink configurado (ver perfil do `references/stacks/`).
- OpenTelemetry para tracing (mesmo se o backend for Sentry/Datadog, OTel garante portabilidade).
- Sampling configurado (não loga 100% de tudo; foco em erro + sampling estatístico do resto).
- Dashboards mínimos: saúde do serviço, fluxos críticos, erros recentes.

**Comandos:**
```bash
# Verificar se sink está configurado e recebendo eventos:
grep -rn "Sentry.init\|datadog\|otelInit\|@opentelemetry" src > .protocolo/$STAMP/07-obs-setup.txt
grep -rn "console\.\(log\|error\|warn\)" src > .protocolo/$STAMP/07-console-uses.txt
```

**Reportar:**
- Inventário: o que está instrumentado vs o que devia estar.
- Lista de `console.*` em código de produção.
- Lista de fluxos críticos com cobertura de tracing.
- Lista de alertas configurados e quais têm runbook.
- SLOs definidos e burn rate alerts.

**Gate de saída:** logger estruturado configurado. Sink recebendo eventos de teste do release atual. `LOG-001` e `LOG-006` sem achado aberto sem dono. Mudança de email logada. Pelo menos 3 alertas com runbook. Tracing nos fluxos críticos da Etapa 6.

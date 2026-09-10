# Perfil de observabilidade — BetterStack (Logtail + Uptime)

Carregue este perfil quando detectar:
- Dependência `@logtail/node`, `@logtail/browser`, `@logtail/pino`.
- Variáveis `LOGTAIL_TOKEN`, `BETTER_STACK_*`.

Aplica-se à **Etapa 7** do protocolo.

## Setup esperado

BetterStack é forte em logs + uptime. Frequentemente combinado com Sentry (erros) ou OpenTelemetry (tracing).

**Backend:**
- Logger central (Pino preferido por integração nativa) com transport BetterStack:
  ```ts
  import pino from 'pino';
  const logger = pino({
    transport: {
      target: '@logtail/pino',
      options: { sourceToken: process.env.LOGTAIL_TOKEN }
    }
  });
  ```
- Logs com campos estruturados, não string concat.

**Frontend:**
- `@logtail/browser` pra logs do client (limitado — preferir RUM dedicado pra Web Vitals).

**Verificar:**
```bash
grep -rn "logtail\|@better\|BetterStack" src package.json > .protocolo/$STAMP/07-betterstack-config.txt
```

## Logs

Estruturação, PII em log e retenção já têm check próprio no núcleo — `LOG-002`, `LOG-003` e `LOG-005` — não repita o critério aqui, ver `checks/logs.md`. Implementação específica de BetterStack:

- Campos: `level`, `timestamp`, `service`, `env`, `version`, `requestId`.
- Retenção configurada por tier do plano — confirmar que atende `LOG-005` (>= 90 dias).

## Uptime monitoring

- Heartbeats nos fluxos críticos (endpoints de health check).
- Status page pública opcional.
- Incidentes integrados com on-call (PagerDuty, Slack, etc.).
- Cada incidente vinculado a runbook.

## Limitações

BetterStack **não cobre tracing distribuído** nem APM profundo. Pra projetos que precisam disso:
- Combinar com OpenTelemetry → exportar pra um backend de tracing (Honeycomb, Grafana Tempo, Jaeger).
- Ou trocar pra Datadog/New Relic se a complexidade justificar.

BetterStack **não é RUM** — pra Core Web Vitals do usuário real, integrar Vercel Analytics, Plausible, ou similar.

## Alertas

- Logs com regex/query pra detectar padrões críticos.
- Alertas com runbook.
- Integração com Slack/Discord/SMS/Phone (Uptime tem incidência on-call).

## Checklist BetterStack no relatório

- [ ] Logger estruturado configurado (Pino recomendado).
- [ ] `LOG-002`, `LOG-003` e `LOG-005` sem achado aberto sem dono.
- [ ] Heartbeats nos endpoints críticos.
- [ ] Status page configurada (se pública for relevante).
- [ ] On-call configurado com rotação.
- [ ] Cada alerta com runbook.
- [ ] Tracing distribuído coberto por outra ferramenta (se necessário).
- [ ] RUM coberto por outra ferramenta.

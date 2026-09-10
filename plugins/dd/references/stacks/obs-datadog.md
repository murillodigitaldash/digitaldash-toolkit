# Perfil de observabilidade — Datadog

Carregue este perfil quando detectar:
- Dependência `@datadog/browser-rum`, `@datadog/browser-logs`, `dd-trace`.
- Variáveis `DD_API_KEY`, `DD_APP_KEY`, `DD_AGENT_HOST`.

Aplica-se à **Etapa 7** do protocolo.

## Setup esperado

Datadog cobre logs + métricas + traces + RUM + Synthetics + alertas em uma plataforma. Validar quais módulos o projeto usa:

**Backend (Node/Edge):**
- `dd-trace` inicializado **antes de qualquer import da app** (`--require dd-trace/init` no Node, ou primeiro import).
- `DD_SERVICE`, `DD_ENV`, `DD_VERSION` configurados.
- Logs injetados com `trace_id` e `span_id` automaticamente (`logInjection: true`).

**Frontend:**
- `@datadog/browser-rum` configurado com `applicationId`, `clientToken`.
- `@datadog/browser-logs` se for capturar logs do front.
- `sessionSampleRate` ajustado (custos!).

**Verificar:**
```bash
grep -rn "datadog\|dd-trace\|DD_" src package.json > .protocolo/$STAMP/07-datadog-config.txt
```

## Logs

Estruturação e correlação por trace id já têm check próprio no núcleo — `LOG-003` e `LOG-004` — não repita o critério aqui, ver `checks/logs.md`. Implementação específica de Datadog:

- Correlação via `dd.trace_id` (`logInjection: true`).
- Atributos padrão: `service`, `env`, `version`.
- Pipelines configurados no Datadog pra parsing e indexação.
- Política de indexação (custos): logs verbose em `archive only`, errors indexados.

## APM (Tracing)

- Auto-instrumentação ativa pros frameworks suportados.
- Custom spans em operações de negócio:
  ```ts
  const tracer = require('dd-trace');
  await tracer.trace('createOrder', async (span) => {
    span.setTag('order.value', amount);
    // ...
  });
  ```
- Service map revisado — todas as integrações aparecem.

## RUM

- Privacy: `defaultPrivacyLevel: 'mask-user-input'` ou mais restritivo.
- `trackUserInteractions: true` pra Core Web Vitals + interações.
- `trackResources: true` se quer detalhe de network.
- Integração com APM (sessionId → trace correlation).

## Métricas customizadas

- Métricas de negócio via `dogstatsd` (signup, conversion, etc.).
- Cardinalidade controlada — tags com valor explosivo (userId, requestId) viram conta cara.
- Sumários (`distribution`, `histogram`) pra latência, não só `count`.

## Synthetics

- Testes sintéticos nos fluxos críticos (alinhado com Etapa 6).
- Monitorados de múltiplas regiões.
- Alertam antes do usuário ver o problema.

## Alertas (Monitors)

- Monitor por SLO — burn rate alerts (Datadog tem feature nativa).
- Cada monitor com runbook em `Notification Message`.
- Sem alertas que sempre disparam (alert fatigue).
- Severidade calibrada — não tudo é P1.

## Custos

Datadog cobra por host, ingestão de logs, e indexação. Auditar:
- Logs indexados vs archived.
- Custom metrics por host.
- Hosts inativos sendo cobrados.
- Retenção alinhada com necessidade (não tudo precisa 30 dias) — piso de `LOG-005`, ver `checks/logs.md#log-005`.

## Checklist Datadog no relatório

- [ ] `dd-trace` inicializado antes de imports da app.
- [ ] `DD_SERVICE`, `DD_ENV`, `DD_VERSION` por ambiente.
- [ ] `LOG-003` e `LOG-004` sem achado aberto sem dono.
- [ ] APM cobrindo todos os serviços do projeto.
- [ ] RUM com privacy level adequado.
- [ ] Métricas de negócio via dogstatsd.
- [ ] Cardinalidade de tags revisada.
- [ ] Synthetics nos fluxos críticos.
- [ ] Monitors com runbook.
- [ ] SLOs configurados com burn rate alerts.
- [ ] Custos auditados e dentro do esperado, `LOG-005` sem achado aberto sem dono.

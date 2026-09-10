# Perfil de observabilidade — OpenTelemetry (vendor-neutral)

Carregue este perfil quando:
- Detectar `@opentelemetry/*` no `package.json`.
- O projeto não tem stack de observabilidade dedicado e quer começar agnóstico.
- O usuário quer portabilidade entre vendors.

Aplica-se à **Etapa 7** do protocolo.

## Por que OpenTelemetry como default

- **Padrão da indústria** (CNCF, adotado por todos os principais vendors).
- **Portabilidade:** instrumenta uma vez, exporta pra Datadog, Honeycomb, Grafana, New Relic, Sentry, etc.
- **Cobre logs, métricas e traces** em um modelo unificado.
- Quando o projeto crescer e precisar trocar vendor, a instrumentação já está pronta.

## Setup esperado

**Node/Edge runtime:**
- Pacotes: `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http` (ou exporter do vendor).
- Inicialização **antes de qualquer import da app**:
  ```ts
  // tracing.ts (carregar via --require ou primeiro import)
  import { NodeSDK } from '@opentelemetry/sdk-node';
  import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME,
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
  ```

**Variáveis padrão OTel:**
- `OTEL_SERVICE_NAME` — nome do serviço.
- `OTEL_RESOURCE_ATTRIBUTES` — `service.version=1.2.3,deployment.environment=production`.
- `OTEL_EXPORTER_OTLP_ENDPOINT` — onde mandar os traces.
- `OTEL_EXPORTER_OTLP_HEADERS` — auth do collector/vendor.

**Frontend:**
- `@opentelemetry/sdk-trace-web` + `@opentelemetry/auto-instrumentations-web`.
- Exporter pra um collector que recebe browser traces.
- Considerar `@opentelemetry/instrumentation-fetch` e `instrumentation-document-load`.

**Verificar:**
```bash
grep -rn "@opentelemetry\|OTEL_" src package.json > .protocolo/$STAMP/07-otel-config.txt
```

## Backend de destino

OTel sozinho não armazena nada — precisa exportar pra um backend. Opções:

- **Self-hosted:** Jaeger (traces), Prometheus + Grafana (métricas), Loki (logs).
- **Gerenciado open:** Grafana Cloud, Honeycomb, Uptrace, SigNoz.
- **Vendor lock-in opcional:** Datadog, New Relic, Sentry, Dynatrace (todos aceitam OTLP).

Decidir e documentar no projeto. O importante: a aplicação fala OTel, o vendor é trocável.

## Traces

- Auto-instrumentação cobre HTTP, fetch, banco (Postgres, MySQL, MongoDB), Redis, etc.
- Custom spans em operações de negócio:
  ```ts
  import { trace } from '@opentelemetry/api';
  const tracer = trace.getTracer('my-app');

  await tracer.startActiveSpan('createOrder', async (span) => {
    span.setAttributes({ 'order.value': amount });
    try {
      // ...
    } finally {
      span.end();
    }
  });
  ```
- Context propagation entre serviços via headers W3C Trace Context.

## Métricas

- Counter, Histogram, Gauge via API OTel.
- Métricas de negócio + métricas de runtime (memória, CPU via auto-instrumentation).

## Logs

OTel Logs ainda está em estabilização (2024-2025). Correlação por trace id já tem check próprio no núcleo — `LOG-004`, ver `checks/logs.md#log-004`. Estratégias:
- Logger nativo (Pino, Winston) com `trace_id` injetado a partir do contexto OTel.
- Logs e traces correlacionados via `trace_id` e `span_id`.

## Sampling

- Em produção, `OTEL_TRACES_SAMPLER=parentbased_traceidratio` com `OTEL_TRACES_SAMPLER_ARG=0.1` (10%).
- Tail-based sampling no collector pra capturar 100% dos erros.

## Collector

- Roda um OpenTelemetry Collector entre a app e o vendor.
- Permite agregar, filtrar, sampling avançado, e trocar de vendor sem mexer na app.
- Self-hosted (container) ou gerenciado pelo vendor.

## Checklist OpenTelemetry no relatório

- [ ] SDK inicializado antes de imports da app.
- [ ] `OTEL_SERVICE_NAME`, version, environment configurados.
- [ ] Auto-instrumentation ativa pra HTTP, DB, etc.
- [ ] Custom spans em fluxos críticos.
- [ ] Sampling configurado (não 100% em produção).
- [ ] Backend de destino documentado (Jaeger, Grafana, Datadog, etc.).
- [ ] Collector configurado (se aplicável).
- [ ] Logs correlacionados a traces via `trace_id`.
- [ ] Context propagation funcionando entre serviços.

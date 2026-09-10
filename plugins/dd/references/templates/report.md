# Relatório de Release — `<projeto>` `<versão>`

**Data:** `<YYYY-MM-DD>`
**Executado por:** `<nome>` (via Protocolo de Sanitização)
**Modo:** `release` / `auto` / `hotfix` / `feature` / `auditoria` / `cirúrgico`
**Commit base:** `<sha base>` → `<sha HEAD>`
**Stack detectado:** `<ex: Next.js 15 App Router + React 19 + TypeScript 5.4 + Supabase + Sentry>`
**Perfis carregados:** `<ex: data-supabase, obs-sentry>`

---

## Decisão final

> **GO** / **GO COM RESSALVAS** / **NO-GO**

**Justificativa em uma linha:** `<...>`

---

## Resumo executivo

| # | Etapa | Status | Findings | Bloqueantes |
|---|---|---|---|---|
| 1 | Higiene e código morto | ✅ / ⚠️ / ❌ / ➖ | N | 0 |
| 2 | Type safety | | | |
| 3 | Separação de responsabilidades | | | |
| 4 | DRY e duplicação | | | |
| 5 | Tratamento de erros | | | |
| 6 | Testes e qualidade de teste | | | |
| 7 | Observabilidade | | | |
| 8 | Camada de dados e migrations | | | |
| 9 | Performance | | | |
| 10 | Acessibilidade | | | |
| 11 | Segurança e supply chain | | | |
| 12 | Gate final | | | |

Legenda: ✅ passou — ⚠️ passou com ressalva — ❌ falhou — ➖ pulada (modo não inclui)

---

## Métricas (baseline para próximo release)

| Métrica | Anterior | Atual | Delta | Alvo |
|---|---|---|---|---|
| Bundle JS (gzip) | | | | |
| LCP p75 mobile | | | | < 2.5s |
| INP p75 | | | | < 200ms |
| CLS p75 | | | | < 0.1 |
| Cobertura de testes | | | | |
| Cobertura de fluxos críticos | | | | 100% |
| Mutation score (domain/) | | | | >= 80% |
| Cobertura de tipos | | | | >= 99% |
| Erros `tsc --noEmit` | | | | 0 |
| `any` explícito em código novo | | | | 0 |
| Lighthouse a11y (telas principais) | | | | >= 95 |
| Findings High/Critical (segurança) | | | | 0 |
| Dependências diretas | | | | |
| Tempo de build | | | | |

### Formato de `metricas.json`

A Etapa 12 grava as métricas de baseline listadas em
`references/etapas/12-gate.md` em formato estruturado, para comparação
automática com o release seguinte — os mesmos dados da tabela acima, sem
`Anterior` / `Delta` preenchidos à mão (isso é derivado comparando o
`metricas.json` de dois stamps).

```json
{
  "stamp": "2026-09-09-1530",
  "eixo": "release",
  "modo": "auto",
  "bundle": {
    "gzip_kb": 0,
    "brotli_kb": 0
  },
  "core_web_vitals": {
    "lcp_p75_ms": 0,
    "inp_p75_ms": 0,
    "cls_p75": 0
  },
  "build_time_s": 0,
  "cobertura_testes": {
    "geral_pct": 0,
    "fluxos_criticos_pct": 0
  },
  "mutation_score_pct": 0,
  "cobertura_tipos_pct": 0,
  "dependencias_diretas": 0,
  "seguranca_findings": {
    "critica": 0,
    "alta": 0,
    "media": 0,
    "baixa": 0
  },
  "acessibilidade_score": 0
}
```

Campos, na mesma ordem em que `references/etapas/12-gate.md` lista as
métricas de baseline:
- `bundle` — tamanho do bundle: `gzip_kb`, `brotli_kb`.
- `core_web_vitals` — `lcp_p75_ms`, `inp_p75_ms`, `cls_p75`, mesmas
  métricas da tabela acima, em p75.
- `build_time_s` — tempo de build, em segundos.
- `cobertura_testes` — `geral_pct` (cobertura de testes) e
  `fluxos_criticos_pct` (cobertura de fluxos críticos).
- `mutation_score_pct` — mutation score em `domain/`.
- `cobertura_tipos_pct` — cobertura de tipos.
- `dependencias_diretas` — número de dependências diretas.
- `seguranca_findings` — findings de segurança por severidade; mesmo
  vocabulário de `severidade` em `achados.json` (ver abaixo).
- `acessibilidade_score` — score de acessibilidade (Lighthouse a11y).

`stamp`, `eixo` e `modo` seguem o mesmo formato descrito para
`achados.json` logo abaixo.

---

## Detalhamento por etapa

### Etapa 1 — Higiene e código morto
- Arquivos órfãos removidos: N
- Exports não usados removidos: N
- Deps órfãs removidas: N
- Anexos: `01-knip.json`, `01-ts-prune.txt`, `01-depcheck.json`, `01-orphans.txt`

### Etapa 2 — Type safety
- `any` explícito removido: N
- `any` implícito eliminado: N
- `@ts-ignore` / `@ts-nocheck` removidos: N
- Type assertions inseguras revisadas: N
- Props sem tipo adicionadas: N
- Schemas Zod criados em fronteiras: N
- Cobertura de tipos: `<x%>` → `<y%>`
- tsconfig: flags habilitadas: `<listar>`
- Anexos: `02-tsc.txt`, `02-type-coverage.txt`, `02-escapes.txt`

### Etapa 3 — Separação de responsabilidades
- Componentes refatorados: N
- Camadas introduzidas/reforçadas: `<listar>`
- Violações de boundaries restantes: N

### Etapa 4 — DRY e duplicação
- Clusters acima do threshold: N → N
- Abstrações criadas: `<listar>`
- Anexos: `04-jscpd/`

### Etapa 5 — Tratamento de erros
- Floating promises eliminadas: N
- Error boundaries adicionados: N
- Rotas críticas com `error.tsx`: N/N
- Cliente HTTP centralizado: ✅/❌

### Etapa 6 — Testes e qualidade de teste
- Fluxos críticos cobertos (e2e): N/N
- Forma da pirâmide: `<unit / integration / e2e proporções>`
- Mutation score em `domain/`: `<x%>`
- Testes `.skip` sem ticket: N
- Testes flaky identificados: N
- Anexos: `06-coverage.json`, `06-e2e.json`, `06-mutation/`, `06-skipped.txt`

### Etapa 7 — Observabilidade
- Perfil carregado: `<sentry / datadog / betterstack / opentelemetry>`
- Logger estruturado (núcleo `LOG-003`): ✅/❌
- `console.*` em produção: N
- Eventos de auth logados (núcleo `LOG-001`): ✅/❌
- Tracing em fluxos críticos: N/N
- Alertas com runbook: N
- SLOs definidos: N
- Anexos: `07-obs-setup.txt`, `07-console-uses.txt`

### Etapa 8 — Camada de dados e migrations
- Perfil carregado: `<supabase / prisma-postgres / drizzle / firebase>`
- Migrations do release: N (avaliação de risco no anexo)
- N+1 zero em endpoints críticos: ✅/❌
- Autorização (RLS / regras / tenancy — núcleo `TEN-001` a `TEN-004`): ✅/❌
- Backup testado nos últimos 30 dias: ✅/❌
- PII mapeada e função LGPD (núcleo `LGPD-001`): ✅/❌
- Anexos: específicos do perfil (`08-rls-audit.txt`, `08-migrate-status.txt`, etc.)

### Etapa 9 — Performance
- Core Web Vitals: ver tabela
- Bundle: anterior vs atual
- Componentes otimizados com evidência: N
- Listas virtualizadas: N
- Anexos: `09-lhci/`, `09-size-limit.json`

### Etapa 10 — Acessibilidade
- Lighthouse a11y por tela: `<dados>`
- Findings axe-core (serious + critical): N
- Teste manual com leitor de tela (fluxos críticos): ✅/❌
- Teste de navegação por teclado: ✅/❌
- Anexos: `10-a11y-e2e.json`

### Etapa 11 — Segurança e supply chain
- Secrets encontrados e remediados: N (incluindo limpeza de histórico)
- Vulnerabilidades: Critical N / High N / Medium N / Low N
- Findings de SAST: N
- OWASP Top 10: ver `owasp-checklist.md` preenchido
- SBOM: anexo `11-sbom.json`
- Anexos: `11-gitleaks.json`, `11-osv.json`, `11-audit.json`, `11-semgrep.json`

### Etapa 12 — Gate final
- CI: ✅/❌
- `tsc --noEmit`: ✅/❌
- Build: ✅/❌
- Cobertura de fluxos críticos: ✅/❌
- Documentação atualizada (README, CHANGELOG, ADRs): ✅/❌
- Plano de rollout: ✅/❌
- Plano de rollback testado: ✅/❌
- Runbook dos top 5 alertas: ✅/❌

---

## Achados por id de check (núcleo)

O Detalhamento por etapa acima organiza achados por etapa. Esta seção
complementa com uma view por id de check do núcleo (`checks/registry.yaml`)
— **é esta seção que o `/dd:status` lê.** Preencher uma linha por achado
que tenha id de check do núcleo; o título vem do `registry.yaml` e o
julgamento completo mora no guia do domínio dentro de `checks/` — não
repetir aqui. Achados sem id de check não entram nesta tabela: eles
continuam só no Detalhamento por etapa e em `achados.json`, indexados pelo
número da etapa (ver "Formato de `achados.json`" abaixo).

| id | título | severidade | bloqueia | arquivo:linha | status |
|---|---|---|---|---|---|
| | | | | | |

`severidade`: `critica` / `alta` / `media` / `baixa`. `bloqueia`: `sim` /
`não`, espelha o campo `bloqueia` do check no registry. `status`: `aberto`
/ `resolvido` / `aceito` (dívida técnica aceita, ver seção abaixo).

### Formato de `achados.json`

A Etapa 12 grava este arquivo em `.protocolo/<stamp>/`, junto com este
`report.md` e `metricas.json` — ver `references/etapas/12-gate.md`.

```json
{
  "stamp": "2026-09-09-1530",
  "eixo": "release",
  "modo": "auto",
  "achados": [
    {
      "check": "SEC-001",
      "etapa": 11,
      "severidade": "critica",
      "bloqueia": true,
      "arquivo": "backend/src/config/db.js",
      "linha": 12,
      "status": "aberto",
      "resumo": "Credencial de conexao em literal"
    },
    {
      "check": null,
      "etapa": 3,
      "severidade": "media",
      "bloqueia": false,
      "arquivo": "src/components/OrderSummary.tsx",
      "linha": null,
      "status": "aberto",
      "resumo": "Componente mistura logica de dominio e apresentacao"
    }
  ]
}
```

Campos:
- `stamp` — mesmo carimbo do diretório `.protocolo/<stamp>/`, formato
  `YYYY-MM-DD-HHmm`.
- `eixo` — `"release"` ou `"postura"`. Sempre presente: é o campo que o
  eixo Postura lê, do `achados.json` mais recente para o mais antigo,
  procurando o primeiro com `"eixo": "postura"`, para calcular a cadência
  trimestral. Ver `skills/postura/SKILL.md`, seção "Cadência".
- `modo` — `release` / `auto` / `hotfix` / `feature` / `auditoria` /
  `cirúrgico`, o mesmo vocabulário do campo `Modo` no cabeçalho deste
  relatório. Sem equivalente no eixo Postura — usar `null` nesse caso.
- `achados` — array de achados, um objeto por achado:
  - `check` — id do check do núcleo (ex.: `SEC-001`), ou `null` quando o
    achado não corresponde a nenhum check do núcleo.
  - `etapa` — número da etapa (1 a 12) de onde o achado veio. Sempre
    presente. Quando `check` é `null`, `etapa` é o índice do achado —
    isso vale para qualquer etapa, não só um subconjunto fixo delas.
  - `severidade` — `critica` / `alta` / `media` / `baixa`, mesmo
    vocabulário do núcleo.
  - `bloqueia` — `true` / `false`; para achados com `check`, espelha o
    campo `bloqueia` do check no registry; para achados sem `check`, é o
    julgamento de quem gerou o achado.
  - `arquivo` / `linha` — localização do achado; `null` quando o achado
    não é de um ponto específico do código (achado de processo, por
    exemplo).
  - `status` — `aberto` / `resolvido` / `aceito`.
  - `resumo` — descrição curta do achado, uma linha.

---

## Dívidas técnicas aceitas (se GO COM RESSALVAS)

| Item | Etapa | Severidade | Ticket | Dono | Prazo |
|---|---|---|---|---|---|
| | | | | | |

---

## Riscos conhecidos para o release

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| | | | |

---

## Plano de rollout

- **Estratégia:** `<canário N% → N% → 100% / blue-green / all-in>`
- **Janela:** `<dia/horário>`
- **Pessoas de plantão:** `<nomes>`
- **Feature flags ativas:** `<listar com critério de remoção>`
- **Monitoramento durante:** `<dashboards/alertas a observar>`
- **Critério de rollback:** `<condições objetivas>`
- **Procedimento de rollback:** `<link para runbook>`

---

## Tendências (apenas modo `auditoria`)

Quando o modo é `auditoria`, comparar com relatórios anteriores em `.protocolo/`:

| Métrica | -3 releases | -2 releases | -1 release | Atual | Tendência |
|---|---|---|---|---|---|
| Bundle | | | | | ↑ / ↓ / → |
| Cobertura crítica | | | | | |
| Findings High | | | | | |
| ... | | | | | |

**Plano de remediação pros próximos 1-3 releases:**
- ...

---

## Anexos

Além deste `report.md`, `achados.json` e `metricas.json` (formatos
descritos acima) ficam em `.protocolo/<stamp>/`. Todos os artefatos brutos
estão em `.protocolo/<stamp>/`.

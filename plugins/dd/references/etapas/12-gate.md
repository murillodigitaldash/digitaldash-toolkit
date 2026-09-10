# Etapa 12 — Gate final e documentação

**Objetivo:** consolidar resultados, validar fundações e tomar decisão go/no-go.

**Consolidação dos agentes auditores:** as etapas 1 a 11 rodam como 5 agentes auditores independentes em paralelo, cada um cobrindo um grupo de etapas (não um por etapa, nem só as etapas 7-11): `dd-auditor-codigo` cobre as etapas 1, 2, 3 e 4; `dd-auditor-resiliencia` cobre as etapas 5, 6 e 7 (domínio `LOG` do núcleo); `dd-auditor-dados` cobre a etapa 8 (domínios `LGPD`, `LGPD-S` e `TEN`); `dd-auditor-produto` cobre as etapas 9 e 10; `dd-auditor-seguranca` cobre a etapa 11 (domínios `SEC`, `DEP` e `AI`). Esta etapa consolida o retorno dos cinco. Cada um dos cinco agentes retorna um objeto JSON com seu nome e sua lista de achados — `{"agente": "<nome>", "achados": [...]}`; esta etapa consolida os cinco extraindo os arrays `achados` e fundindo-os no arquivo `achados.json` descrito em `references/templates/report.md`, ao qual acrescenta os campos de execução (`stamp`, `eixo`, `modo`) que nenhum agente individual pode conhecer. Detecção em paralelo é livre: não importa em que ordem os achados chegam. **Remediação não é livre — o plano final sai ordenado 1 → 12**, nunca na ordem de chegada dos agentes. O motivo é o mesmo que ordena as 12 etapas desde a Etapa 1: extrair uma abstração (Etapa 4) antes de separar as camadas que ela abstrai (Etapa 3) produz abstração ruim; corrigir performance (Etapa 9) antes de resolver o N+1 que a está causando (Etapa 8) desperdiça o trabalho de otimização. A ordem de detecção é livre porque detectar não muda o código; a ordem de remediação não é, porque remediar muda.

**Checklist técnico:**
- **CI verde** — build, lint, typecheck, unit, e2e smoke.
- **Type safety** — gate da Etapa 2 mantido.
- **Cobertura crítica** — gate da Etapa 6 mantido.
- **Observabilidade** — gate da Etapa 7 mantido, eventos chegando.
- **Camada de dados** — gate da Etapa 8 mantido (se aplicável).
- **Performance** — Web Vitals no alvo (Etapa 9).
- **Acessibilidade** — gate da Etapa 10 mantido.
- **Segurança** — gate da Etapa 11 mantido.

**Checklist de release:**

*Documentação:*
- `README.md` com setup local funcional (alguém novo sobe em < 30min).
- `CHANGELOG.md` atualizado.
- ADRs novos commitados pras decisões arquiteturais do release.
- Documentação de API atualizada (OpenAPI/Swagger se aplicável).

*Operação:*
- Plano de rollout (canário/blue-green/percentual).
- Plano de rollback documentado e testado.
- Runbook dos top 5 alertas pós-release.
- Janela de deploy definida.
- Pessoas de plantão definidas.
- Feature flags ativas listadas com critério de remoção.

*Comunicação:*
- Stakeholders notificados do release.
- Changelog público se aplicável (cliente final).
- Status page atualizada se aplicável.

**Comandos:**
```bash
npm run build
npm run lint
npx tsc --noEmit
npm test
npx playwright test --grep @smoke
```

**Métricas pra registrar (baseline pro próximo release):**
- Bundle (gzip + brotli).
- Core Web Vitals.
- Tempo de build.
- Cobertura de testes (e fluxos críticos cobertos).
- Mutation score.
- Cobertura de tipos.
- Número de dependências.
- Findings de segurança por severidade.
- Score de acessibilidade.

**Decisão final:**
- **GO** — todos os gates verdes.
- **GO COM RESSALVAS** — itens não-bloqueantes documentados com ticket aberto e dono.
- **NO-GO** — gates de segurança High/Critical, regressão grave, CI quebrado, ou findings que afetam usuário sem mitigação.

**Arquivos de saída em `.protocolo/<stamp>/`:**
- `report.md` — relatório consolidado, gerado a partir de `references/templates/report.md`, com o plano de remediação ordenado 1 → 12.
- `achados.json` — achados de todas as etapas indexados por id de check do núcleo (`SEC-*`, `DEP-*`, `LOG-*`, `LGPD-*`, `TEN-*`, `AI-*`); achados sem id de check indexados pelo número da etapa.
- `metricas.json` — as métricas de baseline listadas acima, em formato estruturado, para comparação automática com o release seguinte.

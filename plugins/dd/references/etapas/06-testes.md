# Etapa 6 — Testes e qualidade de teste

**Objetivo:** garantir que os testes existem, falham quando devem falhar, e cobrem os fluxos que importam pro produto. Vem antes de observabilidade porque você instrumenta código testado.

**Procurar:**
- Fluxos críticos (auth, checkout, pagamento, fluxos de dados pessoais, isolamento entre tenants) sem cobertura de e2e. Isolamento entre tenants tem check próprio no núcleo, `TEN-006` — não repita o critério aqui, ver `checks/tenant.md`.
- Cobertura genérica alta mascarando fluxos críticos descobertos.
- Pirâmide invertida: muito e2e, pouco unitário (e2e lento e flaky vira gargalo).
- Testes que não falham quando o código quebra (avaliável via mutation testing).
- Mocks excessivos: teste que mocka tudo testa o mock, não o código.
- Testes pulados (`it.skip`, `describe.skip`, `xit`) acumulados sem ticket.
- Snapshots gigantes sem revisão (snapshot tests viram carimbo automático).
- Testes flaky aceitos como normais (retry no CI sem investigação).
- Falta de regression visual em telas críticas (Chromatic, Percy, Playwright snapshots).
- Falta de contract tests entre front e back se há API própria.

**Heurísticas:**
- Pirâmide saudável: ~70% unit / 20% integração / 10% e2e (números aproximados; o que importa é a forma).
- Cobertura por user journey, não por arquivo. Mapear os 5-10 fluxos que mais importam pro produto e cobrir cada um end-to-end.
- Testes unitários de lógica de negócio pura (a Etapa 3 extraiu essa lógica para `domain/` — agora é trivial testar).
- Testes de integração focam em pontos de junção (API → handler → DB).
- E2E só para happy paths críticos e fluxos que envolvem o usuário real.

**Implementar:**
- Mapa de fluxos críticos versionado no repo (`docs/critical-flows.md`).
- Mutation testing pelo menos nos arquivos de domínio (`stryker`).
- Política de teste flaky: detectar (CI marca), investigar (não retry cego), corrigir ou marcar como conhecido.
- Política de `.skip`: tem ticket ou é removido.
- Regression visual nas telas que decidem conversão.

**Ferramentas:** Vitest / Jest (unit), Testing Library (componente), Playwright / Cypress (e2e), Stryker (mutation), Chromatic / Percy (visual), Pact (contract).

**Comandos:**
```bash
npm test -- --coverage --json --outputFile=.protocolo/$STAMP/06-coverage.json
npx playwright test --reporter=json > .protocolo/$STAMP/06-e2e.json
npx stryker run --reporters json --outputDir .protocolo/$STAMP/06-mutation
grep -rn "\.skip\|xit\|xdescribe" src test e2e > .protocolo/$STAMP/06-skipped.txt
```

**Reportar:**
- Mapa de fluxos críticos com status de cobertura por fluxo, incluindo `TEN-006`.
- Forma da pirâmide (gráfico de barras: unit vs integration vs e2e).
- Mutation score por pasta de domínio.
- Lista de testes flaky e plano de remediação.
- Testes `.skip` sem ticket.

**Gate de saída:** todos os fluxos críticos com cobertura ponta a ponta, incluindo `TEN-006`. Mutation score em `domain/` >= 80% (ou threshold do projeto). Zero `.skip` sem ticket. Sem flaky aceito em CI.

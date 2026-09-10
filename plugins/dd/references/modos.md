# Modos de execução

A skill executa em 5 modos. O usuário sempre nomeia o modo. Não existe default implícito — se o usuário disser apenas "roda o protocolo", pergunte qual modo antes de prosseguir.

## Modo `release`

**Invocação:** "modo release", "release completo", "release grande", "protocolo completo".

**Etapas:** todas as 12, em ordem.

**Quando usar:** release grande, multi-feature, com mudanças em infraestrutura, dados, ou áreas críticas (auth, pagamento, dados sensíveis).

**Comportamento:** roda tudo sem perguntar nada além do escopo do release (qual branch comparar). Gera relatório completo.

---

## Modo `auto`

**Invocação:** "modo auto", "auto", "auto sobre essa release".

**Etapas:** detectadas via análise de `git diff`.

**Quando usar:** release de qualquer tamanho onde o usuário quer eficiência sem perder rigor. Default operacional pra maioria dos releases.

**Comportamento:**

1. Pergunte ao usuário qual é a base de comparação (default: `main` ou `master`).
2. Rode `git diff <base>...HEAD --stat` e `git diff <base>...HEAD --name-only`.
3. Classifique os arquivos alterados usando a tabela abaixo.
4. Construa o conjunto de etapas obrigatórias com base na classificação.
5. **Apresente o escopo proposto ao usuário** e espere aprovação antes de executar:
   ```
   Detectei N arquivos alterados. Classificação:
   - X arquivos em src/components → ativa etapas 3, 4, 5, 9, 10
   - Y arquivos em prisma/migrations → ativa etapa 8
   - Z mudanças em package.json → ativa etapa 11
   - W mudanças em tsconfig.json → ativa etapa 2

   Etapas propostas: 1, 2, 3, 4, 5, 8, 9, 10, 11, 12.
   Etapas puladas: 6 (sem mudança em testes), 7 (sem mudança em config de logging).
   Confirma?
   ```
6. Após aprovação, execute as etapas selecionadas em ordem numérica.

**Tabela de classificação:**

| Padrão de arquivo alterado | Etapas ativadas |
|---|---|
| Qualquer arquivo alterado | 1 (higiene) e 12 (gate) — sempre rodam |
| `*.ts`, `*.tsx`, `tsconfig*.json` | 2 (types) |
| `src/**/*.tsx`, `app/**/*.tsx`, `pages/**/*.tsx`, `components/**/*` | 3 (separação), 4 (DRY) |
| Qualquer mudança em handler de erro, boundary, `try/catch`, `error.tsx` | 5 (erros) |
| `**/*.test.*`, `**/*.spec.*`, `e2e/**`, `cypress/**`, `playwright/**`, `vitest.config.*`, `jest.config.*` | 6 (testes) |
| Sentry config, Datadog config, OTel, logger, `*.log.*`, `console.*` adicionado/removido | 7 (observabilidade) |
| `prisma/**`, `drizzle/**`, `supabase/**`, `migrations/**`, `*.sql`, schema | 8 (dados) |
| `next.config.*`, `vite.config.*`, `webpack.config.*`, mudança em `package.json` deps de runtime, imagens, fontes, componentes de UI grandes | 9 (performance) |
| Qualquer mudança em componente de UI ou rota | 10 (acessibilidade) — sempre revisar a11y das telas tocadas |
| `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `.env*`, auth, route handlers, server actions, middleware | 11 (segurança) |

**Heurísticas adicionais:**
- Se o release tem mais de 50 arquivos alterados ou toca mais de 5 áreas, sugira ao usuário considerar modo `release` completo em vez de `auto`.
- Se algum arquivo crítico (auth, pagamento, RLS, env, lockfile) mudou, **etapa 11 não é negociável** — mesmo em `auto`.
- Etapas 1, 2 e 12 são sempre incluídas em `auto` (higiene, types e gate final são piso).

**Modo `auto` é prudente, não esperto.** Se houver ambiguidade, prefira incluir a etapa. Falso negativo (pular etapa que devia rodar) é pior que falso positivo (rodar etapa que não tinha mudança).

---

## Modo `hotfix`

**Invocação:** "modo hotfix", "hotfix", "correção urgente".

**Etapas fixas:** 1, 2, 5, 11, 12.

**Justificativa:**
- 1 — higiene básica.
- 2 — type safety no código alterado.
- 5 — não introduzir nova classe de erro silencioso.
- 11 — segurança nunca é negociável.
- 12 — gate final mínimo (CI, build, smoke test).

**Quando usar:** correção urgente em produção, 1-3 arquivos alterados, escopo cirúrgico.

**Importante:**
- Hotfix **NUNCA** justifica pular Etapa 11. Se a urgência for absoluta e a etapa 11 detectar issue, documente como débito com prazo de 48h e ticket aberto antes do deploy.
- Hotfix grande (> 5 arquivos alterados ou tocando área crítica) não é hotfix — é release. Recomende mudar pra modo `auto` ou `release`.

---

## Modo `feature`

**Invocação:** "modo feature", "feature", "release de feature".

**Etapas fixas:** 1, 2, 3, 5, 6, 11, 12.

**Justificativa:** feature isolada, sem mudança de infra/dados/observabilidade. Cobre código, tipos, arquitetura, erros, testes da feature, segurança e gate.

**Quando usar:** release de uma feature contida que não toca infraestrutura, banco, observabilidade nem áreas críticas além da própria feature.

**Pulos:**
- Etapa 4 (DRY) — assume que o protocolo full roda periodicamente.
- Etapa 7 (observabilidade) — assume que a feature usa instrumentação existente.
- Etapa 8 (dados) — assume sem mudança de schema.
- Etapa 9 (performance) — só roda se a feature for crítica de performance (usuário escolhe adicionar).
- Etapa 10 (acessibilidade) — fortemente recomendado adicionar manualmente; pule só se a feature não tem UI visível.

**Quando NÃO usar `feature`:** se a feature tocar auth, pagamento, dados sensíveis, ou se introduzir nova tela visível ao usuário → use `auto` ou `release`.

---

## Modo `auditoria`

**Invocação:** "modo auditoria", "auditoria geral", "health check".

**Etapas:** todas as 12 + comparação histórica.

**Quando usar:** health check periódico (trimestral, semestral), fora de release. Avalia o estado geral do projeto, identifica degradação acumulada, prioriza débito técnico.

**Comportamento adicional vs `release`:**

1. Após gerar o relatório atual, leia relatórios anteriores em `.protocolo/` (pelo menos os 3 últimos).
2. Compare métricas chave: cobertura, type-coverage, bundle, Web Vitals, findings de segurança, número de deps.
3. **Identifique tendências:** o que melhorou, o que piorou, o que ficou estagnado.
4. Inclua no relatório uma seção "Tendências" com gráfico (textual) e priorização de débito técnico.
5. Sugira um plano de remediação pros próximos 1-3 releases.

**Não bloqueia release.** O resultado é insumo pra planejamento, não go/no-go.

---

## Invocação cirúrgica (sem modo)

Além dos 5 modos, o usuário pode pedir etapas específicas:

- "roda só a etapa 2 do protocolo" → executa apenas Etapa 2.
- "protocolo nas etapas 2, 7 e 11" → executa exatamente essas três, em ordem numérica.
- "roda da etapa 6 até a 10" → executa Etapas 6, 7, 8, 9, 10.

Nesse caso não rode etapas que o usuário não pediu, e o relatório final cobre apenas o escopo executado (com nota explicando que foi invocação cirúrgica).

---

## Decisão entre modos: árvore rápida

```
Mudou só 1-3 arquivos pra corrigir bug crítico?
└─ hotfix

Release grande com mudança em infra, auth, ou dados?
└─ release

Health check periódico, sem release?
└─ auditoria

Feature isolada, sem mudança de infra/dados?
└─ feature  (mas considere auto se tiver dúvida)

Não tem certeza?
└─ auto  (a skill decide e te mostra o escopo)
```

---

## Boas práticas

- **`release` antes de tag de release** sempre. `auto` no dia a dia.
- **`auditoria` a cada trimestre**, agendada, fora de janela de release.
- **`hotfix` é exceção**, não regra. Se virar regra, é sintoma de processo quebrado upstream.
- **`feature` é confortável demais** — quando em dúvida, use `auto`.
- **Versione `.protocolo/`** — o modo `auditoria` depende dele.

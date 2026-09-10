# Etapa 8 — Camada de dados e migrations

**Objetivo:** auditar a camada onde mora o valor do produto. Vem antes de performance porque problema de performance em apps web frequentemente é problema de query.

**Carregue o perfil correspondente** de `references/stacks/`:
- `references/stacks/data-supabase.md` — Supabase / Postgres com RLS.
- `references/stacks/data-prisma-postgres.md` — Prisma com Postgres (ou MySQL).
- `references/stacks/data-drizzle.md` — Drizzle ORM.
- `references/stacks/data-firebase.md` — Firebase / Firestore.
- Para outros (TypeORM, raw SQL, etc.), use o perfil Prisma como base e adapte.

**Procurar (núcleo invariável):**

*Migrations:*
- Versionadas e reversíveis (com `down` ou rollback documentado).
- Testadas em base de tamanho próximo ao de produção.
- Sem `ALTER TABLE` que faz lock longo em tabela grande.
- Migration de dados separada de migration de schema quando possível.
- Plano de rollback documentado e testado.

*Performance de queries:*
- Queries críticas com índice apropriado (analisar `EXPLAIN ANALYZE`).
- N+1 detectado (log de queries em dev ou ORM analyzer).
- LIMIT em queries que poderiam retornar muito.
- Paginação por cursor em listas grandes, não OFFSET.
- Connection pooling configurado (especialmente em serverless).

*Segurança de dados:* autorização no nível de dado tem check próprio no núcleo — RLS no Postgres/Supabase é `TEN-004`; em Firebase (regras) e ORM (checagem explícita), projetos sem RLS como recurso têm a garantia recaindo sobre `TEN-001`/`TEN-002` — não repita o critério aqui, ver `checks/tenant.md`. Além disso:
- Queries parametrizadas (sem string interpolation em SQL).
- Sem dado sensível em logs.
- Backup recente verificado — restaurado em ambiente de teste, não só configurado.

*Integridade:*
- Constraints no banco (foreign keys, unique, not null, check).
- Transações nos lugares certos (write multi-tabela, fluxo de pagamento).
- Idempotência em operações replicáveis.

*LGPD e retenção:* PII mapeada, política de retenção e mecanismo de exclusão do titular têm check próprio no núcleo — `LGPD-001`, `LGPD-002` e `LGPD-003` — não repita o critério aqui, ver `checks/lgpd.md`. Além disso:
- Logs sem PII bruta (mascarar email, CPF, telefone).

**Comandos genéricos (perfil-específico tem detalhes):**
```bash
# Detectar queries lentas no log da app:
grep -rn "query took\|slow query" .protocolo/$STAMP/07-*.txt > .protocolo/$STAMP/08-slow.txt 2>/dev/null

# Migrations não revertidas em ambiente:
ls migrations/ supabase/migrations/ prisma/migrations/ 2>/dev/null
```

**Reportar:**
- Lista de migrations do release com avaliação de risco (lock, dado, reversibilidade).
- Queries críticas com plano de execução.
- N+1 detectados.
- Status de `TEN-004` (RLS) nas tabelas com dado de tenant no Postgres/Supabase; status de `TEN-001`/`TEN-002` (filtro de tenant na aplicação) quando a stack for Firebase ou ORM.
- Status de backup (data do último teste de restore).
- Status de `LGPD-001` (mapa de PII), `LGPD-002` (política de retenção) e `LGPD-003` (mecanismo de exclusão do titular).

**Gate de saída:** todas as migrations reversíveis ou com plano de recovery. Zero N+1 em endpoints críticos. `TEN-004` sem achado aberto sem dono nas tabelas com dado de tenant no Postgres/Supabase (`TEN-001`/`TEN-002` sem achado aberto sem dono quando a stack for Firebase ou ORM). RLS/regras de autorização em todas as tabelas com PII. Backup testado nos últimos 30 dias. Conexão com pool configurado.

**Se o projeto não tem camada de dados própria (totalmente serverless sem DB):** pule a etapa registrando "N/A" no relatório.

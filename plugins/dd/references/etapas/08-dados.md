# Etapa 8 — Camada de dados e migrations

**Objetivo:** auditar a camada onde mora o valor do produto. Vem antes de performance porque problema de performance em apps web frequentemente é problema de query.

**Carregue o perfil correspondente** de `references/stacks/`:
- `data-supabase.md` — Supabase / Postgres com RLS.
- `data-prisma-postgres.md` — Prisma com Postgres (ou MySQL).
- `data-drizzle.md` — Drizzle ORM.
- `data-firebase.md` — Firebase / Firestore.
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

*Segurança de dados:* autorização no nível de dado (RLS no Postgres/Supabase, regras no Firebase, checagem explícita em ORM) tem check próprio no núcleo, `TEN-004` — não repita o critério aqui, ver `checks/tenant.md`. Além disso:
- Queries parametrizadas (sem string interpolation em SQL).
- Sem dado sensível em logs.
- Backup recente verificado — restaurado em ambiente de teste, não só configurado.

*Integridade:*
- Constraints no banco (foreign keys, unique, not null, check).
- Transações nos lugares certos (write multi-tabela, fluxo de pagamento).
- Idempotência em operações replicáveis.

*LGPD e retenção:* PII mapeada e uso de dado real de produção em ambiente não produtivo têm check próprio no núcleo, `LGPD-001` e `LGPD-005` — não repita o critério aqui, ver `checks/lgpd.md`. Além disso:
- Política de retenção implementada (não só documentada — via TTL/job/trigger).
- Mecanismo de exclusão de dados do usuário (LGPD exige).
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
- Status de `TEN-004` (RLS/regras de autorização) nas tabelas com dado de tenant.
- Status de backup (data do último teste de restore).
- Status de `LGPD-001` (mapa de PII) e `LGPD-005` (dado real em ambiente não produtivo), com política de retenção documentada.

**Gate de saída:** todas as migrations reversíveis ou com plano de recovery. Zero N+1 em endpoints críticos. `TEN-004` sem achado aberto sem dono nas tabelas com dado de tenant. Backup testado nos últimos 30 dias. Conexão com pool configurado.

**Se o projeto não tem camada de dados própria (totalmente serverless sem DB):** pule a etapa registrando "N/A" no relatório.

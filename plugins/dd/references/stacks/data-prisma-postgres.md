# Perfil de stack — Prisma + Postgres/MySQL

Carregue este perfil quando detectar:
- `prisma/schema.prisma` no projeto.
- Dependência `@prisma/client`.

Aplica-se à **Etapa 8** do protocolo.

## Migrations

- Migrations geradas via `prisma migrate dev` ficam em `prisma/migrations/<timestamp>_<name>/migration.sql`.
- **Versionadas no git.**
- **`prisma migrate deploy` em produção** — nunca `prisma migrate dev` ou `db push` em prod.
- **Reversibilidade:** Prisma não gera `down` automático. Para destrutivas, criar migration de compensação (não editar a migration aplicada).
- **Avaliar lock:** `ALTER TABLE` que reescreve, criação de index sem `CONCURRENTLY`, etc.

**Comandos:**
```bash
# Status:
npx prisma migrate status > .protocolo/$STAMP/08-migrate-status.txt

# Diff entre schema e DB:
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma > .protocolo/$STAMP/08-schema-diff.txt

# Listar migrations:
ls -la prisma/migrations/ > .protocolo/$STAMP/08-migrations.txt
```

**Cuidados específicos:**
- **Index sem `CONCURRENTLY` em Postgres** bloqueia escrita. Para tabela grande, criar manualmente com `CREATE INDEX CONCURRENTLY` em migration `--create-only`.
- **Drop column** em produção: fazer em 3 deploys (parar de escrever → parar de ler → drop), nunca de uma vez.
- **Rename column** idem (não há `RENAME` seguro com app rodando).

## Schema design

- **`@id` apropriado** — UUID v7 ou cuid2 pra novos modelos (ordenável, não-sequencial, não-enumerável).
- **`@unique` e `@index` declarados** explicitamente.
- **`onDelete` e `onUpdate` em relações** — não deixar default sem pensar.
- **Tipos apropriados:** `Decimal` pra dinheiro (não `Float`), `DateTime` com timezone.
- **`@map` e `@@map`** se quer nomes diferentes no DB vs no client.

## Performance de queries

**N+1 com Prisma é o problema mais comum.** Padrão errado:
```ts
const users = await prisma.user.findMany();
for (const u of users) {
  u.posts = await prisma.post.findMany({ where: { userId: u.id } });
} // N+1!
```

Correto: usar `include`:
```ts
const users = await prisma.user.findMany({
  include: { posts: true }
});
```

**Outras armadilhas:**
- `findMany()` sem `take` ou `where` (full table scan).
- `select` ausente — Prisma retorna tudo, inflando payload.
- Loops com `await` em mutações (usar `prisma.$transaction([])` com array).
- `orderBy` em coluna sem índice em tabela grande.

**Ferramentas:**
- Habilitar log de queries em dev: `new PrismaClient({ log: ['query'] })`.
- `EXPLAIN ANALYZE` via `prisma.$queryRaw`:
  ```ts
  await prisma.$queryRaw`EXPLAIN ANALYZE SELECT ...`;
  ```
- Prisma Optimize (recommendation engine, beta) ou pganalyze externo.

## Connection pooling

- **Serverless:** sem pool nativo, conexão por invocação. Usar **Prisma Accelerate** ou **PgBouncer/Supavisor** em modo transaction.
- **Server tradicional:** `connection_limit` no DATABASE_URL ajustado à concorrência esperada.
- **Edge runtime:** Prisma Edge Client + Accelerate (driver nativo não funciona em edge).

## Autorização

Prisma **não tem RLS nativo**. Autorização vive na camada de aplicação — filtro de tenant ausente ou derivado de parâmetro da requisição já tem check e julgamento próprios no núcleo, `TEN-001` e `TEN-002` (e `TEN-004` se optar por habilitar RLS no Postgres por baixo do Prisma) — não repita o critério aqui, ver `checks/tenant.md`. Implementação específica de Prisma:
- **Padrão recomendado:** middleware do Prisma ou wrapper que injeta filtro de tenancy automaticamente.
- Considerar **`@casl/prisma`** ou similar pra centralizar regras.
- Se o DB é Postgres, pode-se habilitar RLS no banco mesmo usando Prisma — ver perfil Supabase para referência.

**Auditar:**
- Buscar queries sem filtro de tenancy:
  ```bash
  grep -rn "prisma\.\(user\|order\|payment\)\.findMany\|findFirst\|findUnique" src \
    | grep -v "where.*userId\|where.*tenantId\|where.*organizationId" \
    > .protocolo/$STAMP/08-queries-no-tenant.txt
  ```
  Falsos positivos possíveis, mas vale revisar manualmente.

## Backups

- **Postgres gerenciado** (RDS, Neon, Render, Railway) faz backup. Validar política e janela.
- **Testar restore** em ambiente staging — não confiar só na configuração.
- Para self-hosted: `pg_dump` em cron com armazenamento off-site (S3, B2).

## LGPD e PII

Mapeamento de PII, política de retenção e mecanismo de exclusão do titular já têm check e julgamento próprios no núcleo — `LGPD-001` a `LGPD-003` — não repita o critério aqui, ver `checks/lgpd.md`. Implementação específica de Prisma:

- **Mapeamento (`LGPD-001`):** comentar `/// PII` nas colunas do `schema.prisma`.
- **Retenção (`LGPD-002`):** job de retenção (`prisma.user.deleteMany({ where: { deletedAt: { lt: cutoff } } })`).
- **Exclusão do titular (`LGPD-003`):** função de exclusão deletando em cascata respeitando integridade.
- `prisma.$queryRaw` com input não-sanitizado é injection — usar `Prisma.sql` template tag.

## Checklist Prisma no relatório

- [ ] Migrations do release listadas e avaliadas (lock, reversibilidade).
- [ ] `prisma migrate deploy` no pipeline (não `dev` ou `push`).
- [ ] Sem N+1 em endpoints críticos (validado com log de query).
- [ ] `select` usado pra reduzir payload onde aplicável.
- [ ] Connection pool configurado adequado ao runtime.
- [ ] `TEN-001`/`TEN-002` sem achado aberto sem dono (filtro de tenancy em todas as queries, ou `TEN-004` se RLS habilitado no DB).
- [ ] `$queryRaw` sempre com `Prisma.sql` template tag (sem string concat).
- [ ] Backup testado nos últimos 30 dias.
- [ ] `LGPD-001` a `LGPD-003` sem achado aberto sem dono.

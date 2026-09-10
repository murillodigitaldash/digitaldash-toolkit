# Perfil de stack — Drizzle ORM

Carregue este perfil quando detectar:
- `drizzle.config.ts` ou `drizzle.config.js`.
- Dependência `drizzle-orm`.

Aplica-se à **Etapa 8** do protocolo.

## Migrations

- Geradas via `drizzle-kit generate` em `drizzle/` ou pasta configurada.
- **Versionadas no git.**
- `drizzle-kit migrate` em produção (ou `migrate()` programático).
- **Reversibilidade:** Drizzle gera só `up`. Para destrutivas, criar migration de compensação.

**Comandos:**
```bash
ls -la drizzle/ 2>/dev/null > .protocolo/$STAMP/08-migrations.txt
npx drizzle-kit check  # detecta inconsistências
```

**Cuidados:**
- Mesmo padrão do Prisma: lock em `ALTER TABLE`, drop/rename em 3 deploys.
- `CREATE INDEX CONCURRENTLY` no Postgres pra tabela grande.

## Schema design

- Tipos apropriados: `decimal` pra dinheiro, `timestamp` com timezone.
- `primaryKey`, `unique`, `index` declarados.
- Relations explícitas com `relations()`.
- Enums tipados (`pgEnum`, `mysqlEnum`).

## Performance

**Vantagens:** Drizzle gera SQL próximo do que você escreve — menos surpresas que ORMs com mais mágica.

**N+1:** Drizzle não esconde — você escreve o join. Risco menor mas existe quando se faz query relacional em loop.

```ts
// Errado:
const users = await db.select().from(usersTable);
for (const u of users) {
  u.posts = await db.select().from(postsTable).where(eq(postsTable.userId, u.id));
}

// Certo:
const result = await db
  .select()
  .from(usersTable)
  .leftJoin(postsTable, eq(usersTable.id, postsTable.userId));
```

**Outras:**
- `db.select()` sem colunas explícitas retorna tudo — preferir `select({ ... })`.
- `limit()` sempre em listas.
- Prepared statements (`prepare()`) em queries hot path.

## Connection pooling

- Igual ao Prisma: serverless usa pool externo (Supavisor, Accelerate equivalente, ou client driver compatível tipo `postgres-js` em modo transaction).
- HTTP drivers (`@neondatabase/serverless`, `@vercel/postgres`) eliminam o problema em edge.

## Autorização

Drizzle não tem RLS nativo (igual Prisma). Filtro de tenant ausente ou derivado de parâmetro da requisição já tem check e julgamento próprios no núcleo — `TEN-001`, `TEN-002` (ou `TEN-004` se optar por RLS no banco) — não repita o critério aqui, ver `checks/tenant.md`. Padrão: filtro de tenancy explícito em toda query, ou RLS no banco.

## Backups e LGPD

Mapeamento de PII, retenção e exclusão do titular já têm check próprio no núcleo — `LGPD-001` a `LGPD-003`, ver `checks/lgpd.md`. Implementação igual ao perfil Prisma — depende do provider do Postgres/MySQL. Auditar política de backup e testar restore.

## Checklist Drizzle no relatório

- [ ] Migrations listadas e avaliadas.
- [ ] `drizzle-kit check` sem inconsistências.
- [ ] N+1 zero em endpoints críticos.
- [ ] `select` com colunas explícitas onde possível.
- [ ] Prepared statements em queries hot path.
- [ ] Pool adequado ao runtime.
- [ ] `TEN-001`/`TEN-002` sem achado aberto sem dono (ou `TEN-004` se RLS no banco).
- [ ] Backup testado nos últimos 30 dias.
- [ ] `LGPD-001` a `LGPD-003` sem achado aberto sem dono.

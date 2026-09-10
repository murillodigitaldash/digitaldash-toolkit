# Perfil de stack — Supabase / Postgres com RLS

Carregue este perfil quando detectar:
- Pasta `supabase/` no projeto.
- Dependência `@supabase/supabase-js` ou `@supabase/ssr`.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` em env vars.

Aplica-se à **Etapa 8** do protocolo.

## Migrations

- Migrations geradas via Supabase CLI ficam em `supabase/migrations/<timestamp>_<name>.sql`.
- **Versionadas no git** — nunca rodar mudança de schema só pelo Studio em produção.
- **Reversibilidade:** Supabase não gera `down` automático. Para migrations destrutivas (DROP, ALTER que perde dado), documentar rollback no commit ou criar migration de compensação.
- **Pre-deploy:** `supabase db diff` localmente pra confirmar que a migration está completa.
- **Lock em produção:** evitar `ALTER TABLE` que reescreve tabela grande. Usar `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` com cuidado (Postgres 11+ é não-bloqueante em maioria dos casos, mas validar).

**Comandos:**
```bash
# Listar migrations:
ls -la supabase/migrations/ > .protocolo/$STAMP/08-migrations.txt

# Diff entre local e remoto:
supabase db diff --linked > .protocolo/$STAMP/08-db-diff.txt

# Validar schema:
supabase db lint
```

## Row Level Security (RLS)

**Esta é a parte mais crítica.** No Supabase, autorização vive no banco via RLS. Erro aqui é vazamento direto de dados. A ausência de política por linha em tabela com dado de tenant já tem check e julgamento próprios no núcleo — `TEN-004` — não repita o critério aqui, ver `checks/tenant.md#ten-004`. O que segue é a implementação específica de RLS no Supabase para satisfazer esse check.

**Verificar:**
- **Habilitar RLS na tabela** — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- **Policy de SELECT específica** — sem `USING (true)` em tabelas com dado de usuário.
- **Policy de INSERT/UPDATE/DELETE explícita** — sem fallback permissivo.
- **`auth.uid()` usado corretamente** nas policies.
- **Service role nunca exposto no client.** Apenas em Edge Functions ou backend privado.
- **Anon key tem restrições adequadas** — frontends usam só anon, autenticação adiciona o JWT do usuário.

**Comando para auditar RLS:**
```sql
-- Tabelas SEM RLS habilitado:
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE c.relrowsecurity = true
);

-- Policies por tabela:
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Rode via `psql` ou Studio e salve em `.protocolo/$STAMP/08-rls-audit.sql.out`.

**Gate específico Supabase** (além de `TEN-004` sem achado aberto):
- Zero policies com `USING (true)` em tabelas sensíveis.
- Service role key não aparece em código de frontend.

## Performance de queries

- **Index Advisor:** Supabase oferece análise de índices no painel. Validar antes do release.
- **`EXPLAIN ANALYZE` em queries críticas:**
  ```sql
  EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;
  ```
- **N+1:** Supabase client com `.select('*, related(*)')` é uma query só (join). Loops de `await supabase.from(...).select()` são N+1 — refatorar.
- **PostgREST limites:** `range()` ou `limit()` em listas, paginação por cursor (`gt`/`lt` em coluna indexada).

## Connection pooling

- Para serverless (Vercel, Netlify functions, Edge Functions): usar **connection pooler do Supabase** (transaction mode na porta 6543).
- Conexão direta (porta 5432) só para migrations e long-lived processes.
- `?pgbouncer=true&connection_limit=1` no DATABASE_URL em serverless.

## Backups

- Supabase faz backup automático em PITR (Point-in-Time Recovery) em planos pagos.
- **Testar restore em projeto staging** — não confiar só na configuração.
- Para projetos free: backup manual via `pg_dump` em schedule.
- Documentar RTO (Recovery Time Objective) e RPO (Recovery Point Objective).

**Comandos:**
```bash
# Backup manual:
pg_dump "$SUPABASE_DB_URL" -Fc -f backup-$(date +%Y%m%d).dump

# Restore em staging:
pg_restore -d "$STAGING_DB_URL" --clean --if-exists backup-*.dump
```

## Edge Functions (se usadas)

- Validar input com Zod (alinhado com Etapa 2).
- Service role usado apenas server-side.
- CORS configurado por origem específica.
- Rate limiting via `Deno.serve` middleware ou Cloudflare na frente.
- Logs estruturados (alinhado com Etapa 7).

## LGPD e PII

Mapeamento de PII, política de retenção e mecanismo de exclusão do titular já têm check e julgamento próprios no núcleo — `LGPD-001` a `LGPD-003` — não repita o critério aqui, ver `checks/lgpd.md`. Implementação específica de Supabase para satisfazer esses checks:

- **Mapeamento (`LGPD-001`):** listar todas as tabelas com PII (email, nome, telefone, CPF, endereço, etc.).
- **Retenção (`LGPD-002`):** coluna `deleted_at` para soft delete ou job de purge baseado em política de retenção.
- **Exclusão do titular (`LGPD-003`):** função RPC `delete_user_data(user_id)` que apaga em cascata respeitando integridade referencial.
- **Auditoria de acesso a dados sensíveis:** habilitar `pgaudit` ou logs nas operações sensíveis.

## Checklist Supabase no relatório

- [ ] Migrations do release listadas e avaliadas (risco, reversibilidade, lock).
- [ ] `TEN-004` sem achado aberto sem dono nas tabelas com PII.
- [ ] Policies revisadas — nenhuma com `USING (true)` em dado sensível.
- [ ] Service role key não aparece em código de frontend.
- [ ] Index Advisor consultado, índices criados onde necessário.
- [ ] N+1 zero em endpoints críticos.
- [ ] Connection pooler configurado em serverless.
- [ ] Backup testado nos últimos 30 dias (restore em staging).
- [ ] `LGPD-001` a `LGPD-003` sem achado aberto sem dono.

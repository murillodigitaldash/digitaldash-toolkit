# Perfil de stack — Firebase / Firestore

Carregue este perfil quando detectar:
- `firebase.json` ou `.firebaserc`.
- Dependência `firebase` ou `firebase-admin`.

Aplica-se à **Etapa 8** do protocolo.

## Schema e migrations

Firestore é NoSQL — não tem schema rígido, mas isso não significa "sem schema". Você ainda precisa de:

- **Tipos no client** (a Etapa 2 endereça): `z.object({...})` por collection, `z.infer` pro tipo TS.
- **Migrations de dados** quando muda formato de documento: scripts versionados em `migrations/` que rodam via Admin SDK.
- **Validação dupla:** schema no client (Zod) + regras no Firestore.

**Comandos:**
```bash
# Listar regras:
cat firestore.rules > .protocolo/$STAMP/08-firestore-rules.txt

# Listar índices:
cat firestore.indexes.json > .protocolo/$STAMP/08-firestore-indexes.json
```

## Security Rules

**Esta é a parte mais crítica do Firebase.** As regras são sua autorização. Filtro de tenant/ownership ausente ou mal derivado já tem check e julgamento próprios no núcleo — `TEN-001` e `TEN-002` — não repita o critério aqui, ver `checks/tenant.md`. O que segue é a implementação específica de Security Rules para satisfazer esses checks.

**Verificar:**
- Sem `allow read, write: if true;` em produção.
- `request.auth != null` em toda regra que precisa de autenticação.
- Ownership validado: `resource.data.userId == request.auth.uid` (ou equivalente) — a forma Firestore de `TEN-001`/`TEN-002`.
- Validação de payload: `request.resource.data` checado por tipo e tamanho.
- Sem regras com `match /{document=**}` permissivas.

**Testar regras:**
- Firebase oferece emulador com testes unitários de regras (`@firebase/rules-unit-testing`).
- Todo release que mexer em regras precisa de teste novo cobrindo o caso.

**Comandos:**
```bash
# Rodar testes de regras:
firebase emulators:exec --only firestore "npm test -- rules"
```

## Performance e queries

**Limites do Firestore que importam:**
- Sem JOIN — denormalização explícita ou múltiplas queries.
- Query precisa de índice composto pra qualquer `where` + `orderBy` combinado.
- Limite de 1MB por documento.
- Limite de 1 escrita por documento por segundo (em queue de alta concorrência).
- Cobrança por leitura — listas grandes ficam caras.

**Otimizações:**
- Paginação por cursor (`startAfter`), nunca offset.
- `limit()` sempre.
- Subcollections em vez de arrays grandes dentro do doc.
- Cache de leituras frequentes via Realtime listeners ou cliente com persistência.
- Composite indexes declarados em `firestore.indexes.json` (não confiar em criação automática).

**Auditar:**
- Queries sem `limit`:
  ```bash
  grep -rn "\.get()\|\.onSnapshot(" src \
    | grep -v "\.limit(" \
    > .protocolo/$STAMP/08-queries-no-limit.txt
  ```
- Custo estimado: Firebase Console → Usage → estimar leituras/escritas por release.

## Cloud Functions (se usadas)

- Validação de input com Zod.
- Logs estruturados via `logger.info({ ... })`.
- `onCall` em vez de `onRequest` quando possível (auth automática).
- Idempotência: Functions podem rodar mais de uma vez por evento.
- Cold start: minimizar deps, considerar `setGlobalOptions({ minInstances: 1 })` em hot paths.

## Backups

- Firestore tem export gerenciado: `gcloud firestore export gs://bucket/path`.
- **Agendar export periódico** (Cloud Scheduler + Cloud Function).
- Testar import em projeto staging.
- PITR (Point-in-Time Recovery) disponível em plano pago — habilitar.

## LGPD e PII

Mapeamento de PII e mecanismo de exclusão do titular já têm check próprio no núcleo — `LGPD-001` e `LGPD-003`, ver `checks/lgpd.md`. Implementação específica de Firebase:

- **Mapeamento (`LGPD-001`):** documentos com PII identificados (ex: `users/{uid}` com `email`, `phone`).
- **Exclusão do titular (`LGPD-003`):** deletar usuário deleta também subcollections (cascata manual — Firestore não tem cascata nativa). Considerar extensão "Delete User Data".
- Sem PII em logs do Functions sem mascaramento.

## Auth

- Email enumeration: configurar pra não revelar se email existe ou não.
- MFA disponível.
- Verificação de email obrigatória pra fluxos sensíveis.
- Custom claims pra roles, não documento separado (mais rápido em regras).

## Checklist Firebase no relatório

- [ ] `firestore.rules` revisado e testado.
- [ ] Sem regras permissivas em produção.
- [ ] Testes de regras cobrindo casos novos do release.
- [ ] Índices compostos declarados em `firestore.indexes.json`.
- [ ] Queries com `limit` em listas.
- [ ] Custo estimado do release (leituras/escritas projetadas).
- [ ] Cloud Functions com validação de input e logs estruturados.
- [ ] Export periódico configurado e testado.
- [ ] `LGPD-001` e `LGPD-003` sem achado aberto sem dono.
- [ ] Auth com MFA disponível e email enumeration mitigado.

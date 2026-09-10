# Template de tarefa de refatoração

Use este formato sempre que o protocolo gerar uma tarefa a partir de um achado. Cada tarefa precisa ser **atômica** (uma coisa), **reversível** (dá pra reverter sem efeito colateral) e **testável** (existe um critério de aceite objetivo).

## Formato

```markdown
### [ETAPA-NN] Título curto e imperativo

**Contexto:** O que foi encontrado e onde (arquivo, linha, padrão).
**Por quê:** Qual o impacto (bug latente, performance, segurança, manutenibilidade, acessibilidade).
**Como:** Passos concretos. Se houver alternativas, listar e marcar a recomendada.
**Critério de aceite:** Condição objetiva e verificável.
**Risco:** Baixo / Médio / Alto + mitigação se aplicável.
**Estimativa:** XS (< 30min) / S (< 2h) / M (< 1 dia) / L (> 1 dia).

#### Subtarefas
- [ ] ...
- [ ] ...
- [ ] Testes ajustados/criados.
- [ ] Documentação atualizada se houver mudança de contrato público.
```

## Exemplos por etapa

### [01-03] Remover componente `LegacyBanner` não renderizado

**Contexto:** `src/components/marketing/LegacyBanner.tsx` é exportado mas nenhum import existe no projeto (confirmado por `knip` e `ts-prune`).
**Por quê:** 184 linhas mortas, traz 3 deps de imagem que ninguém mais usa.
**Como:** Deletar arquivo e remover deps órfãs.
**Critério de aceite:** Build verde, `knip` sem warnings nessa pasta, bundle reduzido.
**Risco:** Baixo.
**Estimativa:** XS.

### [02-05] Substituir `any` em `apiClient.ts` por tipos derivados de Zod

**Contexto:** `src/lib/apiClient.ts` tem 8 ocorrências de `any` em handlers de resposta.
**Por quê:** `any` aqui esconde bugs de contrato e mascara findings das etapas 5 (erros) e 11 (validação).
**Como:** Schemas Zod por endpoint em `src/lib/api/schemas/`. Cliente chama `schema.parse`. Tipos via `z.infer`.
**Critério de aceite:** Zero `any` em `apiClient.ts`. `type-coverage` 100% no arquivo.
**Risco:** Médio — parse pode falhar em payloads existentes inconsistentes. Mitigar com `safeParse` + log por 1 semana antes de `parse` duro.
**Estimativa:** M.

### [06-02] Cobrir fluxo de checkout end-to-end

**Contexto:** Fluxo de checkout (entrar → escolher pagamento → confirmar) sem teste e2e. Coverage genérica em 78%, mas o caminho crítico não tem proteção.
**Por quê:** Quebra silenciosa em checkout = perda de receita imediata.
**Como:** Criar `e2e/checkout.spec.ts` em Playwright com 3 cenários (cartão sucesso, cartão recusado, pix). Rodar em CI no pre-merge da `main`.
**Critério de aceite:** 3 cenários passando estáveis (não flaky em 10 runs consecutivos). Documentado em `docs/critical-flows.md`.
**Risco:** Baixo.
**Estimativa:** M.

### [07-01] Estruturar logs no backend de pedidos

**Contexto:** `services/order/*.ts` usa `console.log` em produção. Sem correlação a request, sem JSON, sem campos consistentes.
**Por quê:** Debug em produção é impossível sem estrutura. Etapa 11 também precisa de eventos críticos logados (`order.created`, `payment.failed`).
**Como:** Substituir por `logger` central (Pino). Middleware injeta `requestId` no contexto. Eventos críticos via `logger.info({ event: 'order.created', orderId, userId })`.
**Critério de aceite:** Zero `console.log` em `services/`. Logs aparecem no sink configurado. Eventos críticos visíveis no dashboard.
**Risco:** Baixo.
**Estimativa:** S.

### [08-03] Adicionar índice composto para listagem de pedidos

**Contexto:** Query `getOrdersByUser(userId, status, orderBy: createdAt DESC)` faz seq scan em 2M rows. `EXPLAIN ANALYZE` mostra 4.2s p95.
**Por quê:** Endpoint do dashboard do usuário lento, afeta retenção.
**Como:** `CREATE INDEX CONCURRENTLY idx_orders_user_status_created ON orders(user_id, status, created_at DESC);`. Migration `--create-only` pra controlar `CONCURRENTLY`.
**Critério de aceite:** Mesma query < 100ms p95 em produção. Sem lock visível durante criação.
**Risco:** Baixo (CONCURRENTLY não bloqueia escrita).
**Estimativa:** S.

### [09-04] Virtualizar lista de notificações

**Contexto:** `<NotificationList>` renderiza até 800 itens. INP medido em 410ms ao abrir o painel.
**Por quê:** INP > 200ms quebra Core Web Vital. Painel travado afeta percepção de qualidade.
**Como:** `@tanstack/react-virtual` com altura fixa. Mantém scroll position.
**Critério de aceite:** INP < 100ms ao abrir o painel (medido via DevTools). Lista funciona com 5000 itens em teste.
**Risco:** Médio — virtualização pode quebrar busca por `Ctrl+F`. Documentar.
**Estimativa:** M.

### [10-02] Corrigir contraste no botão secundário

**Contexto:** Botão secundário (`bg-gray-200`, `text-gray-500`) tem contraste 3.1:1 — falha WCAG AA (mínimo 4.5:1).
**Por quê:** Usuários com baixa visão não conseguem ler. Falha em a11y audit.
**Como:** Trocar para `text-gray-700` (contraste 7.5:1). Validar em design system.
**Critério de aceite:** Lighthouse a11y sem o warning. Axe-core sem finding.
**Risco:** Baixo.
**Estimativa:** XS.

### [11-04] Adicionar rate limiting em endpoint de login

**Contexto:** `POST /api/auth/login` sem rate limit. Detectado em audit OWASP A07.
**Por quê:** Vulnerável a credential stuffing e brute force.
**Como:** Middleware com `@upstash/ratelimit` + Redis. 5 tentativas / 15min por IP + email. Lockout progressivo.
**Critério de aceite:** Endpoint rejeita 6ª tentativa com 429. Métricas de rate limit no Datadog.
**Risco:** Médio — usuário legítimo pode ser bloqueado em rede compartilhada. Mitigar com captcha após 3 tentativas em vez de hard lock.
**Estimativa:** M.

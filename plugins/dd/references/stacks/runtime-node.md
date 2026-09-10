# Perfil de stack — Node.js / Express (backend)

Carregue este perfil quando detectar:
- Dependência `express` no backend.
- Um processo Node de longa duração servindo HTTP (não uma function serverless isolada por requisição, que tem seu próprio ciclo de vida gerenciado pela plataforma).

Aplica-se sobretudo à **Etapa 11** (segurança) e complementa a **Etapa 5** (que cobre o lado front-end de tratamento de erro) e a **Etapa 9** (performance) para o processo de backend. Este é um perfil de runtime, não de dados — para autorização e schema de dado, ver o perfil correspondente em `references/stacks/` (`data-supabase.md`, `data-prisma-postgres.md`, `data-drizzle.md` ou `data-firebase.md`); para o gate de tipos num backend sem TypeScript, ver `references/stacks/runtime-js.md`.

## Security headers (`helmet`)

Um processo Express sem `helmet` sai de fábrica sem os headers de resposta que o checklist de segurança já cobre item a item — CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`. Não repita esse critério aqui: ver `references/owasp-checklist.md#a05`. `helmet()` como primeiro middleware da app cobre a maioria com defaults razoáveis; CSP costuma precisar de configuração explícita por projeto (fontes de script, imagem, conexão).

```js
const helmet = require('helmet');
app.use(helmet());
```

**Verificar:**
```bash
grep -n "helmet(" src/index.js src/app.js 2>/dev/null
```

## Rate limiting (`express-rate-limit`)

Rate limiting em login, signup, reset de senha e endpoints caros já é critério do checklist — ver `references/owasp-checklist.md#a04`. A implementação de referência em Express:

```js
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/login', loginLimiter, ...);
```

**Verificar:** todo endpoint de autenticação (login, registro, esqueci-senha, reset) e todo endpoint sabidamente caro (upload, export, relatório) tem limiter próprio — um limiter genérico global não substitui um limiter mais agressivo nos endpoints sensíveis a força bruta.

```bash
grep -rn "rateLimit(" src/routes | wc -l
```

## Tratamento de erro centralizado

Sem middleware de erro central, cada rota decide por conta própria o que responder numa exceção — inconsistente e fácil de vazar stack trace (`references/owasp-checklist.md#a05`, item "páginas de erro não vazam stack trace"). Padrão:

- Handlers assíncronos envolvidos por um wrapper (`asyncHandler`) que encaminha rejeição pro `next(err)`, em vez de cada rota repetir `try/catch`.
- Um único middleware de erro, registrado **por último**, que decide o status HTTP, loga o erro (alinhado com a Etapa 7) e responde com mensagem genérica em produção — nunca `err.stack` no corpo da resposta.

```js
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path }, 'unhandled request error');
  const status = err.status || 500;
  res.status(status).json({ error: status < 500 ? err.message : 'Erro interno' });
});
```

**Verificar:**
```bash
grep -rn "app.use((err" src/index.js src/app.js 2>/dev/null
```

## `process.on('unhandledRejection')` e `uncaughtException`

Isso não tem check equivalente em outra etapa — é uma garantia específica do runtime Node, não da aplicação. Uma promise rejeitada sem `.catch()` em algum código fora do caminho de uma requisição HTTP (job em background, listener de evento, `setInterval`) não passa pelo middleware de erro do Express: por padrão, o processo Node **encerra silenciosamente ou trava em estado inconsistente**, dependendo da versão. Capturar esses dois eventos no bootstrap do processo é o que garante que uma falha inesperada vira log e (quando for o caso) reinício controlado, em vez de um processo zumbi ou um crash sem rastro.

```js
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'unhandled promise rejection');
  process.exit(1); // deixa o orquestrador (PM2, systemd, k8s) reiniciar limpo
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});
```

**Verificar:**
```bash
grep -n "unhandledRejection\|uncaughtException" src/index.js
```

## Timeout de requisição

Sem timeout, uma requisição presa numa chamada externa lenta (banco, serviço de terceiro) segura a conexão indefinidamente — em volume, isso esgota o pool de conexões do processo e derruba o serviço inteiro por causa de uma dependência lenta, não quebrada. Configurar timeout no servidor HTTP e, quando o driver permitir, na própria chamada externa:

```js
const server = app.listen(port);
server.setTimeout(30_000); // 30s — ajustar ao perfil de latência real dos endpoints mais lentos
server.headersTimeout = 35_000; // sempre maior que setTimeout
```

## Limite de tamanho de payload

Corpo de requisição sem limite é vetor de exaustão de memória — já é item do checklist (`references/owasp-checklist.md`, extras React/Next.js, "tamanho de payload limitado"), e vale igualmente pro Express puro:

```js
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

Upload de arquivo usa limite próprio no middleware de upload (`multer`, `busboy`), tipicamente maior que o limite de JSON e nunca "sem limite".

## Checklist Node/Express no relatório

- [ ] `helmet()` registrado antes das rotas (`references/owasp-checklist.md#a05` sem achado pendente nos headers cobertos por ele).
- [ ] Rate limiter dedicado em login, registro, reset de senha e endpoints caros (`references/owasp-checklist.md#a04`).
- [ ] Middleware de erro central registrado por último, sem `err.stack` na resposta em produção.
- [ ] `process.on('unhandledRejection')` e `process.on('uncaughtException')` capturados no bootstrap, com log e saída controlada.
- [ ] Timeout de servidor configurado e maior que a latência p99 esperada dos endpoints mais lentos.
- [ ] Limite de tamanho de payload em JSON/urlencoded e em upload, nenhum "sem limite".

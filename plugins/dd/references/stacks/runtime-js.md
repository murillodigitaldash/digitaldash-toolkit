# Trilha JS para a Etapa 2 — gate por fronteira validada, não por tipo

Carregue este perfil quando a Etapa 2 detectar um projeto **sem TypeScript**: nenhum `tsconfig.json` na raiz (ou um `jsconfig.json` com `checkJs: false`), e a maioria dos arquivos de código em `.js`/`.jsx` em vez de `.ts`/`.tsx`.

## Por que existe

`tsc --noEmit` e `type-coverage`, o gate padrão da Etapa 2, não rodam em um projeto sem TypeScript — não há nada pra eles checarem. Isso não torna a etapa "N/A". Um projeto JavaScript sem tipo estático continua tendo as mesmas fronteiras onde dado não confiável entra no sistema — só que sem rede de segurança nenhuma checando o shape desse dado. Ausência de gate é ponto cego, não isenção: o risco que o TypeScript mitigaria (payload malformado tratado como se tivesse o formato esperado, `undefined` se propagando sem erro até quebrar em produção) continua presente, só que sem detecção. Isso é especialmente grave quando esse código é o que fala com banco de dados, serviços externos e autenticação — exatamente onde um formato inesperado vira incidente de segurança ou de dados, não só bug de UI.

A trilha JS existe pra dar a esse projeto um gate equivalente em rigor, medido de outro jeito.

## O gate substituto

Onde a trilha TypeScript mede **percentual de valores tipados** (`type-coverage`), a trilha JS mede **percentual de fronteiras externas validadas por schema**. São métricas diferentes por necessidade — não dá pra contar "tipos" num projeto sem tipos —, mas apontam pro mesmo risco: dado que atravessa uma fronteira de confiança sem verificação de formato.

**Fronteira externa**, para efeito deste gate, é qualquer um destes cinco pontos:
- **Entrada de rota** — parâmetros de path e query string.
- **Corpo de requisição** — o `body` de POST/PUT/PATCH.
- **Resposta de serviço externo** — o retorno de qualquer API de terceiro ou de outro serviço interno chamado via HTTP.
- **Leitura de banco** — o retorno de uma query, especialmente quando o schema do banco pode divergir do que o código assume.
- **Variável de ambiente** — `process.env.X`, que o runtime entrega sempre como `string | undefined`, nunca validado.

Código puramente interno (uma função que só recebe dado já validado por outra parte do próprio processo) não é fronteira e não entra na contagem — do contrário o gate infla artificialmente ao contar tudo, e a métrica perde poder de sinalizar risco real.

## Ferramentas

- **`tsc --allowJs --checkJs --noEmit`** — o TypeScript consegue tipar arquivos `.js` a partir de anotações JSDoc (`@param`, `@returns`, `@type`), sem migrar a extensão do arquivo nem exigir sintaxe TS. Rodar com escopo nos arquivos de fronteira (rotas, middlewares, clientes de serviço externo, camada de acesso a dado, carregamento de env) é o uso proporcional: tipar o projeto inteiro via JSDoc é o mesmo esforço de migrar pra TypeScript de verdade, o que está fora do escopo desta trilha.
- **`zod`** — validação de schema em runtime nos cinco pontos de fronteira listados acima. Se o backend já depende de `zod` (comum em backends Express/Node que cresceram do zero em JS), o custo de adoção é só escrever os schemas, não escolher e instalar uma lib nova.
- **ESLint** — não substitui o type checker, mas recupera uma fatia do que ele pegaria, com regras já presentes no core do ESLint (sem plugin adicional):
  - `no-implicit-coercion` — pega `+x`, `''+x`, `!!x` usados como conversão de tipo implícita, fonte comum de bug silencioso em JS sem tipo.
  - `consistent-return` — uma função que às vezes retorna valor e às vezes não é exatamente o tipo de inconsistência que o TS pegaria na assinatura de retorno.
  - `no-shadow` — variável de escopo interno reusando nome de escopo externo é a versão JS do "troquei o tipo sem perceber porque troquei a variável".

## Comandos

O comando central desta trilha é a contagem de rotas mutantes (`POST`/`PUT`/`PATCH` — as que recebem corpo de requisição) com e sem validação de schema, porque corpo de requisição é a fronteira de maior volume e maior risco em qualquer backend HTTP. Rodar a partir da raiz do backend, contra o diretório de rotas:

```bash
# 1. Total de rotas mutantes declaradas via Express Router:
grep -rhoE "router\.(post|put|patch)\(" src/routes/*.js | wc -l

# 2. Rotas mutantes com validação de schema na própria linha de registro
#    (middleware `validate(schema)`, ou chamada `.parse(`/`.safeParse(` inline):
grep -rhE "router\.(post|put|patch)\(" src/routes/*.js | grep -cE "validate\(|\.parse\(|\.safeParse\("

# 3. Percentual (o número que vira gate):
total=$(grep -rhoE "router\.(post|put|patch)\(" src/routes/*.js | wc -l | tr -d ' ')
validadas=$(grep -rhE "router\.(post|put|patch)\(" src/routes/*.js | grep -cE "validate\(|\.parse\(|\.safeParse\(")
awk -v t="$total" -v v="$validadas" 'BEGIN { printf "%d/%d rotas mutantes com schema (%.1f%%)\n", v, t, (v/t)*100 }'

# 4. Lista das rotas sem validação aparente — a fila de correção, uma por uma:
grep -rhnE "router\.(post|put|patch)\(" src/routes/*.js | grep -vE "validate\(|\.parse\(|\.safeParse\("
```

Ajustar o padrão de rota (`router\.(post|put|patch)\(`) e de validação (`validate\(|\.parse\(|\.safeParse\(`) à convenção do projeto — o que importa é o par "linha que registra rota mutante" × "linha carrega alguma chamada de validação", não o nome exato da função. Rodado contra um backend Express real de 119 arquivos `.js` sem TypeScript, este comando produziu `12/57 rotas mutantes com schema (21.1%)` — um número real, baixo, e imediatamente acionável: a lista do comando 4 é o plano de trabalho.

`checkJs` nos arquivos de fronteira, depois de anotados com JSDoc:
```bash
npx tsc --allowJs --checkJs --noEmit src/routes/*.js src/middleware/*.js
```

Para variável de ambiente, a fronteira mais fácil de esquecer por não ter uma "rota" associada:
```bash
grep -rhoE "process\.env\.[A-Z_0-9]+" src | sort -u | wc -l
```
Comparar esse total com quantas dessas variáveis passam por um schema de validação de env (Zod ou equivalente) antes do primeiro uso — em geral zero num projeto que nunca teve esse gate, o que por si só já é o achado a reportar.

## Reportar

Percentual de rotas mutantes com schema (comando 3), lista de rotas sem validação (comando 4) ordenada por criticidade (autenticação e dado de tenant primeiro), contagem de variáveis de ambiente sem schema, e resultado de `checkJs` nos arquivos de fronteira já anotados.

## Gate de saída (trilha JS)

- **100% das rotas mutantes com validação de entrada por schema** — o comando 3 chega a `100%`, sem exceção não documentada como débito com dono e prazo.
- **`checkJs` sem erro nos arquivos de fronteira** anotados com JSDoc (rotas, middlewares, clientes de serviço externo, camada de acesso a dado).
- Toda variável de ambiente lida em código de fronteira passa por validação de schema antes do primeiro uso (não só `process.env.X || 'default'`).

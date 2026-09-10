---
name: setup
description: "Configura o protocolo dd num projeto pela primeira vez: detecta stack por evidencia de arquivo, propoe .dd/config.yml e espera aprovacao antes de escrever qualquer coisa. Use quando o usuario mencionar \"setup\", \"configurar o dd\", \"instalar o protocolo\", \"primeira vez\", \"inicializar\", \"onboarding\", \"comecar a usar o protocolo neste projeto\" ou pedir para configurar .dd/config.yml. Nesta versao nao instala hooks nem workflow de CI — so propoe e escreve a config, e opcionalmente indica o material de instalacao de ferramentas em references/setup-projeto.md."
---

# Skill: Setup do projeto

`/dd:setup` é a primeira coisa que qualquer projeto roda deste plugin.
Isso muda o que "certo" significa aqui: não é achar o máximo de sinal
possível, é **nunca surpreender**. Um comando que escreve num
repositório sem perguntar é a pior primeira impressão possível para uma
ferramenta cujo argumento de venda inteiro é que ela não faz nada sem
avisar antes.

## O que esta skill faz — e o que não faz

Faz:
- Detecta o stack do projeto por evidência de arquivo (nunca por
  pergunta direta — primeiro olha, depois confirma).
- Sugere candidatos a `areas_criticas` a partir de nomes de caminho.
- Monta uma proposta de `.dd/config.yml` completa e a **mostra** ao
  usuário.
- Escreve `.dd/config.yml` **só depois de aprovação explícita** — nunca
  antes, nunca "para economizar uma pergunta".
- Depois disso, pode oferecer o material de instalação de ferramentas em
  `references/setup-projeto.md` (dependências por etapa, scripts,
  `tsconfig.json`, ESLint base, `.knip.json`) — item por item, cada um
  com a própria aprovação antes de instalar ou escrever qualquer coisa.

Não faz, nesta versão, **mesmo se o usuário pedir**:
- **Não instala hooks.** Os hooks de Claude Code (`PreToolUse` de
  secrets, `PostToolUse` de `.env`/lockfile, `SessionStart`) descritos na
  spec, §6.3, são v0.2. Se o usuário pedir para configurar hooks agora,
  explique que ainda não existe nesta versão — não invente
  `hooks.json` nem qualquer script associado.
- **Não instala workflow de CI.** O gate de projeto automatizado é v0.3.
  Ver a nota correspondente em `references/setup-projeto.md`, seção 8,
  antes de tocar em qualquer coisa relacionada a CI.

Escrever um desses dois itens sem ter sido pedido — ou pior, tê-los
inventado a partir de uma leitura apressada deste material — é dano real
num repositório em que este plugin acabou de ser convidado a entrar.

## Passo a passo

### 1. Verificar se já existe config

Se `.dd/config.yml` já existir no projeto (o comando `/dd:setup` já deve
ter coletado isso), esta não é uma instalação nova — é uma atualização.
Leia o arquivo existente, rode a detecção normalmente, e mostre ao
usuário **o que mudaria** (stacks novos detectados, áreas críticas
candidatas que não estavam lá, gates e exceções que o arquivo atual já
tem e que a proposta preserva) em vez de descartar o que já existe.
Nunca sobrescreva um `.dd/config.yml` existente sem mostrar o diff e
pedir aprovação — as `excecoes` e os `gates` que alguém já configurou à
mão carregam decisões que a detecção automática não pode recriar.

### 2. Detectar o stack por evidência de arquivo

Não pare na raiz do projeto. Monorepos com frontend e backend separados
— dois `package.json`, cada um com as próprias dependências e o próprio
`tsconfig.json` — são comuns o bastante para que uma varredura só na raiz
perca sinal real: uma dependência de observabilidade costuma estar no
`package.json` do pacote de frontend, uma de infraestrutura de dados no
do backend, nenhuma das duas na raiz. **Percorra a raiz do projeto e, no
máximo, um nível de subdiretórios** (ignorando `node_modules`, `dist`,
`build`, `.git` e qualquer diretório começando com `.`) atrás de cada
sinal abaixo, e una o que encontrar em todos os pontos varridos — não
pare no primeiro `package.json` que achar.

| Evidência | Onde procurar | Sinal produzido |
|---|---|---|
| `package.json` existe | raiz ou subdiretório varrido | `node` em `stacks.runtime` |
| `tsconfig.json` no mesmo diretório de um `package.json`, com arquivos `.ts`/`.tsx` dentro do `src/` correspondente | idem | `typescript` em `stacks.runtime` |
| Mesmo diretório sem `tsconfig.json`, com a maioria do código em `.js`/`.jsx` | idem | `javascript` em `stacks.runtime` |
| Diretório `supabase/` | raiz ou subdiretório varrido | `supabase` em `stacks.dados` |
| `prisma/schema.prisma` | idem | `prisma` em `stacks.dados` |
| Dependência cujo nome começa com `@sentry/` (`dependencies` ou `devDependencies` de qualquer `package.json` encontrado) | idem | `sentry` em `stacks.observabilidade` |
| Diretório `k8s/` | raiz ou subdiretório varrido | `kubernetes` em `stacks.infra` |
| Dependência `@google-cloud/bigquery` | qualquer `package.json` encontrado | `bigquery` em `stacks.infra` |

Um projeto pode acionar `typescript` numa parte da árvore e `javascript`
em outra (um pacote de frontend em TS, um backend em JS puro, por
exemplo) — registre os dois em `stacks.runtime` quando isso acontecer.
Essa mistura é exatamente o cenário que o exemplo de
`references/config-schema.md` documenta para `gates.type_coverage_minimo:
null`: um limiar único de cobertura de tipos não faz sentido quando só
parte do código tem tipos pra cobrir.

Esta tabela é o conjunto de sinais **automáticos** desta versão — não é
uma lista fechada de tudo que pode aparecer em `stacks`. Depois de
mostrar a proposta, convide o usuário a adicionar à mão qualquer sinal
que a detecção não cobre (outro provedor de nuvem, outro ORM, um
framework específico).

### 3. Sugerir áreas críticas — nunca decidir por conta própria

Três padrões de caminho já cobrem boa parte dos casos reais, mas são só
um ponto de partida:

| Padrão observado | Candidato proposto |
|---|---|
| Arquivo ou diretório com `auth` no nome, sob uma pasta de rotas | `<caminho>/auth*` |
| Diretório `middleware/` | `<caminho>/middleware/**` |
| Diretório `migrations/` (dentro de `supabase/`, `prisma/`, `drizzle/`, ou solto) | `<caminho>/migrations/**` |

Liste os candidatos que a varredura encontrou e **pergunte** ao usuário:
confirmar todos, remover algum que não seja sensível de verdade, ou
adicionar outro caminho que o algoritmo não pegou (rota de pagamento,
painel administrativo, endpoint de exportação de dado pessoal — nada
disso tem um nome de arquivo previsível o bastante pra virar regra).
**Só quem conhece o projeto sabe quais caminhos carregam risco real** —
esta etapa produz candidatos, a decisão final é sempre do usuário, nunca
da varredura.

### 4. Montar a proposta de `.dd/config.yml`

Com stack detectado e áreas críticas confirmadas, monte a proposta
completa seguindo `references/config-schema.md`:

- `versao: 1`.
- `projeto`: slug do campo `name` do `package.json` da raiz, se existir;
  senão o nome do diretório do projeto.
- `stacks`: união dos sinais do passo 2, por categoria.
- `areas_criticas`: os candidatos confirmados no passo 3.
- `gates`: proponha **desligado** (`null` ou `false`) todo gate cujo
  valor real esta skill não pode medir agora — com o motivo escrito na
  mesma linha, seguindo a regra de `references/config-schema.md`. Não
  adivinhe um limiar de `type_coverage_minimo`: se o projeto é JS puro,
  o motivo é justamente esse (ver o exemplo do schema); se tem
  TypeScript, o motivo é que ninguém mediu a cobertura real ainda —
  proponha `null` com essa nota e sugira `npx type-coverage` como
  próximo passo, em vez de inventar um número.
- `excecoes`: lista vazia neste primeiro setup. Se o usuário já sabe de
  uma exceção que quer registrar, cada uma precisa de `id` (de um check
  existente em `checks/registry.yaml`), `caminho`, `motivo` e `expira` —
  sem os quatro campos, não inclua a entrada.

### 5. Pedir aprovação — sempre, sem exceção

Mostre a proposta completa, em YAML, exatamente como ficaria escrita.
Pergunte explicitamente se pode escrever. Não prossiga com nenhuma
suposição de "sim implícito" — silêncio, uma resposta ambígua, ou uma
pergunta de volta do usuário não contam como aprovação.

### 6. Escrever, só depois do "sim"

Crie `.dd/` se não existir e escreva `.dd/config.yml` com o conteúdo
aprovado — ajustado com qualquer edição que o usuário tenha pedido antes
de confirmar, nunca a proposta original se ela mudou na conversa.

### 7. Oferecer o material de instalação de ferramentas

Depois que `.dd/config.yml` estiver escrito, ofereça — não execute
automaticamente — o conteúdo de `references/setup-projeto.md` relevante
ao stack detectado: instalação de dependências por etapa, scripts de
`package.json`, `tsconfig.json` recomendado, config base de ESLint,
`.knip.json`. Trate cada item como uma proposta própria, com a mesma
regra do passo 5: mostrar o que mudaria, esperar aprovação, só então
escrever ou rodar `npm i`. A seção 8 daquele arquivo (CI/CD) é conteúdo
de referência apenas — não ofereça instalar workflow de CI nesta versão,
nem que o usuário peça; explique que é v0.3.

## Fixture mínima para validar a detecção

Um projeto com só um `package.json` contendo `express` nas dependências
deve produzir uma proposta com `runtime: [node]` — sem `typescript`, sem
os demais sinais, já que nenhuma das outras evidências está presente. Se
a detecção nesta skill produzir qualquer coisa além disso para esse caso,
a lógica tem um bug: verifique a tabela do passo 2 antes de mudar
qualquer outra coisa.

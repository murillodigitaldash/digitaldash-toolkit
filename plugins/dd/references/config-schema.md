# Schema de configuração do projeto

Documenta o formato de `.dd/config.yml`, o arquivo que `/dd:setup`
propõe e escreve no projeto auditado — nunca neste plugin. Ele é
versionado no git do projeto alvo e revisável em PR, exatamente como
qualquer outro arquivo de configuração de time.

Quem lê este arquivo hoje: `/dd:status` (últimos runs, exceções vencidas
ou a vencer), `/dd` (áreas críticas para classificar o eixo) e
`scripts/validate-checks.mjs` (`validarExcecoes`, que valida a lista
`excecoes` contra o núcleo de checks). Quem escreve: só `/dd:setup`,
depois de aprovação explícita do usuário — ver `skills/setup/SKILL.md`.

## Exemplo completo

```yaml
versao: 1
projeto: ecampanha
stacks:
  runtime: [node, react]
  dados: supabase
  observabilidade: sentry
  infra: [k8s, gcp, bigquery]
areas_criticas:
  - backend/src/routes/auth*
  - backend/src/middleware/**
  - supabase/migrations/**
gates:
  type_coverage_minimo: null    # backend é JS puro; ligar exige a trilha JS (references/stacks/runtime-js.md)
  cobertura_fluxos_criticos: true
excecoes:
  - id: SEC-004
    caminho: docs/exemplos/*.md
    motivo: "payloads de exemplo com token fictício"
    expira: 2027-06-30
```

## Campos

### `versao`

Inteiro. Versão do schema deste arquivo, não do plugin nem do projeto.
Hoje sempre `1`. Existe para permitir migração futura sem quebrar
projetos que já rodaram `/dd:setup` — um `/dd:setup` de uma versão nova
do plugin lê `versao` antes de reescrever o arquivo.

### `projeto`

String. Identificador curto do projeto (slug), usado em relatórios e
mensagens — não precisa bater com o nome do repositório git.

### `stacks`

Objeto com quatro chaves, todas opcionais individualmente — um projeto
sem banco de dados, por exemplo, pode omitir `dados`. Cada valor é uma
string ou uma lista de strings, conforme o número de sinais detectados:

| Chave | O que carrega | Exemplos |
|---|---|---|
| `runtime` | Linguagem/runtime de execução e sinais de tipagem | `node`, `typescript`, `javascript`, `react` |
| `dados` | Camada de persistência | `supabase`, `prisma`, `firebase`, `drizzle` |
| `observabilidade` | Provedor de observabilidade | `sentry`, `datadog`, `betterstack`, `opentelemetry` |
| `infra` | Sinais de infraestrutura e provedores de nuvem | `k8s`, `gcp`, `aws`, `bigquery` |

Estes valores carregam os perfis de stack em `references/stacks/` (Etapas
7 e 8) e a trilha JS (`references/stacks/runtime-js.md`, Etapa 2) — ver
cada arquivo de perfil, seção "Carregue este perfil quando detectar",
para a lista de sinais que cada valor representa. O vocabulário não é uma
enumeração fechada: `/dd:setup` propõe os valores que detecta por
evidência de arquivo (`skills/setup/SKILL.md`), e o usuário pode
adicionar à mão qualquer sinal que a detecção automática não cubra antes
de aprovar.

### `areas_criticas`

Lista de globs, relativos à raiz do projeto auditado. Marca caminhos
onde um achado pesa mais — o comando `/dd` cruza o diff contra esta lista
para decidir se um release "pequeno" no volume de linhas ainda merece o
modo `release` completo em vez de `auto`. Globs seguem a sintaxe padrão
(`*` dentro de um segmento, `**` atravessando diretórios). Lista vazia é
válida: significa que o projeto ainda não definiu áreas críticas, não que
nenhum caminho é sensível — trate como "não configurado", não como "nada
é crítico".

### `gates`

Mapa `nome_do_gate: valor`. `valor` é `true`/`false`, um número (limiar) ou
`null` (gate desligado). O vocabulário de nomes não é fechado — cada gate
corresponde a um limiar que uma etapa do protocolo aplica; os dois abaixo
já têm consumidor hoje:

- `type_coverage_minimo` — limiar percentual para `type-coverage` na
  Etapa 2 (`references/etapas/02-tipos.md`). `null` quando o projeto não
  usa TypeScript ou ainda não decidiu o limiar.
- `cobertura_fluxos_criticos` — booleano: exige que os fluxos críticos
  listados em `docs/critical-flows.md` (ou equivalente) tenham teste e2e
  antes do gate final da Etapa 12.

**Regra: um gate desligado (`null` ou `false` num gate que por padrão
seria exigido) precisa de um comentário com o motivo, na mesma linha.**

```yaml
gates:
  type_coverage_minimo: null    # backend é JS puro; ligar exige a trilha JS
```

`type_coverage_minimo: null` sozinho é indistinguível de um gate que
ninguém nunca configurou. Com o comentário ao lado, vira uma decisão
registrada — quem lê o arquivo depois (revisor de PR, o próprio time em
seis meses) sabe que o gate foi desligado conscientemente, e por quê, em
vez de precisar investigar se foi esquecido. Isto não é um estilo
sugerido: um gate `null`/`false` sem comentário na mesma linha é uma
config incompleta, e `/dd:setup` não deve propor uma assim — ver
`skills/setup/SKILL.md`, passo "Montar a proposta de `.dd/config.yml`",
para o mesmo princípio aplicado a este campo.

### `excecoes`

Lista de objetos. Cada exceção suprime, por um prazo, um achado
específico de um check do núcleo — nunca um check inteiro, nunca sem
prazo. Quatro campos, todos obrigatórios:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string | sim | Id de um check do núcleo (`checks/registry.yaml`), por exemplo `SEC-004`. A exceção é **desse check**, não um identificador arbitrário — `validarExcecoes` (`scripts/validate-checks.mjs`) rejeita um `id` que não existe no registry. |
| `caminho` | string (glob) | sim | Onde a exceção se aplica — arquivo, diretório ou glob. `/dd:status` reporta este campo ao listar exceções vencidas e a vencer (ver `commands/status.md`, passo 5). |
| `motivo` | string | sim | Por que o achado é aceitável aqui e não em outro lugar. Frase, não palavra solta — "payloads de exemplo com token fictício", não "falso positivo". |
| `expira` | data `YYYY-MM-DD` | sim | Prazo de validade da exceção. |

**Regra: toda exceção tem `expira`, sem exceção da regra.**
`scripts/validate-checks.mjs` exporta `validarExcecoes`, que recusa uma
exceção sem `id`, sem `motivo`, sem `caminho` ou sem `expira`, e recusa também uma
exceção cujo `expira` já passou — hoje exercida pela suíte de testes
deste plugin. É a mesma lógica que o gate crítico de projeto (v0.3, spec
§6.4) vai reusar para bloquear PR quando encontrar qualquer um dos quatro
problemas — essa parte ainda não está instalada em nenhum projeto alvo
nesta versão. Enquanto isso, quem avisa é `/dd:status`: ele lê
`.dd/config.yml` a cada chamada e reporta exceções vencidas e a vencer
em até 30 dias, de forma conversacional — não é um bloqueio automatizado
ainda.

Uma exceção sem prazo não é uma decisão — é como um protocolo morre aos
poucos: não de uma vez, mas por acúmulo de supressões que ninguém lembra
de ter criado. A diferença entre dívida técnica registrada e dívida
técnica invisível é ter escrito, num lugar que expira e que alguém
revisita, por que a exceção existe.

**Nota de implementação:** o validador checa `id`, `motivo`, `caminho` e
`expira` programaticamente — qualquer um dos quatro ausente causa rejeição
da config. A validade de `id` é confirmada contra o registry de checks
(`checks/registry.yaml`), e a de `expira` contra a data de hoje.

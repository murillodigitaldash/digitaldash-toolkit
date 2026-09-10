# digitaldash-toolkit

Plugin do Claude Code com o protocolo de performance e proteção de sistemas
da Digital Dash: um núcleo único de 44 checks, executado sobre dois eixos —
**Release** e **Postura** — com cinco agentes auditores, cinco comandos e
três skills. `v0.1`: sem hooks, sem CI do projeto auditado — o CI deste
repositório cobre só o plugin em si.

## Instalação

O repositório é **privado**. Antes de instalar, autentique o `gh` no
terminal onde o Claude Code roda (`gh auth login`) — sem isso, o Claude
Code não consegue buscar o marketplace nem o plugin.

Dentro do Claude Code:

```
/plugin marketplace add murillodigitaldash/digitaldash-toolkit
/plugin install dd@digitaldash
```

O primeiro comando registra o marketplace `digitaldash`
(`.claude-plugin/marketplace.json`, na raiz deste repositório); o segundo
instala o plugin `dd` que esse marketplace publica
(`plugins/dd/.claude-plugin/plugin.json`).

## O que o plugin faz

Todo julgamento sobre "o que verificar" vem de um único núcleo de checks —
`plugins/dd/checks/registry.yaml`, com o critério humano de cada check no
guia de domínio correspondente em `plugins/dd/checks/*.md`. Dois eixos
consultam esse mesmo núcleo por cadência diferente; nenhum dos dois mantém
lista própria de critérios.

### Eixo Release

Roda a cada PR ou release. Doze etapas agnósticas a stack, em cinco modos
(`release`, `auto`, `hotfix`, `feature`, `auditoria`) despachados para cinco
agentes auditores independentes. Descrito por completo em
`plugins/dd/skills/release/SKILL.md`, com a lógica de cada modo em
`plugins/dd/references/modos.md`.

### Eixo Postura

Roda em cadência trimestral (~90 dias), fora do ciclo de PR — auditoria de
saúde do sistema (IAM, infraestrutura, disaster recovery, supply chain) que
alimenta backlog e planejamento, não uma decisão de go/no-go. Descrito por
completo em `plugins/dd/skills/postura/SKILL.md`.

### Por que dois eixos, e não um só

A separação é de **cadência**, não de tema. `tsc --noEmit` faz sentido a
cada commit; "restore de backup testado nos últimos 90 dias" não muda a
cada PR. Cobrar as duas coisas no mesmo gate produz um gate permanentemente
amarelo — e um gate permanentemente amarelo é um gate que o time aprende a
ignorar, porque nunca fica limpo o suficiente para significar algo. Rodar o
eixo errado na cadência errada (Postura a cada PR, ou Release só a cada
trimestre) recria exatamente o problema que a separação existe para evitar:
ou o PR trava por débito que não é dele, ou a saúde do sistema só é olhada
quando já é tarde.

O roteador `/dd` lê o diff contra a base e a última execução de Postura em
`.protocolo/` para propor qual eixo — e, se Release, qual modo — rodar; ele
nunca executa sozinho, só propõe e espera confirmação
(`plugins/dd/commands/dd.md`).

## O cinturão de bloqueio

Do núcleo de 44 checks, exatamente **7** têm `bloqueia: true` — a lista
mínima que impede um release de seguir quando falha. A lista completa, com
critério de cada um, está em `plugins/dd/checks/registry.yaml` e nos guias
de domínio em `plugins/dd/checks/*.md`; não é repetida aqui.

Esse número é verificado no CI (`.github/workflows/ci.yml`) como gate sobre
o próprio design, não sobre o código: crescer o cinturão exige editar o
workflow no mesmo commit que adiciona o check. Essa fricção é proposital —
um cinturão que cresce silenciosamente deixa de ser cinturão.

## Como adicionar um check

1. Edite `plugins/dd/checks/registry.yaml` — nova entrada com todos os
   campos obrigatórios (schema validado por `scripts/validate-checks.mjs`).
2. Edite o guia de domínio correspondente em `plugins/dd/checks/*.md` com o
   julgamento humano: por que existe, falsos positivos conhecidos, como
   remediar, o que não conta como resolvido.
3. Rode `npm run validate` — confere schema, âncoras e toda referência
   cruzada do repositório.
4. Se o check novo tiver `bloqueia: true`, atualize o gate de contagem em
   `.github/workflows/ci.yml` no mesmo commit.

Nenhuma dessas etapas é opcional: um check sem entrada no `registry.yaml`
não é lido por nenhum eixo; um check sem guia de domínio não tem critério
de julgamento; e sem `npm run validate` verde, referência quebrada ou
schema inválido passam despercebidos até alguém tropeçar neles em produção.

## Desenvolvimento

```bash
npm ci
npm test        # 40 testes, node --test
npm run validate # schema do nucleo + referencias cruzadas do repositorio
```

`npm run validate` roda dois validadores em sequência
(`scripts/validate-checks.mjs`, `scripts/validate-refs.mjs`) — o que cada
um cobre está documentado no cabeçalho do próprio arquivo, não aqui.

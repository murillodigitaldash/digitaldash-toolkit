---
description: "Leitura barata do estado do protocolo dd no projeto atual: data do ultimo run por eixo, achados abertos que bloqueiam, excecoes vencendo e atraso do eixo Postura. Nunca roda auditoria"
allowed-tools: Bash(ls:*), Bash(cat:*), Bash(find:*), Bash(date:*), Read, Glob
---

# /dd:status — leitura de estado

Este comando é uma leitura, não uma auditoria. Se responder à pergunta do
usuário exigisse rodar um check, um agente auditor, ou qualquer uma das
skills `release`/`postura`, você estaria fazendo o trabalho errado — pare e
explique que a pergunta exige um run completo (`/dd:release <modo>` ou
`/dd:postura`). Este comando só lê arquivos que já existem em
`.protocolo/` e em `.dd/config.yml`, ambos no projeto atual — nunca dentro
deste plugin.

## Contexto coletado

- Data de hoje: !`date +%Y-%m-%d`
- Diretórios em `.protocolo/`, mais recentes primeiro: !`ls -1 .protocolo 2>/dev/null | sort -r || echo "(nenhum — .protocolo/ nao existe neste projeto ainda)"`
- Config do projeto, se existir: !`cat .dd/config.yml 2>/dev/null || echo "(nao existe — projeto ainda nao rodou /dd:setup)"`

## O que ler

1. **Diretórios de execução** — liste `.protocolo/` (formato
   `<YYYY-MM-DD-HHmm>`), do mais recente para o mais antigo. Se o
   diretório não existir, reporte "nenhum run ainda" e pare por aí — não
   há mais nada pra ler.

2. **Data do último run de cada eixo** — para `release` e para `postura`,
   separadamente: percorra os stamps do mais recente para o mais antigo,
   abrindo o `achados.json` de cada um, até achar o primeiro cujo campo
   `eixo` bate com o eixo procurado. É o mesmo algoritmo que
   `skills/postura/SKILL.md`, seção "Cadência", usa para calcular a
   própria cadência — reaplique-o aqui uma vez por eixo, em vez de
   inventar uma segunda forma de percorrer `.protocolo/`. Reporte a data
   do `stamp` achado e os dias corridos até hoje; se nenhum stamp tiver
   aquele eixo, reporte "nunca rodou". Guarde o array `achados` desse
   mesmo `achados.json` que você acabou de abrir — o passo 4 usa esses
   dados, sem reabrir o arquivo nem abrir outro.

3. **Atraso do eixo Postura** — usando a data achada no passo 2 para
   `postura`: se passaram mais de 90 dias, ou se nunca rodou, marque como
   **atrasada**. Mesmo critério de "Cadência" em `skills/postura/SKILL.md`
   — não é um número novo inventado aqui.

4. **Achados abertos que bloqueiam** — do array `achados` dentro do
   `achados.json` que você já abriu no passo 2, para o run mais recente
   de cada eixo. Não abra `report.md` para isso: `achados.json` é o
   contrato machine-readable, já traz `check`, `severidade`, `bloqueia`,
   `arquivo`, `linha`, `status` e `resumo` por achado, e o arquivo já
   está aberto do passo anterior — ver `references/templates/report.md`,
   seção "Formato de `achados.json`", para o schema completo campo a
   campo. Filtre os itens com `bloqueia: true` e
   `status: "aberto"`; para cada um, reporte `check` (ou "sem id" quando
   `check` é `null`), `arquivo:linha` (ou "sem localizacao" quando ambos
   são `null`), `resumo` e o eixo de origem. Se um eixo não tem nenhum
   run ainda, diga isso explicitamente em vez de omitir a linha ou tratar
   como zero achados.

5. **Exceções vencidas ou a vencer** — leia a lista `excecoes` do
   `.dd/config.yml` coletado acima, se o arquivo existir. Cada exceção
   tem, no mínimo, `id`, `caminho`, `motivo` e `expira` (data no formato
   `YYYY-MM-DD`, campo obrigatório) — ver `references/config-schema.md`
   para o schema completo de `.dd/config.yml` quando ele existir. Compare
   `expira` com a data de hoje coletada acima: já passou → vencida; até
   30 dias no futuro → a vencer. Liste as duas categorias separadamente.
   Se `.dd/config.yml` não existir, diga que o projeto ainda não rodou
   `/dd:setup` — não trate a ausência como "zero exceções", que é uma
   afirmação diferente.

## Formato do relatório

Responda em uma tela só, sem prosa decorativa:

```
Último run — release: <data ou "nunca"> (<N> dias atrás)
Último run — postura: <data ou "nunca"> (<N> dias atrás) <"— ATRASADA" se > 90 dias ou nunca>

Achados abertos que bloqueiam:
- <check ou "sem id"> · <arquivo:linha ou "sem localizacao"> · <resumo> (eixo <release|postura>)
(ou "nenhum")

Exceções vencidas:
- <id> · <caminho> · venceu em <data>
(ou "nenhuma")

Exceções a vencer em até 30 dias:
- <id> · <caminho> · vence em <data>
(ou "nenhuma")
```

Não proponha próximo passo nem decisão go/no-go — decisão go/no-go é
trabalho do eixo Release (`/dd:release`), não deste comando.

---
description: "Invoca o eixo Release do protocolo dd no modo informado. Sem modo, pergunta — nao ha default implicito"
argument-hint: "[release|auto|hotfix|feature|auditoria]"
---

# /dd:release — eixo Release

Argumento recebido: `$ARGUMENTS`

## Validação do modo

Não há default implícito. Se `$ARGUMENTS` vier vazio, **pergunte ao
usuário qual modo ele quer** antes de prosseguir — não assuma `auto` nem
qualquer outro modo. Se precisar explicar as opções, `references/modos.md`
descreve cada uma; não repita essa descrição aqui.

Se `$ARGUMENTS` vier preenchido, valide o primeiro token contra a lista
fechada de cinco modos: `release`, `auto`, `hotfix`, `feature`,
`auditoria`. Se não for exatamente um desses cinco, diga ao usuário que o
modo é inválido e liste os cinco — não tente adivinhar o modo mais
próximo (por exemplo, não trate "releases", "Release" com maiúscula fora
do padrão, ou "prod" como sinônimo de `release`).

## Execução

Com o modo validado, invoque a skill `release` (`skills/release/SKILL.md`)
passando o modo confirmado. A partir daí a skill decide tudo: detecção de
stack, criação de `.protocolo/<stamp>/`, despacho dos cinco agentes
auditores, geração de `report.md`, `achados.json` e `metricas.json`. Nada
disso é responsabilidade deste comando — a única responsabilidade dele é
garantir que a skill nunca rode com um modo ambíguo, ausente ou inválido.

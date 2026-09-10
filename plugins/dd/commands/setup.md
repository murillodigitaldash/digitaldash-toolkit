---
description: "Configura o protocolo dd no projeto atual: detecta stack por evidencia de arquivo e propoe .dd/config.yml, esperando aprovacao antes de escrever qualquer coisa. Nao instala hooks nem workflow de CI nesta versao"
allowed-tools: Bash(cat:*), Read, Glob
---

# /dd:setup — configuração inicial do projeto

## Contexto coletado

- Config já existe? !`cat .dd/config.yml 2>/dev/null || echo "(nao existe — primeira execucao de /dd:setup neste projeto)"`

## Execução

Invoque a skill `setup` (`skills/setup/SKILL.md`), passando o resultado
acima. A partir daí a skill decide tudo: detecção de stack por evidência
de arquivo, sugestão de áreas críticas, montagem da proposta de
`.dd/config.yml` e (se `.dd/config.yml` já existia) o cálculo do que
mudaria em relação ao que já está escrito. Este comando não faz nenhuma
dessas coisas sozinho — a única responsabilidade dele é entregar à skill
se já existe config para ela decidir entre instalação nova e atualização.

Nenhuma escrita acontece nesta resposta. `/dd:setup` só grava
`.dd/config.yml` depois que a skill mostrar a proposta completa e o
usuário aprovar explicitamente — ver `skills/setup/SKILL.md`, passos 5 e
6. Esta versão não instala hooks nem workflow de CI; se o pedido for por
qualquer um dos dois, a skill explica que ainda não existe nesta versão
em vez de inventar o arquivo.

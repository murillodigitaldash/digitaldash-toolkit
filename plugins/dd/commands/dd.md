---
description: "Roteador do protocolo dd: le o diff contra a base, o .protocolo/ e o .dd/config.yml do projeto atual, propoe eixo e modo, e para para confirmacao — nunca executa nada sozinho"
allowed-tools: Bash(git branch:*), Bash(git rev-parse:*), Bash(git diff:*), Bash(ls:*), Bash(cat:*), Read, Glob
---

# /dd — roteador do protocolo

Você está decidindo, não executando. A única saída válida desta resposta é
uma proposta de eixo e modo, seguida da pergunta de confirmação. Não
invoque a skill `release` nem a skill `postura` nesta resposta, mesmo que a
escolha pareça óbvia — isso é trabalho de `/dd:release` e `/dd:postura`,
que o usuário roda depois de confirmar.

## Contexto coletado

- Diff contra a base (tenta `main`, senão `master`) e arquivos alterados:
  !`b=$(git rev-parse --verify -q main >/dev/null 2>&1 && echo main || echo master); echo "base: $b"; git diff "$b"...HEAD --stat 2>/dev/null; echo "--- arquivos ---"; git diff "$b"...HEAD --name-only 2>/dev/null`
- Execuções anteriores do protocolo neste projeto (`.protocolo/`, mais
  recentes primeiro): !`ls -1 .protocolo 2>/dev/null | sort -r | head -5 || echo "(nenhuma — .protocolo/ nao existe neste projeto ainda)"`
- Config do projeto, se existir: !`cat .dd/config.yml 2>/dev/null || echo "(nao existe — projeto ainda nao rodou /dd:setup)"`

## Como propor

1. **Classifique o eixo primeiro.**
   - Há arquivos alterados no diff acima → eixo `release`.
   - Diff vazio → leia, para cada stamp em `.protocolo/` do mais recente
     ao mais antigo, o `achados.json` até achar o primeiro com
     `"eixo": "postura"`, e calcule os dias corridos desde o `stamp` —
     exatamente o algoritmo que `skills/postura/SKILL.md` descreve na
     seção "Cadência". Não recalcule esse critério de outro jeito. Se
     passaram mais de 90 dias, ou não há nenhum run de postura, proponha
     eixo `postura`.
   - Diff vazio e postura em dia → não proponha nada arbitrário. Diga ao
     usuário que não há sinal de trabalho pendente e pergunte o que ele
     quer rodar.
2. **Se o eixo proposto for `release`, classifique o modo** pela árvore de
   decisão de `references/modos.md`, seção "Decisão entre modos: árvore
   rápida" — leia o arquivo inteiro antes de decidir, não reaplique de
   memória nem reproduza a tabela de classificação aqui. Resumo do que a
   árvore decide (não o critério completo — ele mora só em `modos.md`):
   1-3 arquivos corrigindo um bug → `hotfix`; mudança em infra, auth ou
   dados → `release`; feature contida e isolada → `feature`; dúvida
   genuína → `auto`. Cruze também com `areas_criticas` de
   `.dd/config.yml` (se existir): um arquivo alterado que cai numa área
   crítica declarada pelo projeto conta como "mudança em área crítica"
   mesmo que não bata em nenhum padrão genérico que `modos.md` já lista.
3. **Se o eixo proposto for `postura`, não há modo** — a skill `postura`
   não tem os cinco modos do eixo Release; ela roda por conta própria e
   já faz a própria checagem de cadência.
4. **Apresente a proposta e pare.** Formato:

   ```
   Eixo proposto: <release|postura>
   Modo proposto: <release|auto|hotfix|feature|auditoria>   (só quando eixo = release)
   Motivo: <uma linha citando os arquivos, a área crítica, ou o atraso de
   cadência que motivou a escolha>

   Confirma? Se sim, rode `/dd:release <modo>` (ou `/dd:postura`, se o
   eixo proposto foi postura).
   ```

5. Não execute a skill, não despache agente auditor, não crie
   `.protocolo/<stamp>/` nesta resposta — nem mesmo depois que o usuário
   confirmar. A confirmação dele autoriza rodar o comando seguinte; não
   autoriza esta resposta a continuar sozinha.

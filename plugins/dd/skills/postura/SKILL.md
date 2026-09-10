---
name: postura
description: "Executa o eixo Postura do protocolo de performance e proteção de sistemas da Digital Dash — auditoria de saúde do sistema em cadência trimestral, não um gate de release. Use quando o usuário mencionar \"postura\", \"auditoria trimestral\", \"health check\", \"revisão periódica de segurança\", \"IAM\", \"backup\", \"disaster recovery\", \"infraestrutura\", \"MFA\", \"contas inativas\", \"restore de backup\", \"RTO\", \"RPO\" ou \"maturidade de supply chain\" fora do ciclo de PR. Executa todo check do núcleo cuja cadência inclua \"postura\", mais quatro referências (IAM, infraestrutura, disaster recovery e supply chain) que ainda não têm check formal."
---

# Eixo Postura

**Postura não bloqueia release.** O resultado desta skill alimenta
planejamento — backlog de segurança, plano de trimestre, decisão de
investimento em infraestrutura — nunca uma decisão de go/no-go como o eixo
Release. Encontrar um achado crítico aqui não impede nenhum deploy; cria um
item de trabalho com prazo. A razão de existir um eixo separado é de
cadência, não de tema: `tsc --noEmit` faz sentido a cada PR; "restore de
backup testado nos últimos 90 dias" não muda a cada commit. Cobrar os dois
no mesmo gate produz um gate permanentemente amarelo, e um gate
permanentemente amarelo é um gate que as pessoas aprendem a ignorar.

## Cadência: trimestral, não por commit

Este eixo roda a cada ~90 dias — o oposto do eixo Release, que roda a cada
PR ou release. Antes de executar qualquer coisa:

1. Liste os diretórios em `.protocolo/` (formato `<YYYY-MM-DD-HHmm>`).
2. Leia o `achados.json` de cada um, do mais recente para o mais antigo,
   procurando o primeiro com `"eixo": "postura"`.
3. Calcule os dias corridos entre o `stamp` desse arquivo e a data de hoje.
4. Informe ao usuário: "última postura em `<data>`, `<N>` dias atrás." Se
   `N > 90`, ou se nenhum run de postura for encontrado, declare a postura
   **atrasada** antes de prosseguir — o atraso em si é o primeiro achado do
   relatório, não um detalhe administrativo.

Não pule esta checagem mesmo que o usuário peça para rodar direto.

## O que esta skill executa

Duas fontes, sem sobreposição entre elas:

1. **Todo check do núcleo com `postura` na `cadencia`.** Consulte
   `checks/registry.yaml` para a lista atual — hoje isso cobre a maior parte
   dos domínios `SEC`, `DEP`, `LOG`, `LGPD`, `LGPD-S`, `TEN` e `AI`. A lista
   definitiva é sempre o registry, nunca esta prosa: ele evolui sem esta
   skill precisar mudar. Reporte cada achado pelo id do check, com o
   julgamento vivendo no guia do domínio correspondente dentro de
   `checks/` — nunca repetido aqui.
2. **As quatro referências abaixo** — tópicos sem check formal no núcleo
   hoje, e por isso o conteúdo novo deste eixo:

| Arquivo | Cobre |
|---|---|
| `references/postura/iam.md` | MFA, menor privilégio, contas inativas, escopo de service account, escopo de token, timeout de sessão, SSO |
| `references/postura/infra.md` | CORS, cabeçalhos de segurança, TLS, certificados, cookies, buckets públicos, serviços internos expostos, WAF, DDoS |
| `references/postura/dr.md` | Backup cifrado, região distinta, restore efetivamente testado, RTO/RPO, imutabilidade, runbook de DR |
| `references/postura/supply-chain.md` | Maturidade de supply chain acima dos checks `DEP-*`: proveniência, fixação de versão, política de registry, disciplina de lockfile em CI |

Cada uma segue **Objetivo, Procurar, Evidência aceitável, Reportar** por
tópico. "Evidência aceitável" é a seção que separa este eixo de um checklist
comum: ela diz o que uma resposta precisa conter pra contar como resolvida
— não apenas se o tópico foi tocado.

## Como usar

1. Rode a checagem de cadência acima primeiro; ela é parte do relatório.
2. Detecte a infraestrutura do projeto (provedor de nuvem, provedor de
   identidade, onde o backup mora) — as quatro referências pedem evidência
   específica de cada provedor, não uma resposta genérica.
3. Crie `.protocolo/<YYYY-MM-DD-HHmm>/`, no mesmo formato do eixo Release.
4. Execute os checks do núcleo com `postura` na cadência e as quatro
   referências. Para cada item, exija a evidência no padrão descrito em
   "Evidência aceitável" antes de marcar como resolvido — um "sim" sem ela
   é achado aberto, não item passado.
5. Gere `report.md` e `achados.json` em `.protocolo/<stamp>/`, no formato de
   `references/templates/report.md`, com `"eixo": "postura"` no topo do arquivo — é esse campo que a próxima execução usa para calcular a
   cadência.
6. Não produza decisão go/no-go. Entregue achados priorizados por
   severidade e um resumo do que fica para o planejamento do próximo
   trimestre.

## Núcleo de checks

Esta skill não repete critério que já mora no núcleo: secrets (`SEC-*`),
LGPD (`LGPD-*`) e logs (`LOG-*`) são executados pelo id, com o julgamento
vivendo uma vez só no guia do domínio correspondente dentro de `checks/`.
Código é diferente e não pode ser lido como equivalente: só a fatia de
isolamento de tenant e IDOR da categoria CÓDIGO da fonte está em
`TEN-001` a `TEN-006` — as classes de injeção (SQL injection, XSS, CSRF,
SSRF, command injection e as demais) ficam fora do escopo deste eixo e são
cobertas, **parcialmente**, pelo eixo Release na Etapa 11, via
`references/owasp-checklist.md`. "Parcialmente" é literal, não modéstia de
redação: path traversal, race conditions, mass assignment, open redirect e
insecure deserialization não têm cobertura em lugar nenhum do plugin
hoje — nem aqui, nem no núcleo, nem no checklist da Etapa 11. Esse gap é
real; fechá-lo é trabalho de uma versão futura, fora do escopo desta task.
As quatro referências deste eixo cobrem exatamente o que o núcleo ainda não
formaliza — IAM, infraestrutura, disaster recovery e a maturidade de supply
chain acima do que `DEP-*` já verifica.

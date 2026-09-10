---
name: release
description: "Executa o eixo Release do protocolo de performance e proteção de código da Digital Dash antes de releases. Use SEMPRE que o usuário mencionar \"release\", \"pré-produção\", \"pre-prod\", \"deploy\", \"go-live\", \"auditoria de código\", \"antes de subir\", \"antes de publicar\", \"fechar versão\" ou \"hotfix\", ou pedir varredura de qualidade, tipos, testes, observabilidade, dados, performance, acessibilidade ou segurança antes de subir código. Executa em 5 modos (release, auto, hotfix, feature, auditoria) sobre 12 etapas agnósticas a stack. Cada etapa cita o núcleo de checks por id em vez de repetir critério e carrega o próprio arquivo em references/etapas/ sob demanda."
---

# Eixo Release

Protocolo pré-release da Digital Dash sobre **12 etapas** agnósticas a stack, executadas em um de **5 modos**. Cada etapa vive no próprio arquivo em `references/etapas/`, carregado só quando aquela etapa roda — é o que mantém este arquivo fino o bastante para caber na atenção do agente.

---

## Modos de execução

Não há default implícito: o usuário sempre nomeia o modo. Se pedir "roda o protocolo" sem especificar, pergunte antes de prosseguir.

| Modo | Invocação | Etapas | Quando usar |
|---|---|---|---|
| `release` | "modo release" / "release completo" | 1 → 12 (todas) | Release grande, multi-feature, com mudança de infra ou área crítica |
| `auto` | "modo auto" / "auto" | Detectadas via `git diff` | Release qualquer — a skill propõe o escopo e espera aprovação |
| `hotfix` | "modo hotfix" / "hotfix" | 1, 2, 5, 11, 12 | Correção urgente em produção, 1-3 arquivos alterados |
| `feature` | "modo feature" / "feature" | 1, 2, 3, 5, 6, 11, 12 | Feature isolada, sem mudança de infra ou dados |
| `auditoria` | "modo auditoria" / "auditoria geral" | 1 → 12 + comparação histórica | Health check periódico, fora de release |

Invocação cirúrgica: o usuário pode pedir etapas específicas ("etapas 2, 7 e 11", "só a etapa 8"). Execute exatamente essas, na ordem numérica.

Comportamento detalhado de cada modo — passo a passo do modo `auto`, tabela de classificação por arquivo alterado, árvore de decisão entre modos — está em `references/modos.md`. Leia antes de executar qualquer modo além de uma invocação cirúrgica de etapa única.

---

## Como usar

1. Confirme o modo com o usuário, se não estiver explícito.
2. Detecte o stack do projeto (`package.json`, `tsconfig.json`, presença de banco, framework) — a Etapa 2 e as etapas 7 a 9 carregam perfil conforme o que for detectado.
3. Crie `.protocolo/<YYYY-MM-DD-HHmm>/` na raiz do projeto auditado; salve todo output ali.
4. Para modo `auto`, siga o procedimento de `references/modos.md` antes de executar qualquer etapa.
5. Despache os agentes auditores donos das etapas selecionadas — ver "Despacho dos cinco agentes auditores" abaixo — numa única mensagem quando mais de um agente estiver envolvido, para rodar em paralelo. Cada agente só lista achados; **peça aprovação do usuário antes de modificar qualquer arquivo**.
6. Para refatorações aprovadas, gere tarefas no formato de `references/templates/task.md`.
7. Gere os três arquivos de saída da Etapa 12 (`report.md`, `achados.json`, `metricas.json`) em `.protocolo/<stamp>/` — ver `references/etapas/12-gate.md` para o formato de cada um e a ordem de consolidação do plano de remediação.

Princípio geral: **achados primeiro, ação depois**. Nunca aplique refatoração em massa sem confirmação por item.

---

## Ordem das 12 etapas — e por que cada uma vem onde vem

A ordem não é arbitrária: cada etapa prepara o terreno para a próxima. Pular a ordem é reintroduzir o problema que a etapa anterior removeu.

| # | Etapa | Por que nessa posição | Arquivo |
|---|---|---|---|
| 1 | Higiene e código morto | Reduz a superfície de análise de todas as etapas seguintes | `references/etapas/01-higiene.md` |
| 2 | Type safety | Tipos guiam as refatorações seguintes; `any` mascara achados das outras etapas | `references/etapas/02-tipos.md` |
| 3 | Separação de responsabilidades | Antes de DRY — abstração sobre código misturado é abstração ruim | `references/etapas/03-separacao.md` |
| 4 | DRY e duplicação | Só agora as abstrações nascem limpas, sobre camadas já separadas | `references/etapas/04-dry.md` |
| 5 | Tratamento de erros e resiliência | Antes de testes/observabilidade — define os caminhos que serão instrumentados | `references/etapas/05-erros.md` |
| 6 | Testes e qualidade de teste | Antes de observabilidade — só faz sentido instrumentar código já testado | `references/etapas/06-testes.md` |
| 7 | Observabilidade | Antes de performance — medir sem observabilidade é medir só local | `references/etapas/07-observabilidade.md` |
| 8 | Camada de dados e migrations | Antes de performance — problema de performance web é, com frequência, problema de query | `references/etapas/08-dados.md` |
| 9 | Performance | Sobre base estrutural estável, já com instrumentação pronta | `references/etapas/09-performance.md` |
| 10 | Acessibilidade | Qualidade de produto final, ao lado das outras auditorias | `references/etapas/10-acessibilidade.md` |
| 11 | Segurança e supply chain | Auditoria, sobre código que não vai mais mudar muito | `references/etapas/11-seguranca.md` |
| 12 | Gate final | Consolidação de tudo, métricas de baseline e decisão go/no-go | `references/etapas/12-gate.md` |

---

## Despacho dos cinco agentes auditores

As etapas 1 a 11 não rodam mais seriais num agente só: rodam como **cinco agentes auditores independentes** em `agents/`, cada um dono de um grupo de etapas e, onde aplicável, de domínios inteiros do núcleo. O mapeamento completo, e o porquê de detecção ser paralela enquanto remediação não é, está em `references/etapas/12-gate.md` — não repetido aqui.

| Agente | Etapas | Domínios do núcleo |
|---|---|---|
| `dd-auditor-codigo` | 1, 2, 3, 4 | — |
| `dd-auditor-resiliencia` | 5, 6, 7 | LOG |
| `dd-auditor-dados` | 8 | LGPD, LGPD-S, TEN |
| `dd-auditor-produto` | 9, 10 | — |
| `dd-auditor-seguranca` | 11 | SEC, DEP, AI |

**Despache os agentes do modo escolhido numa única mensagem**, uma chamada por agente, para que rodem concorrentes — nunca um de cada vez esperando o retorno do anterior. Despacho sequencial anula o motivo de existirem cinco agentes em vez de onze etapas seriais. Invocação cirúrgica de etapa única despacha só o agente dono daquela etapa.

Nenhum agente escreve ou edita: cada um devolve `{ "agente": "<nome>", "achados": [...] }`, com `achados` já no formato de `achados.json` (`references/templates/report.md`). Depois que todos retornarem: concatene os arrays `achados` dos cinco e **ordene o plano de remediação 1 → 12**, nunca pela ordem de chegada das respostas — detecção em paralelo é livre, remediação não é.

---

## Núcleo de checks

Onde uma etapa toca um domínio já coberto por `checks/registry.yaml`, o arquivo da etapa cita o id do check (por exemplo `SEC-006`, `TEN-006`) em vez de repetir o critério. O julgamento de cada id mora uma vez só no guia de julgamento do domínio correspondente dentro de `checks/` (por exemplo `checks/secrets.md`); a etapa aponta pra lá.

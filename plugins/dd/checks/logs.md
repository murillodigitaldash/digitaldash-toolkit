# Logs

Guia de julgamento do dominio `logs`. Cada bloco corresponde a uma entrada
de `registry.yaml` com o mesmo id.

### LOG-001 — Eventos de autenticação não logados

**Por que existe:** sem log de eventos de autenticação (login com sucesso e
com falha, logout, redefinição de senha, desafio de MFA), não existe trilha
para detectar tentativa de força bruta, credential stuffing ou uma conta
comprometida depois do fato — a resposta a incidente não tem o que
reconstruir. Este check é o par técnico do LGPD-007: sem eventos de
autenticação logados, o plano de resposta a incidente não tem dado para
trabalhar.

**Falsos positivos conhecidos:** endpoints de health-check ou readiness que
se autenticam via token de serviço interno não são "eventos de autenticação"
no sentido de segurança do usuário; da mesma forma, cada requisição
autenticada usando uma sessão já estabelecida não precisa gerar uma nova
linha de log — o check cobra o evento de estabelecimento/encerramento da
sessão, não cada requisição que a usa depois.

**Como remediar:** instrumentar tentativa de login (sucesso e falha),
logout, solicitação e conclusão de redefinição de senha, resultado de
desafio de MFA, e elevação de privilégio, registrando identificador do
ator, timestamp, IP de origem e resultado.

**O que NAO conta como resolvido:** logar só os logins com sucesso. As
tentativas com falha são o sinal de segurança de fato (força bruta,
credential stuffing) — logar só o sucesso dá uma trilha de uso legítimo,
mas não permite distinguir um ataque em andamento de tráfego normal.

### LOG-002 — PII bruta em log

**Por que existe:** logar PII crua (CPF, nome completo com endereço, email,
telefone, dado de saúde) faz com que todo lugar por onde aquele log passa
vire um lugar onde PII mora — agregador, backup, ferramenta de observação de
terceiro, laptop de quem está debugando via acesso a log em produção. Isso
multiplica a superfície de um vazamento e transforma a própria retenção de
log em passivo de conformidade sob a LGPD.

**Falsos positivos conhecidos:** logar um identificador mascarado ou
pseudonimizado (últimos 4 dígitos de um CPF, um hash de email usado só para
correlação, um `userId` opaco) não é "PII bruta" — o check é sobre dado
pessoal real e reversível chegando ao fluxo de log, não sobre qualquer
identificador aparecer em uma linha.

**Como remediar:** aplicar redação em nível de campo no próprio logger
(`redact` do `pino`, um scrubber de PII no logger estruturado, um schema de
log que proíbe interpolação livre de objetos de usuário), auditar logs já
emitidos em busca de PII, e configurar retenção/expurgo no agregador
compatível com o que a LGPD exige para aquela categoria de dado.

**O que NAO conta como resolvido:** adicionar redação só na linha de log que
alguém reportou, enquanto o mesmo objeto de usuário continua sendo passado
inteiro para um `logger.error(err)` genérico ou para o middleware de log de
requisição padrão do framework (que despeja `req.body` inteiro) em outro
lugar do código. A maioria dos incidentes reais é descoberta por um dump de
objeto inteiro num handler de erro, não pela linha específica que foi
auditada.

### LOG-003 — Logs não estruturados em produção

**Por que existe:** log não estruturado (interpolação livre de string via
`console.log`/`print`) não pode ser filtrado nem correlacionado de forma
confiável por um agregador — uma investigação de incidente ou uma resposta
a um pedido de titular sob a LGPD que precise achar "todo lugar que logamos
este CPF" vira busca manual em texto livre em vez de consulta a um campo. É
também como PII (LOG-002) entra sem que ninguém perceba: uma linha de texto
livre deixa um objeto inteiro ser interpolado sem nenhum schema para
barrar. O comando segue a convenção do `grep`: sai com código 0 quando
encontra ao menos uma chamada crua de `console.*` no código-fonte da
aplicação (achado, portanto log não estruturado presente) e com código
diferente de zero quando não encontra nenhuma.

**Falsos positivos conhecidos:** um script de CLI ou de build cujo
propósito é imprimir para o terminal (scripts de setup, geradores,
ferramentas de dev local em `scripts/` ou `bin/`) não é "log em produção" —
o check mira o código-fonte que roda como serviço de produção; exclua
diretórios de ferramentas explicitamente na configuração de exceções, não
desligando o check inteiro.

**Como remediar:** adotar uma biblioteca de logging estruturado (`pino`,
`winston` com formato JSON, `structlog`...) e substituir as chamadas cruas
de `console`/`print` nos caminhos de requisição/resposta e de lógica de
negócio por chamadas a ela, configurada para emitir um objeto JSON por
linha com schema fixo (timestamp, nível, mensagem, campos de contexto).

**O que NAO conta como resolvido:** envolver as chamadas de `console.log`
em uma função wrapper (por exemplo um `logger.log` caseiro que só repassa a
mesma string concatenada) que escapa do padrão do `grep` sem de fato emitir
JSON estruturado. Isso faz o comando parar de encontrar o padrão sem que o
problema real — texto livre não parseável — deixe de existir.

### LOG-004 — Ausência de correlação por request ou trace id

**Por que existe:** sem um id de requisição/trace propagado durante o ciclo
de vida de uma requisição (e entre fronteiras de serviço em um sistema
distribuído), reconstruir o que aconteceu durante um incidente vira
correlação manual por timestamp e palpite — em um sistema com tráfego
concorrente isso não é confiável, e é a primeira coisa que quem investiga
precisa quando um usuário reporta "esta ação específica falhou".

**Falsos positivos conhecidos:** um script síncrono de processo único (uma
migração pontual, um job de cron sem execução concorrente) sem nada a
correlacionar pode legitimamente não precisar de trace id — a exceção é
para trabalho em lote interno sem concorrência, não para caminhos
voltados a cliente.

**Como remediar:** gerar um id de requisição (ou ler `X-Request-Id`/
`traceparent` se o cliente já envia) no ponto de entrada de cada
requisição, propagá-lo pelo contexto durante toda a cadeia de chamadas
(incluindo chamadas HTTP/fila downstream), e incluí-lo como campo em toda
linha de log estruturado emitida durante aquela requisição.

**O que NAO conta como resolvido:** gerar o id de requisição e logá-lo só
no middleware de entrada (a linha "requisição recebida") sem propagá-lo
pelo resto da cadeia — jobs em background, chamadas a serviços downstream,
handlers de erro. Quando a falha real acontece três camadas adiante, a
linha de log que importa não carrega o mesmo id da linha do topo, e a
correlação quebra exatamente onde era necessária.

### LOG-005 — Retenção de logs abaixo de 90 dias

**Por que existe:** log costuma ser a única evidência forense disponível
depois de um incidente de segurança ou durante a investigação de uma
reclamação de titular sob a LGPD — muitos ataques são descobertos semanas
depois de acontecerem, e uma janela de retenção abaixo de aproximadamente
90 dias arrisca perder exatamente a evidência necessária até o incidente
ser percebido e investigado.

**Falsos positivos conhecidos:** logs sem relevância de segurança ou
auditoria (debug verboso ligado temporariamente para uma investigação
pontual) podem ter retenção mais curta de forma razoável — o piso de 90
dias vale para logs que importariam para reconstrução de segurança/
auditoria (eventos de autenticação, mudança de permissão, acesso a dado
sensível), não para todo fluxo de log emitido indiscriminadamente.

**Como remediar:** configurar explicitamente a política de retenção do
agregador de logs para pelo menos 90 dias nos fluxos relevantes para
segurança/auditoria (mais tempo quando contrato ou regulação exigir), e
verificar que a retenção padrão da plataforma/fornecedor não ficou
silenciosamente mais curta (muitas plataformas de hosting usam 7 ou 14
dias como padrão).

**O que NAO conta como resolvido:** confirmar que o painel do agregador
mostra "90 dias" como configuração de exibição de uma busca/filtro salvo,
sem checar a retenção de armazenamento/arquivamento configurada de fato no
índice do log. Painel salvo e política de ciclo de vida do índice são
configurados separadamente, e uma política padrão de índice expurgando aos
14 dias descarta o dado silenciosamente, apesar do que a visão salva
mostra.

### LOG-006 — Mudança de permissão sem trilha de auditoria

**Por que existe:** escalonamento de privilégio (um papel de usuário
alterado para admin, uma concessão de política adicionada, a ACL de um
recurso modificada) é um dos eventos de maior valor para ter uma trilha
imutável e atribuível — se não é logado com quem/quando/o-que-mudou, um uso
indevido interno de acesso ou uma conta de admin comprometida que escala
ainda mais não deixa registro para investigar ou reverter com confiança.

**Falsos positivos conhecidos:** mudanças de permissão automatizadas
guiadas por configuração declarativa versionada (papéis de IAM geridos por
IaC aplicados por um pipeline) já têm auditoria via o histórico do git e os
logs do pipeline daquele repositório — o check mira mudanças de permissão
ad-hoc feitas em tempo de execução por uma UI de admin ou chamada de API
fora desse caminho controlado, não todo mecanismo de atribuição de
permissão.

**Como remediar:** emitir uma entrada de log de auditoria no ponto onde a
mudança de permissão é de fato aplicada (não só onde é solicitada),
capturando quem executou, o principal alvo, o estado antes/depois, e o
timestamp — armazenando isso em um repositório apenas-anexo ou
à prova de adulteração, separado dos logs operacionais.

**O que NAO conta como resolvido:** logar apenas a requisição de API que
*inicia* a mudança de permissão (a chamada HTTP para `/users/:id/role`) sem
confirmar que a mudança foi de fato aplicada e sem registrar o estado
resultante. Se a escrita subjacente falha no meio do caminho ou uma
condição de corrida aplica um estado final diferente, a trilha de auditoria
diz que algo aconteceu que pode não corresponder ao que de fato passou a
valer — trilha de auditoria de mudança de permissão precisa registrar o
resultado, não só a intenção.

# Disaster Recovery

Referência do eixo Postura para backup e recuperação de desastre. Nenhum
destes tópicos tem check formal no núcleo hoje. O eixo Release toca backup
de raspão, na Etapa 8 (`references/etapas/08-dados.md`), com uma linha —
"backup recente verificado, restaurado em ambiente de teste" — porque é o
que cabe checar release a release; a profundidade completa (região, RTO/RPO,
imutabilidade, runbook) mora aqui, porque nada disso muda a cada release.
Cada tópico segue **Objetivo**, **Procurar**, **Evidência aceitável** e
**Reportar** — e é aqui que a diferença entre "configurado" e "verificado"
mais importa.

### Backup criptografado em repouso

**Objetivo:** um backup é uma cópia completa dos dados de produção — se
vazar, vaza tudo de uma vez. Cifrado, o vazamento isolado do armazenamento do
backup não expõe o conteúdo.

**Procurar:** a configuração de criptografia em repouso do serviço que
guarda o backup (snapshot de banco, bucket de arquivo, volume).

**Evidência aceitável:** a flag de criptografia confirmada na configuração
real do recurso específico de backup — não a suposição de que "o provedor
cifra tudo por padrão" sem checar aquele recurso individualmente, porque
nem todo recurso herda a configuração padrão da conta.

**Reportar:** recurso de backup × criptografado (sim/não) × chave gerenciada
por quem (provedor ou própria organização).

### Backup em região distinta

**Objetivo:** um desastre regional — datacenter inteiro, zona geográfica —
não pode levar junto o dado de produção e o backup dele.

**Procurar:** a região onde o backup é armazenado, comparada à região dos
dados primários.

**Evidência aceitável:** o nome da região do backup e da região primária,
lidos da configuração real de replicação — regiões diferentes dentro do
mesmo país nem sempre bastam se o provedor as trata como a mesma zona de
falha; o corte relevante é o domínio de falha do provedor, não apenas o
nome da região.

**Reportar:** dado × região primária × região do backup × mesmo domínio de
falha (sim/não).

### Restore efetivamente testado

**Objetivo:** este é o item mais comumente marcado como resolvido sem nunca
ter sido verdade. Um backup que nunca foi restaurado é uma suposição sobre
o futuro, não uma garantia sobre o presente — pode estar corrompido,
incompleto, ou simplesmente não restaurável com o runbook que existe hoje, e
ninguém saberia até precisar dele de verdade.

**Procurar:** o registro do último exercício de restore de fato executado.

**Evidência aceitável (o padrão mais importante deste arquivo):** a resposta
precisa conter as quatro partes a seguir, não apenas uma confirmação, **e a
data precisa cair dentro do ciclo trimestral corrente** — os mesmos ~90 dias
que definem a cadência deste eixo (seção "Cadência" do `SKILL.md`). (1) a
**data** em que o restore foi executado; (2) o **ambiente** onde rodou —
staging ou sandbox isolado, nunca o ambiente de produção; (3) o **escopo
validado** — os dados restaurados estavam íntegros, e a aplicação subiu e
serviu leitura correta a partir deles, não só "o arquivo de backup abriu"; e
(4) **quem executou**. "Backup configurado" sozinho não conta como restore
testado — e um restore que cumpre as quatro partes mas caiu fora do ciclo
corrente também não conta como resolvido: é achado aberto por recência
vencida, com a mesma severidade de nunca ter sido testado. Reportar a data
de um restore de um ciclo anterior como se ela ainda cobrisse o ciclo atual
é exatamente o forever-yes que este eixo existe para fechar — o restore
precisa ser reexecutado a cada ciclo, não apenas redocumentado. Um "sim" sem
essas quatro informações, ou com uma data vencida, é a lacuna que este eixo
existe para fechar — trate-o como achado aberto, não como item resolvido.

**Reportar:** data do último restore testado × dentro do ciclo trimestral
corrente (sim/não) × ambiente × escopo validado × responsável. Se o restore
nunca foi testado, ou se a data mais recente está fora do ciclo corrente,
reportar isso explicitamente como achado — nunca omitir a linha por falta
de dado, e nunca reportar uma data vencida como se resolvesse o ciclo
atual.

### RTO documentado e confrontado com a realidade

**Objetivo:** sem um RTO (Recovery Time Objective) declarado, não existe
como avaliar se o processo de recuperação atual é bom o suficiente para o
negócio — "recuperamos rápido" não é uma meta, é uma opinião.

**Procurar:** o documento ou configuração que declara o RTO alvo para cada
sistema crítico.

**Evidência aceitável:** o valor de RTO alvo (por exemplo, "4 horas") junto
do tempo real observado no último exercício de restore do tópico anterior —
e esse exercício precisa ser o mesmo que satisfaz o corte de recência do
tópico anterior (dentro do ciclo trimestral corrente), não um teste antigo
reaproveitado. Um RTO alvo sem um tempo medido de restore real, ou medido
apenas em um exercício fora do ciclo corrente, é uma meta nunca confrontada
com a realidade atual, o que equivale a não ter meta nenhuma.

**Reportar:** sistema × RTO alvo × tempo observado no último teste dentro do
ciclo corrente × dentro ou fora do alvo.

### RPO documentado e confrontado com a frequência real de backup

**Objetivo:** o RPO (Recovery Point Objective) define quanto dado a
organização aceita perder em um desastre; sem ele declarado, a frequência de
backup configurada é arbitrária, não uma decisão.

**Procurar:** a frequência real de backup comparada ao RPO declarado.

**Evidência aceitável:** o RPO alvo (por exemplo, "15 minutos de dados")
comparado à frequência de backup efetivamente configurada (por exemplo,
snapshot a cada 6 horas) — se a frequência configurada não sustenta o RPO
declarado, isso é o achado, não uma aproximação aceitável por estarem "na
mesma ordem de grandeza".

**Reportar:** sistema × RPO alvo × frequência de backup real × sustenta o
alvo (sim/não).

### Backup imutável (proteção contra ransomware)

**Objetivo:** um backup que pode ser sobrescrito ou apagado pela mesma
credencial que administra o sistema primário está exposto ao mesmo ataque
que comprometeu o primário — inclusive um ransomware que apaga backups de
propósito antes de cifrar o resto.

**Procurar:** retenção imutável (object lock, WORM, ou equivalente) no
armazenamento de backup, e se a credencial de escrita do backup é distinta
da credencial administrativa do sistema primário.

**Evidência aceitável:** a configuração de retenção imutável habilitada no
recurso de backup, com o período de retenção definido, confirmada na
configuração real do provedor — versionamento simples não é evidência
suficiente aqui, porque uma credencial comprometida ainda consegue apagar
todas as versões de um objeto versionado sem lock.

**Reportar:** recurso × imutabilidade habilitada (sim/não) × período de
retenção × credencial de backup isolada da administrativa (sim/não).

### Runbook de DR escrito e testado

**Objetivo:** em um incidente real, ninguém deveria estar inventando o
procedimento de recuperação sob pressão e com o relógio correndo.

**Procurar:** o documento de runbook de disaster recovery, e evidência de
que ele foi exercitado — não apenas escrito e arquivado.

**Evidência aceitável:** a localização do runbook, a data do último
exercício (simulação em mesa ou execução real) e quem participou — e essa
data também precisa cair dentro do ciclo trimestral corrente (os mesmos
~90 dias da cadência deste eixo), pelo mesmo motivo do restore: um exercício
de anos atrás, redocumentado ciclo após ciclo, não prova nada sobre o
runbook de hoje. Um runbook que nunca foi exercitado, ou que só foi
exercitado em um ciclo anterior ao corrente, é um documento de intenção, não
um procedimento validado — reportar essa distinção explicitamente, tratando
o exercício vencido como achado aberto, e nunca tratar "existe" e "foi
testado neste ciclo" como a mesma coisa.

**Reportar:** runbook localizado (sim/não) × data do último exercício ×
dentro do ciclo trimestral corrente (sim/não) × participantes × tipo de
exercício (simulação ou execução real).

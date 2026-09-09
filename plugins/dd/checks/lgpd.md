# LGPD

Guia de julgamento do dominio `lgpd`. Cada bloco corresponde a uma entrada
de `registry.yaml` com o mesmo id. Este arquivo cobre dois grupos: os
checks `LGPD-*` de conformidade geral e a trilha `LGPD-S-*` — os cinco
checks dedicados a dado pessoal sensível (LGPD art. 5º, II), distinguida
apenas pelo prefixo do id, não por um domínio próprio.

### LGPD-001 — PII não mapeada

**Por que existe:** a LGPD (art. 6º, art. 37) exige que o controlador saiba
dizer que dado pessoal trata, para qual finalidade, e por onde ele circula
— sem um mapeamento (um Registro de Operações de Tratamento, ROPA), nenhuma
outra obrigação da lei (exclusão, acesso, retenção, notificação de
incidente) pode ser cumprida de forma confiável, porque não dá para agir
sobre um dado que ninguém inventariou.

**Falsos positivos conhecidos:** campos técnicos que não identificam uma
pessoa isoladamente e nunca são combinados com outro dado (um `sessionId`
aleatório sem vínculo a conta, por exemplo) não entram no mapeamento — o
critério é "pode, sozinho ou combinado com outro dado do sistema,
identificar uma pessoa natural", não "todo campo do tipo string".

**Como remediar:** levantar todos os pontos de coleta (formulários,
integrações, imports), documentar cada campo de dado pessoal com sua
finalidade, base legal, sistemas onde é armazenado/processado e terceiros
que o recebem, mantendo isso em um ROPA vivo, atualizado a cada mudança de
schema ou integração.

**O que NAO conta como resolvido:** criar o documento de mapeamento uma
vez, numa auditoria pontual, sem processo para mantê-lo atualizado. O
sistema muda — uma integração nova, um campo de formulário novo — e o mapa
desatualizado passa a mentir sobre o que é de fato coletado, o que é pior
do que não ter mapa nenhum porque cria falsa confiança.

### LGPD-002 — Política de retenção não implementada

**Por que existe:** a LGPD (arts. 15 e 16) exige que dado pessoal seja
eliminado depois de atingida a finalidade do tratamento ou o fim do prazo
de retenção — mantê-lo indefinidamente sem uma política que dispare a
eliminação viola o princípio da necessidade (art. 6º, III) e amplia a
superfície de exposição em caso de vazamento, porque quanto mais dado
antigo acumulado, mais exposto num incidente.

**Falsos positivos conhecidos:** dado que a lei ou regulação setorial exige
manter por prazo determinado (registro fiscal, dado sob exigência do TSE)
tem retenção legalmente imposta, potencialmente mais longa que "o
necessário para a finalidade original" — não é exceção ao check, mas o
prazo correto documentado é o prazo legal aplicável, nunca indefinido.

**Como remediar:** definir, por categoria de dado pessoal (a partir do
mapeamento do LGPD-001), um prazo de retenção justificado pela finalidade
ou por exigência legal, e implementar o mecanismo automático que executa a
eliminação/anonimização ao fim desse prazo — job agendado, TTL de banco,
política do provedor de storage.

**O que NAO conta como resolvido:** documentar a política de retenção num
documento de conformidade sem implementar o mecanismo técnico que a
executa. Uma política escrita que ninguém automatiza depende de alguém
lembrar de rodar a exclusão manualmente — na prática os dados nunca saem, e
a política vira só um texto que a empresa mostra em auditoria sem refletir
o estado real do banco.

### LGPD-003 — Mecanismo de exclusão do titular ausente

**Por que existe:** a LGPD (art. 18, VI) garante ao titular o direito de
solicitar a eliminação do dado pessoal tratado com seu consentimento — sem
um mecanismo técnico para executar isso (não apenas um canal de contato
para pedir), o sistema não consegue atender ao pedido dentro do prazo
legal, e cada solicitação vira um trabalho manual e arriscado de achar e
apagar dado espalhado pelo sistema.

**Falsos positivos conhecidos:** dado que o titular pediu para excluir, mas
que o sistema é legalmente obrigado a reter por outra base legal (obrigação
legal/regulatória, como registro fiscal ou eleitoral) não precisa de
exclusão completa — a resposta correta é anonimização ou retenção
justificada com comunicação clara ao titular do porquê, não ausência de
mecanismo.

**Como remediar:** implementar um fluxo (endpoint, job, processo
operacional documentado) que localize todos os registros de um titular
identificado a partir do mapeamento de dados (LGPD-001) e execute exclusão
ou anonimização irreversível, incluindo cópias em backup quando
tecnicamente viável, dentro do prazo legal de resposta.

**O que NAO conta como resolvido:** implementar a exclusão só na tabela
principal de usuários (soft ou hard delete do registro de "cliente") sem
cobrir dado derivado/replicado em outro lugar — log com PII (LOG-002),
backup, réplica de leitura, export para BI, cache. O titular pediu exclusão
dos dados dele, não só da linha na tabela `users`.

### LGPD-004 — Direito de acesso e portabilidade ausente

**Por que existe:** a LGPD (art. 18, I e V) garante ao titular o direito de
confirmar a existência de tratamento, acessar seu dado e recebê-lo em
formato estruturado e interoperável para portabilidade — sem um mecanismo
para isso, cada solicitação exige levantamento manual da engenharia, o que
não escala e com frequência não é cumprido dentro do prazo legal de 15
dias.

**Falsos positivos conhecidos:** sistemas em que o próprio titular já tem
acesso de leitura direto e completo ao que o sistema guarda sobre ele (um
painel de "minha conta" que exibe todos os campos coletados) já cumprem a
parte de acesso — falta apenas confirmar que o mesmo conjunto está
disponível em formato exportável (JSON/CSV) para portabilidade.

**Como remediar:** implementar um endpoint ou fluxo operacional que, dado
um titular autenticado/verificado, compile todo o dado pessoal dele
conforme o mapeamento (LGPD-001) em formato estruturado exportável (JSON é
o padrão comum), disponibilizado dentro do prazo legal de resposta.

**O que NAO conta como resolvido:** expor um export que cobre só os campos
do cadastro principal (nome, email, telefone) e ignora dado derivado de
comportamento/uso do sistema — histórico de ações, dado inferido, campos
preenchidos por outras funcionalidades. Portabilidade cobre o dado pessoal
tratado, não só o que aparece na tela de perfil.

### LGPD-005 — Ambiente não produtivo com dado real

**Por que existe:** ambiente de desenvolvimento, staging e homologação
normalmente tem controle de acesso mais fraco, mais gente com acesso
(incluindo terceiro/freelancer) e log mais verboso do que produção — copiar
dado real para lá multiplica a exposição de PII sem o controle que existe
em produção, e é uma das causas mais comuns de vazamento em auditorias
reais.

**Falsos positivos conhecidos:** um ambiente de staging com controle de
acesso e monitoramento equivalentes aos de produção (mesma política de
rede, mesmo IAM, mesma cobertura de auditoria), usado deliberadamente para
teste final pré-release com um subconjunto pequeno e autorizado de dado
real, pode ser uma exceção documentada — o critério é o nível de controle
do ambiente, não o nome dele.

**Como remediar:** substituir dado real em ambiente não produtivo por dado
sintético ou anonimizado/mascarado de forma irreversível (nome, CPF, email,
telefone gerados ou embaralhados), automatizando esse processo no pipeline
de seed/refresh desses ambientes para não depender de alguém lembrar.

**O que NAO conta como resolvido:** mascarar só os campos mais óbvios (CPF,
email) num script de seed, deixando campo de texto livre (observação, campo
de formulário customizado, comentário) que também pode conter PII digitada
por usuário real. Mascaramento parcial ainda deixa dado pessoal real no
ambiente — a superfície só parece menor.

### LGPD-006 — Sub-processadores não listados

**Por que existe:** a LGPD (art. 39) e a exigência de informar ao titular
quem trata seu dado em nome do controlador tornam necessário manter uma
lista atualizada de todo sub-processador (provedor de hosting, serviço de
email transacional, gateway de pagamento, ferramenta de analytics, provedor
de IA) que recebe ou processa dado pessoal — sem essa lista, o controlador
não consegue responder a uma auditoria, a um titular, ou avaliar o próprio
risco de um vazamento em cadeia por um fornecedor.

**Falsos positivos conhecidos:** ferramenta interna que nunca recebe dado
pessoal (um serviço de build, um linter, um gerenciador de tarefas do time
sem dado de titular) não é sub-processador para efeito deste check — o
critério é receber ou processar dado pessoal do titular final, não
"qualquer fornecedor que a empresa usa".

**Como remediar:** levantar todo serviço terceiro que recebe dado pessoal
(cruzando com o mapeamento do LGPD-001, olhando para onde cada dado é
enviado), documentar cada um com finalidade, dado compartilhado e
localização do processamento, mantendo a lista acessível para inclusão na
política de privacidade e para resposta a auditoria.

**O que NAO conta como resolvido:** listar os sub-processadores óbvios e de
maior porte (o provedor de cloud, o gateway de pagamento) e deixar de fora
integração adicionada depois por um time de produto ou marketing sem passar
pelo processo de revisão — uma ferramenta de analytics ou um webhook de
automação adicionados via configuração de front-end, sem revisão de
segurança, são exatamente o tipo de sub-processador que costuma faltar na
lista.

### LGPD-007 — Plano de resposta a incidente de dados ausente

**Por que existe:** a LGPD (art. 48) exige comunicação à ANPD e ao titular
em caso de incidente de segurança que possa acarretar risco ou dano
relevante, dentro de prazo razoável — sem um plano de resposta definido
antes do incidente acontecer, a primeira vez que o time descobre o que
precisa ser feito é sob pressão, no meio de uma crise real, o que
tipicamente resulta em comunicação tardia, mal formulada ou omissa, cada
uma delas um problema legal adicional em cima do incidente original.

**Falsos positivos conhecidos:** um plano de resposta a incidente de
segurança genérico (SOC, runbook de infraestrutura) que não distingue
"incidente de dado pessoal" como categoria própria, com prazo e
destinatário de notificação próprios (ANPD, titular), não cobre a
obrigação — a resposta técnica a um incidente e a resposta regulatória de
proteção de dados são processos relacionados, mas com gatilho e responsável
diferentes.

**Como remediar:** documentar um plano específico para incidente envolvendo
dado pessoal — critério de classificação de severidade/risco ao titular,
responsável interno, prazo e canal de comunicação à ANPD, modelo de
comunicação ao titular, e checklist de contenção/investigação — e testá-lo
pelo menos uma vez por ano via simulação (tabletop exercise).

**O que NAO conta como resolvido:** escrever o documento do plano e nunca
testá-lo. Um plano nunca exercitado costuma ter lacuna óbvia só visível na
prática (ninguém sabe quem tem acesso para revogar credencial rapidamente,
o modelo de comunicação nunca foi revisado pelo jurídico) que só aparece
durante um incidente real — tarde demais para corrigir dentro do prazo de
notificação.

### LGPD-S-001 — Dado sensível sem base legal do art. 11 documentada

**Por que existe:** opinião política é dado pessoal sensível pela LGPD art.
5º, II, junto com convicção religiosa, filiação a sindicato ou organização
de caráter religioso/filosófico/político, dado de saúde ou vida sexual, e
dado genético/biométrico vinculado a pessoa natural. O tratamento de dado
sensível só pode se apoiar nas bases legais do art. 11 — uma lista fechada
e mais restrita que a do art. 7º, que **notavelmente exclui legítimo
interesse**. Um sistema de campanha eleitoral trata opinião política — de
eleitor, apoiador e militância — como dado central da própria operação, não
como exceção; presumir que a base legal genérica que sustenta o resto do
sistema (legítimo interesse, execução de contrato) também cobre esse dado é
o erro mais comum e mais grave nesta categoria, porque legítimo interesse
simplesmente não está entre as bases disponíveis para dado sensível.

**Falsos positivos conhecidos:** dado sobre posição política de uma figura
pública tratado exclusivamente em conteúdo editorial/jornalístico (uma nota
de imprensa citando a posição pública de um outro candidato, por exemplo)
pode se apoiar em hipótese distinta prevista no próprio art. 11 — mas isso
exige registro explícito de qual inciso se aplica e por quê, não a simples
ausência de dado sensível tratado.

**Como remediar:** para cada fluxo que coleta ou trata opinião política,
filiação partidária ou outro dado sensível do art. 5º, II, identificar e
documentar explicitamente qual inciso do art. 11 fundamenta o tratamento —
na prática, a base mais aplicável a dado de eleitor/apoiador é o
consentimento específico e destacado (art. 11, I), tratado no LGPD-S-002 —
registrando essa análise por finalidade no ROPA do LGPD-001.

**O que NAO conta como resolvido:** documentar "base legal: legítimo
interesse" (ou "interesse legítimo da campanha") para dado sensível — essa
base simplesmente não está disponível sob o art. 11; qualquer análise que
chegue a essa conclusão está juridicamente errada e precisa ser refeita, não
apenas registrada. Também não conta apontar para a base legal genérica já
documentada para o restante do sistema (execução de contrato, cumprimento
de obrigação legal do tratamento comum) sem uma análise específica do dado
sensível em si.

### LGPD-S-002 — Consentimento específico e destacado ausente

**Por que existe:** quando a base legal escolhida para dado sensível é o
consentimento (art. 11, I), a lei exige que ele seja específico e
destacado — não pode estar embutido num "aceito os termos de uso" genérico,
nem inferido de uma ação de outro propósito (se cadastrar numa newsletter
não é consentir com o tratamento de opinião política, mesmo que o
formulário pergunte a filiação partidária na mesma tela).

**Falsos positivos conhecidos:** um fluxo que pede consentimento específico
e destacado para mais de uma categoria de dado sensível ao mesmo tempo
(opinião política e dado de saúde, por exemplo) não viola o check por
agrupar as perguntas na mesma tela — desde que cada categoria tenha sua
própria caixa de confirmação/toggle e possa ser recusada independentemente,
"destacado" é sobre a distinguibilidade da escolha, não sobre estar numa
tela isolada.

**Como remediar:** implementar uma tela ou componente de consentimento
separado do restante do cadastro, com texto específico nomeando o dado
sensível e a finalidade do tratamento, uma ação afirmativa distinta
(checkbox não pré-marcado) por categoria de dado sensível, e registro
auditável de quando e para qual versão do texto o titular consentiu.

**O que NAO conta como resolvido:** adicionar uma frase sobre "opinião
política" dentro do texto corrido dos Termos de Uso gerais, mesmo que o
titular precise marcar "li e aceito" para se cadastrar. Isso continua sendo
consentimento genérico embutido, não específico e destacado — a pessoa
aceitou o pacote inteiro, não fez uma escolha visível e isolada sobre o
dado sensível.

### LGPD-S-003 — Dado sensível sem minimização por finalidade

**Por que existe:** mesmo com base legal válida, o princípio da necessidade
(art. 6º, III) exige que o tratamento de dado sensível se limite ao mínimo
necessário para a finalidade declarada — coletar ou reter opinião política
em granularidade maior do que a finalidade exige (por exemplo, guardar a
posição detalhada sobre cada pauta quando a finalidade é só segmentar
apoiador/indeciso/opositor) amplia o dano de um eventual vazamento sem
ganho correspondente.

**Falsos positivos conhecidos:** um sistema de inteligência de campanha
cuja finalidade declarada e consentida é justamente análise fina de
posicionamento por tema (não apenas segmentação binária) legitimamente
precisa de granularidade maior — o check não é sobre "quanto detalhe é
aceitável" em abstrato, é sobre se a granularidade coletada corresponde à
finalidade documentada e consentida para aquele dado.

**Como remediar:** revisar, para cada campo de dado sensível coletado, se a
finalidade documentada (LGPD-001/LGPD-S-001) realmente exige aquele nível
de detalhe, reduzir para o mínimo necessário (agregar, categorizar, ou
descartar granularidade excedente), e aplicar essa minimização também em
pipeline de exportação/analytics que copia o dado bruto para fora do
sistema principal.

**O que NAO conta como resolvido:** minimizar o dado exibido na interface
do usuário (mostrar só a categoria agregada na tela) enquanto o banco de
dados e os relatórios/exports internos continuam guardando e circulando o
dado bruto em granularidade completa. Minimização de tratamento é sobre o
que é coletado, armazenado e processado, não sobre o que é renderizado na
tela.

### LGPD-S-004 — Compartilhamento de dado sensível sem contrato

**Por que existe:** compartilhar dado sensível com um terceiro (fornecedor
de SMS/WhatsApp para disparo segmentado por posicionamento político, uma
agência de mídia paga que recebe a lista de opinião política para
targeting, um provedor de analytics) sem um contrato que imponha as mesmas
obrigações de proteção e limite de uso deixa o controlador sem controle
sobre o que o terceiro faz com o dado depois de recebê-lo, e sem
responsabilização contratual em caso de uso indevido ou vazamento do lado
dele.

**Falsos positivos conhecidos:** compartilhamento agregado e anonimizado
(um relatório de "35% dos contatados se declaram indecisos", sem vínculo a
indivíduo identificável) não é compartilhamento de dado pessoal sensível —
deixa de existir dado pessoal quando a agregação é irreversível e não
permite reidentificação; o check é sobre dado no nível do indivíduo.

**Como remediar:** para cada terceiro que recebe dado sensível no nível do
indivíduo, formalizar um contrato (DPA — Data Processing Agreement, ou
cláusula específica no contrato comercial) que defina finalidade
autorizada, obrigação de segurança, proibição de uso secundário, e
prazo/forma de eliminação ao fim do contrato — antes do primeiro envio de
dado, não depois.

**O que NAO conta como resolvido:** assinar um contrato comercial genérico
com o fornecedor (o contrato de prestação de serviço de disparo de SMS, por
exemplo) que não menciona proteção de dado pessoal nem dado sensível
especificamente. Um contrato comercial sem cláusula de proteção de dados
não cria a obrigação que o check busca — é preciso a cláusula específica
(ou um DPA anexo), não qualquer contrato com aquele fornecedor.

### LGPD-S-005 — Retenção de dado sensível igual a de dado comum

**Por que existe:** dado sensível carrega dano potencial maior em caso de
vazamento (discriminação, perseguição política, constrangimento público) do
que a maior parte do dado comum — aplicar a mesma política de retenção
genérica do restante do sistema a ele ignora essa assimetria de risco; o
padrão esperado é retenção igual ou mais curta que a do dado comum, nunca
mais longa, e com frequência atrelada de forma mais estrita à duração da
finalidade específica (por exemplo, a janela da campanha eleitoral).

**Falsos positivos conhecidos:** reter dado sensível pelo mesmo prazo do
dado comum não é automaticamente uma falha quando esse prazo já é curto e
justificado pela finalidade específica do dado sensível (não herdado por
padrão do prazo genérico do sistema) — o problema é a retenção ter sido
definida sem considerar o dado sensível separadamente, não necessariamente
o número de dias coincidir.

**Como remediar:** definir uma política de retenção específica para cada
categoria de dado sensível mapeada (LGPD-001/LGPD-S-001), justificada pela
finalidade e, tipicamente, limitada ao ciclo da campanha ou processo que a
coletou, implementando o mecanismo de eliminação/anonimização
correspondente (o mesmo mecanismo técnico do LGPD-002, aplicado com o prazo
específico do dado sensível).

**O que NAO conta como resolvido:** apontar para a política de retenção
geral do sistema (LGPD-002) como se ela já cobrisse o dado sensível, sem
uma decisão documentada de que aquele prazo foi avaliado especificamente
para o risco do dado sensível. "Já temos política de retenção" não responde
a este check — a pergunta é se o dado sensível foi avaliado à parte, com um
prazo que reflita seu risco maior, não se herdou passivamente o prazo do
resto do sistema.

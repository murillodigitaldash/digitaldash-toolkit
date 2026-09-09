# Tenant

Guia de julgamento do dominio `tenant`. Cada bloco corresponde a uma
entrada de `registry.yaml` com o mesmo id. Este núcleo existe porque o
sistema para o qual este plugin foi construído guarda campanhas políticas
concorrentes em um único banco de dados — um IDOR entre tenants (uma
campanha lendo ou escrevendo dado de outra) é o pior resultado crível desse
sistema, e nenhum scanner genérico o encontra sozinho: a chave de tenant não
segue uma convenção única no código (ver `TEN-003`), então não existe um
único grep capaz de provar que o isolamento vale para toda rota.

### TEN-001 — Filtro de tenant derivado de parâmetro da requisição

**Por que existe:** este é o check mais valioso do núcleo. Se o filtro de
tenant de uma rota vem de um valor que o próprio requisitante controla (um
`:campanhaId` de URL, um campo de body, um query param), qualquer usuário
autenticado de qualquer campanha pode trocar esse valor e ler ou escrever
dado de uma campanha rival — em um sistema que hospeda campanhas
concorrentes, isso não é um bug de conveniência, é o incidente mais grave
que o produto pode causar. Como não existe uma convenção única de nome para
a chave de tenant (`TEN-003`), não há grep que prove isolamento: a única
forma confiável de verificar é uma auditoria rota a rota. O procedimento é
este — para **cada** rota que lê ou escreve dado com escopo de tenant,
identifique de onde vem, no código, o identificador de tenant realmente
usado no filtro da consulta (a cláusula `WHERE`/`.find`/`.filter`, não a
assinatura da função), e classifique-a em exatamente uma das três
categorias abaixo:

1. **Derivado do token** (correto) — o identificador vem de algo que o
   servidor colocou no token/sessão durante a autenticação (por exemplo
   `req.usuario.campanhaId`, populado a partir da claim do JWT), nunca de
   `req.params`, `req.query` ou `req.body`.
2. **Derivado de parâmetro com verificação de vínculo** (aceitável) — o
   identificador vem de `req.params`/`req.query`/`req.body`, mas antes de
   ser usado em qualquer leitura ou escrita, o código compara
   explicitamente esse valor contra o tenant do token (ou contra uma
   tabela de vínculo, ver `TEN-005`) e rejeita a requisição em caso de
   divergência. Essa verificação precisa estar visível no código da rota
   ou de um middleware que a antecede diretamente — não vale presumi-la.
3. **Derivado de parâmetro sem verificação** (violação) — o identificador
   vem de `req.params`/`req.query`/`req.body` e é usado direto na consulta,
   sem nenhuma comparação contra o token antes disso.

**Falsos positivos conhecidos:** uma rota que recebe `campanhaId` na URL por
motivo de legibilidade/REST (`/campanhas/:campanhaId/candidatos`), mas cujo
filtro real na consulta usa `req.usuario.campanhaId` do token — o parâmetro
aparece no código-fonte e um grep ingênuo por `req.params.campanhaId`
acusaria a rota, mas se esse valor nunca chega à consulta, a rota é
categoria 1, não violação. Da mesma forma, uma rota exclusivamente
administrativa/de plataforma (um painel interno que lista todas as
campanhas cadastradas, usado só pelo time da Digital Dash) não é um caso de
`TEN-001`: ali não existe "o tenant certo" a filtrar porque a operação é
intencionalmente cross-tenant, controlada por um papel de acesso distinto
(`TEN-005`), não pelo filtro de tenant em si.

**Como remediar:** antes de corrigir qualquer rota, monte o inventário que
a auditoria do `TEN-001` vai percorrer: varra o diretório de rotas por
registros de roteador (`router.get`, `router.post`, `router.put`,
`router.patch`, `router.delete` e, para rotas registradas direto no app,
`app.<método>`) e trate essa lista como o denominador — toda rota que
existe hoje no roteador, não toda rota tocada no diff atual, o mesmo
princípio de cobertura que o check já aplica em *O que NAO conta como
resolvido*. Feito o levantamento, trocar a origem do identificador para o
token sempre que a arquitetura da rota permitir (categoria 1). Quando o identificador
precisa mesmo vir de um parâmetro (URLs aninhadas, integrações externas),
adicionar uma verificação explícita de vínculo antes de qualquer uso — de
preferência como middleware que roda antes do handler e retorna 403/404 em
caso de divergência — e, como defesa em profundidade, manter a consulta em
si filtrando pelo valor do token, não pelo parâmetro, mesmo depois de
validado.

**O que NAO conta como resolvido:** auditar apenas as rotas alteradas no
diff atual (ou tocadas por uma PR específica) e classificar todas como
corretas. Isso não resolve `TEN-002`: a cobertura desses dois checks é
medida por rota existente no roteador, não por rota tocada em uma mudança —
uma rota antiga, nunca revisada, que deriva o tenant de um parâmetro sem
verificação continua sendo uma violação ativa mesmo que ninguém a tenha
tocado recentemente. Também não conta classificar uma rota como categoria 2
só porque ela contém alguma verificação com "cara" de vínculo, sem
confirmar que essa verificação de fato compara o tenant do parâmetro contra
o tenant do token (ou uma tabela de vínculo real) antes de qualquer leitura
ou escrita — uma verificação decorativa (loga a divergência mas segue
executando a consulta) equivale, na prática, à categoria 3.

### TEN-002 — Rota sem filtro de tenant

**Por que existe:** é o par de cobertura do `TEN-001` — aquele check avalia
se a *origem* do filtro está correta; este avalia se um filtro *existe*.
Uma rota que lê ou escreve dado com escopo de tenant sem filtro nenhum é
mais grave que uma rota com filtro mal derivado: não há nem uma condição
errada para explorar, qualquer usuário autenticado de qualquer campanha já
recebe (ou altera) o dado de todas as campanhas por padrão. O procedimento
de auditoria é o mesmo do `TEN-001` — passar por cada rota existente do
roteador que toca em dado com escopo de tenant e confirmar que alguma
cláusula de filtro está presente, antes mesmo de avaliar de onde ela vem.

**Falsos positivos conhecidos:** rotas que servem dado genuinamente
compartilhado por todas as campanhas (lista de municípios, partidos
políticos, cargos eletivos — tabelas de referência sem coluna de tenant)
não precisam de filtro porque não há dado de tenant ali para vazar. O mesmo
vale para endpoints públicos sem dado nenhum (health check, página de
login) e para as rotas administrativas/de plataforma já descritas em
`TEN-001`, cuja ausência de filtro de tenant é intencional e coberta por um
papel de acesso distinto, não uma omissão.

**Como remediar:** adicionar o filtro de tenant à consulta, derivado do
token conforme a categoria 1 do `TEN-001`, e cobrir a correção com um teste
de regressão de isolamento (`TEN-006`) para que um refactor futuro não a
remova sem que ninguém perceba.

**O que NAO conta como resolvido:** corrigir apenas o endpoint de listagem
principal do recurso (`GET /candidatos`) e deixar de auditar endpoints
secundários do mesmo recurso que reusam o mesmo dado por uma consulta
separada — exportação, contagem/estatística, webhook — cada um é uma rota
própria e precisa da mesma verificação individual. E, como no `TEN-001`,
auditar somente as rotas tocadas no diff atual não resolve o check: a
cobertura é por rota existente no roteador, não por rota tocada na mudança.

### TEN-003 — Chave de tenant sem convenção única no código

**Por que existe:** é exatamente a razão pela qual `TEN-001` e `TEN-002`
não podem ser checks mecânicos — se o identificador de tenant tem mais de
um nome espalhado pelo código (`campanhaId` na rota, `tenant_id` na coluna,
`contaId` em outro módulo), não existe um único padrão de grep capaz de
confirmar "toda consulta filtra por tenant", porque não há um único nome
para procurar. Este check é mecânico e de coleta de evidência, não de
julgamento sobre uma rota específica: ele lista, em ordem de frequência,
todo identificador do código que termina em `_id`/`Id`, para que fique
visível quantas variações distintas de "chave de tenant" convivem no
projeto.

O comando espera um placeholder `{{dir_rotas}}` no lugar do diretório onde
vivem as rotas/handlers do projeto (por exemplo `src/routes` ou
`backend/src/controllers`) — **nada na v0.1 deste plugin substitui esse
placeholder automaticamente**; quem for executar o check troca
`{{dir_rotas}}` manualmente pelo caminho real antes de rodar. O comando não
é autoexecutável como está escrito no `registry.yaml`. Quanto ao código de
saída: a última etapa do pipeline é `sort -rn`, que sai com 0 sempre que
consegue ler sua entrada (inclusive uma entrada vazia) — o comando sai
diferente de zero só em caso de erro de execução (diretório inexistente,
por exemplo), nunca como sinal de "achou" ou "não achou" um problema. É
evidência para leitura humana, não um portão de aprovação/reprovação.

**Falsos positivos conhecidos:** a maior parte da lista de frequência vai
ser identificador comum, sem relação nenhuma com tenant — chave estrangeira
normal (`candidatoId`, `usuarioId`, `municipioId`) ou identificador
primário de outra entidade. Isso não é, sozinho, evidência de problema: o
sinal a procurar é especificamente mais de uma grafia distinta plausível
para "a chave de escopo de tenant/campanha" (`campanhaId`, `tenantId`,
`contaId` coexistindo), não qualquer entrada da lista.

**Como remediar:** escolher um nome canônico único para a chave de tenant
válido em todas as camadas — parâmetro de rota, campo do objeto de
requisição, campo do model/ORM, coluna do banco — e migrar toda ocorrência
das grafias alternativas para ele, documentando o nome escolhido no
README/CONTRIBUTING do projeto para que código novo não reintroduza uma
segunda grafia.

**O que NAO conta como resolvido:** renomear a chave só na camada mais
externa (o parâmetro de rota, por exemplo) enquanto a coluna do banco, o
campo do ORM ou uma função de serviço interna seguem usando um nome
diferente, com um passo de tradução entre um e outro. A inconsistência (e o
risco de alguém esquecer um dos pontos de tradução) continua existindo — a
convergência precisa alcançar a cláusula de filtro de fato, não só o nome
do parâmetro de entrada. Também não conta documentar em um comentário que
"os dois nomes significam a mesma coisa" em vez de unificá-los: uma
inconsistência documentada ainda é uma inconsistência, e o propósito do
check é eliminar a necessidade de lembrar o mapeamento.

### TEN-004 — Tabela com dado de tenant sem política de acesso por linha

**Por que existe:** o filtro de tenant na camada de aplicação (`TEN-001`,
`TEN-002`) depende de todo caminho de código lembrar de aplicá-lo — um Row
Level Security (RLS) do Postgres/Supabase habilitado na tabela é uma
segunda camada que protege mesmo quando a aplicação esquece: a política
roda no banco, não no handler. Sem RLS, um único endpoint (ou uma única
query administrativa, um script de manutenção, uma migração de dados
malfeita) que esqueça o filtro já expõe a tabela inteira entre tenants,
sem nenhuma rede de segurança abaixo dela.

Este comando apenas coleta evidência — ele não decide nada. Imprime duas
listas e sempre sai com código **0**, independentemente do que encontrar:
"tabelas", toda tabela criada por um `CREATE TABLE` em qualquer arquivo
`.sql` do projeto; e "RLS habilitado", toda tabela alvo de um
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Ele não funciona como um
portão de aprovação/reprovação — comparar as duas listas e nomear as
tabelas que aparecem na primeira e não na segunda é trabalho do agente
lendo a saída, não do exit code. Um comando booleano aqui seria pior que
nenhum comando: a forma óbvia de decidir isso automaticamente (existe
tabela com formato de chave de tenant E não existe RLS em lugar nenhum)
tem granularidade de repositório, não de tabela — um único
`ENABLE ROW LEVEL SECURITY` em qualquer arquivo do projeto silenciaria um
check `critica` sobre cobertura por tabela.

**Falsos positivos conhecidos:** uma tabela que aparece na lista
"tabelas" pode não guardar dado de tenant nenhum — uma tabela de
referência/lookup compartilhada entre todas as campanhas (lista global de
partidos, lista de cargos eletivos, municípios) ou uma tabela de
bookkeeping da própria infraestrutura de migração (a tabela de controle de
versão do schema, por exemplo). Essas tabelas legitimamente não precisam
de política por linha, e sua ausência na lista "RLS habilitado" não é, por
si só, uma violação — é o agente, olhando o schema, quem decide se a
tabela guarda dado de campanha ou não antes de cobrá-la. E projetos cujo
banco não é Postgres/Supabase simplesmente não têm RLS como recurso —
nesse caso a proteção de isolamento por linha não é aplicável por este
mecanismo específico, e a garantia recai inteiramente sobre
`TEN-001`/`TEN-002`.

**Como remediar:** para toda tabela que armazena dado com escopo de uma
única campanha/tenant, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` mais ao
menos uma `CREATE POLICY` que filtre as linhas comparando a coluna de
tenant da tabela contra um valor definido por sessão/conexão (por exemplo
`current_setting` do Postgres ou a claim do JWT via `auth.jwt()` no
Supabase) — RLS como defesa em profundidade complementar ao filtro de
aplicação, nunca como substituto dele.

**O que NAO conta como resolvido:** habilitar `ENABLE ROW LEVEL SECURITY`
sem criar nenhuma política de fato deixa a tabela em negação total — trava
o acesso em vez de protegê-lo, o que costuma ser "corrigido" adicionando
uma política `USING (true)` para destravar a aplicação, que é igualmente
falho: deixa a tabela tão exposta quanto sem RLS nenhum, só que com
aparência de estar protegida. Também não conta habilitar RLS em algumas
das tabelas com dado de tenant enquanto a comparação entre as duas listas
ainda mostra outras descobertas — isso não é remediação, é um passe
parcial com aparência de concluído. E não conta tratar a saída deste
comando como um veredito: ele sempre sai com código 0, sucesso ou não —
o estado realmente limpo exige levantar todas as tabelas com dado de
tenant (cruzando com a evidência do `TEN-003` e descartando as exceções da
seção acima) e confirmar, individualmente, que cada uma tem RLS habilitado
**e** uma política que filtra de fato.

### TEN-005 — Papel de acesso cruzado sem verificação de vínculo

**Por que existe:** nem todo papel de acesso é escopado a um único tenant —
um coordenador pode supervisionar mais de um município dentro da mesma
campanha, um papel de suporte pode atender mais de uma campanha cliente.
Para esses papéis, a checagem de `TEN-001` (token tem um único tenant, ele
bate com o da consulta) não é suficiente, porque a relação é muitos-para-
muitos: o dado que autoriza o acesso não é "o tenant do token", é "existe
um vínculo ativo entre este usuário e este recurso específico". Checar
apenas o nome do papel (`if (usuario.papel === 'coordenador')`) sem checar
o vínculo concreto deixa qualquer usuário com aquele papel alcançar
**qualquer** instância do recurso, não só as que lhe foram atribuídas.

**Falsos positivos conhecidos:** um papel genuinamente global/interno da
plataforma (não um papel de campanha), que por desenho não tem — e não
precisa ter — uma tabela de vínculo, não é violação deste check: não existe
conceito de vínculo a checar para esse papel. Também não é violação quando
a checagem de vínculo é feita via `JOIN` na própria consulta contra a
tabela de vínculo, em vez de um `if` explícito separado no código de
aplicação — o que importa é se a restrição é de fato aplicada antes do
dado retornar, não a forma sintática de como ela é expressa.

**Como remediar:** para toda rota alcançável por um papel de acesso
cruzado, adicionar uma verificação explícita — em middleware ou na própria
consulta — de que existe um registro de vínculo ativo ligando o usuário
autenticado (pelo id do token) ao recurso específico sendo acessado ou
alterado, nunca confiando apenas no nome do papel e nunca aceitando um id
de escopo vindo de parâmetro de requisição sem confirmar que o vínculo
existe para ele.

**O que NAO conta como resolvido:** checar o vínculo só no momento do login
(por exemplo, popular uma claim no token a partir do vínculo vigente
naquele instante) e confiar nessa claim pelo resto da sessão sem
reverificar a cada acesso ao recurso — um vínculo pode ser revogado no meio
da sessão (um coordenador removido de um município), e a claim obtida no
login continua concedendo acesso até o token expirar ou ser renovado.
Também não conta checar o vínculo nas rotas principais de CRUD do recurso e
deixar de fazê-lo em rotas secundárias do mesmo recurso adicionadas depois
(exportação, ação em lote) que reusam o mesmo dado.

### TEN-006 — Teste de regressão de isolamento ausente

**Por que existe:** `TEN-001`, `TEN-002` e `TEN-005` encontram violações de
isolamento existentes hoje através de auditoria manual — mas uma auditoria,
por mais completa que seja em um determinado momento, não impede que um
refactor futuro reintroduza exatamente o mesmo bug em uma rota que já tinha
sido corrigida. Sem uma suíte de regressão dedicada especificamente a
isolamento entre tenants, cada correção de `TEN-001`/`TEN-002`/`TEN-005`
depende de alguém lembrar de reauditar manualmente a cada mudança — o que,
na prática, não acontece de forma consistente.

**Falsos positivos conhecidos:** um teste cujo nome, `describe` ou arquivo
não usa nenhuma das palavras "isolamento", "tenant" ou "cross-tenant" pode,
ainda assim, ser cobertura real — o que importa é o que o corpo do teste
afirma, não o vocabulário do título. Por exemplo, em um arquivo
Jest/Supertest chamado `candidatos.spec.js`, um teste declarado como
`it('retorna 404 para candidato de outra campanha', ...)` dentro de
`describe('GET /candidatos/:id')`, que provisiona uma segunda campanha só
para o teste, autentica com o token da campanha principal
(`Authorization: Bearer ${tokenCampanhaA}`) e faz
``request(app).get(`/candidatos/${candidatoDaCampanhaB.id}`).expect(404)`` —
está testando exatamente a negação de acesso cross-tenant que o check
exige, embora nada no nome do teste sugira isso. Uma auditoria rasa que
busca por essas três palavras nos arquivos de teste
(`grep -ri 'isolamento\|tenant\|cross-tenant' **/*.spec.js`) não encontra
esse teste e conclui, erradamente, que não existe cobertura de isolamento
— quando ela existe, só está descrita com outro vocabulário. A verificação
correta exige ler o corpo dos testes que já tocam nos mesmos recursos, não
só buscar por palavras-chave nos nomes.

**Como remediar:** escrever e manter uma suíte de regressão explícita que,
para cada tipo de recurso com escopo de tenant, provisione ao menos duas
campanhas com dado próprio, autentique como a campanha A, e afirme que toda
tentativa de ler/escrever/listar dado da campanha B (por id direto, por
endpoint de listagem, por exportação) é rejeitada ou retorna vazio —
executando essa suíte a cada release.

**O que NAO conta como resolvido:** uma suíte de ponta a ponta geral que
usa duas contas de teste diferentes em testes distintos — por exemplo,
para testar dois papéis de acesso diferentes — não conta, por si só, como
cobertura de isolamento: o critério não é "os testes usam mais de um
tenant nos fixtures", é "algum teste afirma explicitamente que a conta A
não consegue ler nem escrever dado da conta B". Também não conta uma
suíte que só reexecuta o caminho feliz da correção de UM incidente
específico já reportado, em vez de iterar sobre o inventário completo de
rotas — o mesmo princípio de cobertura do `TEN-001`/`TEN-002` (por rota
existente, não por incidente já corrigido) vale aqui: uma suíte que só
retesta o bug de ontem não protege as rotas que ainda não quebraram.

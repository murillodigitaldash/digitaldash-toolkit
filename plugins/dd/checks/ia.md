# IA

Guia de julgamento do dominio `ia`. Cada bloco corresponde a uma entrada de
`registry.yaml` com o mesmo id. Cobre o tooling que dá a um agente de
codificação acesso a sistemas reais — servidores MCP (`.mcp.json`), plugins
e skills de terceiro, permissões de execução (`.claude/`, `.agents/`) e
arquivos que instruem o comportamento do próprio agente. Nenhum desses
checks existia nos dois protocolos anteriores da empresa: são a evolução
real deste núcleo, não uma reorganização de material antigo.

### AI-001 — Servidor MCP declarado sem inventário de acesso

**Por que existe:** um servidor MCP declarado (em `.mcp.json` ou
equivalente) dá ao agente um conjunto de ferramentas capazes de ler e
escrever sistemas reais — filesystem, banco de dados, API externa,
navegador. Sem um inventário explícito do que cada servidor declarado
realmente alcança (qual credencial ele usa, qual o escopo dessa credencial,
quais sistemas ficam acessíveis), ninguém consegue raciocinar sobre o raio
de alcance real do agente — "temos um servidor MCP do Supabase" não diz se
o token por trás dele é de um projeto de desenvolvimento ou de produção com
permissão de administrador.

**Falsos positivos conhecidos:** um servidor MCP puramente local,
somente-leitura, sem nenhum acesso a rede ou credencial externa (por
exemplo, um servidor de referência/documentação que só lê arquivos
estáticos empacotados) não precisa de um inventário elaborado além de
"local, somente-leitura, sem credencial" — a profundidade da documentação
deve ser proporcional ao raio de alcance real do servidor, não aplicada de
forma uniforme a todos independentemente do risco.

**Como remediar:** para cada servidor MCP declarado no projeto/agente,
documentar em um arquivo versionado (não em conhecimento tácito do time)
quais sistemas ele alcança, qual credencial/token usa e o escopo dessa
credencial (somente-leitura ou escrita, qual ambiente), e quem é o
responsável por ela/sua rotação — mantendo esse inventário atualizado
sempre que um servidor for adicionado ou sua configuração mudar.

**O que NAO conta como resolvido:** documentar o inventário uma vez, no
momento em que o servidor foi adicionado, e nunca revisitá-lo. A credencial
por trás de um servidor pode ser re-escopada depois (uma service key do
Supabase que passa a cobrir também produção, por exemplo) sem que a entrada
em `.mcp.json` mude nada — o inventário fica desatualizado exatamente no
momento em que mais importa. Trate-o como uma dependência que exige
reverificação periódica, não como um formulário preenchido uma única vez.

### AI-002 — Plugin ou skill de terceiro sem versão fixada

**Por que existe:** um plugin ou skill de terceiro referenciado sem versão
fixa (um nome de marketplace sem versão, uma branch, `latest`) pode mudar
de comportamento — inclusive o que lê, o que envia, quais comandos executa
— entre uma execução do agente e a próxima, sem nenhuma mudança do lado do
projeto. É o mesmo risco de cadeia de suprimento de uma dependência de
`npm` sem lockfile (família `DEP`), mas na camada que roda dentro do
próprio raciocínio do agente, muitas vezes com acesso a ferramentas mais
amplo do que o próprio código da aplicação.

**Falsos positivos conhecidos:** skills/plugins de primeira parte mantidos
pelo mesmo time/organização dona do projeto (uma skill interna no mesmo
monorepo, versionada pelo mesmo commit que o resto do código) não são
"terceiro" no sentido de cadeia de suprimento — o check mira plugins/skills
vindos de um marketplace externo ou do repositório de outra organização.

**Como remediar:** fixar toda referência a plugin/skill de terceiro em uma
versão ou commit SHA explícito na configuração do projeto (manifesto de
marketplace, equivalente de lockfile), revisar o diff antes de avançar a
versão fixada, e evitar qualquer referência que resolva para um alvo móvel
(`latest`, `main`, nome de marketplace sem versão).

**O que NAO conta como resolvido:** fixar a versão da entrada de topo do
plugin/skill enquanto um script ou passo de instalação dentro dele busca
seus próprios sub-recursos sem fixação, em tempo de execução (um
equivalente a `postinstall` que baixa templates ou exemplos de uma URL) — o
número de versão do topo deixa de significar "exatamente este
comportamento, de forma reproduzível" no momento em que qualquer coisa que
ele dispara ainda pode mudar por baixo dele.

### AI-003 — Permissões amplas em settings local do agente

**Por que existe:** um arquivo de configuração local do agente
(`.claude/settings.json`/`settings.local.json` e equivalentes) que concede
permissão ampla e sem escopo — um allow com wildcard em `Bash`, aprovação
automática de escrita de arquivo ou chamada de rede em qualquer lugar do
disco — remove o único controle que limita o raio de alcance de um ataque
de prompt injection bem-sucedido contra o agente. O agente não precisa ser
comprometido por um bug para causar dano: basta ser enganado por um
conteúdo que ele lê (uma página web, uma issue, um arquivo) a agir fora do
escopo real da tarefa — e uma permissão ampla é o que transforma esse
engano em dano real.

**Falsos positivos conhecidos:** regras de allow estreitas e explicitamente
escopadas, para comandos específicos de baixo risco e somente-leitura
(permitir `git status`, `git log`, `ls` sem wildcard) reduzem atrito de
permissão sem ampliar o raio de alcance de forma relevante — o check mira
amplitude (wildcards, allow de ferramenta inteira, permissão de verbo
destrutivo), não a mera existência de qualquer regra de allow.

**Como remediar:** escopar as regras de permissão para o padrão de
comando/caminho mais estreito que o fluxo realmente precisa (subcomandos
específicos, diretórios específicos), remover allows com wildcard em
ferramentas capazes de executar comando arbitrário ou alcançar rede, e
mover permissão genuinamente ampla/permanente para fora de um arquivo
versionado ou compartilhado, substituindo-a por aprovação explícita e
escopada à sessão.

**O que NAO conta como resolvido:** estreitar a lista de allow, mas deixar
uma única regra ampla demais "só para aquele fluxo que precisa"
(`Bash(curl:*)`, `Bash(*install*)`) — uma regra sem escopo reabre exatamente
o mesmo raio de alcance que o resto do estreitamento pretendia fechar; o
arquivo de settings precisa estar livre de permissão ampla, não
majoritariamente estreito com uma exceção.

### AI-004 — Secret alcançável pelo agente sem necessidade

**Por que existe:** um agente com acesso amplo a filesystem/shell pode ler
qualquer secret que esteja ao alcance da sua árvore de trabalho ou do seu
ambiente, mesmo quando a tarefa em andamento não tem nenhuma relação com
esse secret. Combinado com uma injeção de prompt bem-sucedida (uma
instrução escondida em um arquivo ou página que o agente lê), um secret
meramente *alcançável* vira um secret *exfiltrável*, independentemente de a
tarefa declarada do agente algum dia precisar dele.

**Falsos positivos conhecidos:** um secret que a tarefa real do agente
legitimamente exige para ser concluída (por exemplo, uma credencial de
banco que o agente precisa para rodar a migração que foi pedida a ele) não
é, por si só, o problema — o check é sobre secret alcançável além do que a
tarefa/sessão atual precisa, não sobre o agente jamais tocar em um secret.

**Como remediar:** escopar o diretório de trabalho/ambiente do agente para
excluir secrets sem relação com a tarefa (arquivos `.env` separados que a
sessão do agente não carrega, diretórios fora da árvore de trabalho
permitida) e, para secrets genuinamente necessários, preferir um mecanismo
que deixe o agente usar a credencial sem nunca ler o valor em texto puro
(uma credencial injetada em tempo de execução, uma chamada a um gerenciador
de segredos escopada àquela operação) em vez de colocar o valor bruto em
algum lugar que o agente consiga simplesmente ler com `cat`.

**O que NAO conta como resolvido:** confiar em uma instrução de prompt
("não leia o arquivo de secrets") em vez de restringir de fato o alcance —
uma instrução em texto não é um controle de acesso; é um texto que o
próprio agente (ou uma instrução injetada por um atacante) pode
simplesmente não seguir — especialmente porque o risco que este check
mitiga é justamente o cenário em que o agente é manipulado a ignorar suas
instruções.

### AI-005 — Artefato de agente versionado sem revisão

**Por que existe:** arquivos que configuram ou instruem um agente
(`CLAUDE.md`, skills, scripts de hook, definições de agente customizado)
são, na prática, código — eles executam, ou determinam o que é executado —
mas times costumam tratá-los como "apenas documentação" e pular a revisão
que um código normal recebe, exatamente porque se leem como prosa em vez de
como um diff em `src/`. Uma mudança não revisada aqui pode conceder uma
permissão, alterar o que um hook executa, ou mudar silenciosamente as
instruções que toda sessão futura do agente no repositório passa a seguir.

**Falsos positivos conhecidos:** um ajuste pequeno de texto em uma
descrição de skill (correção de digitação, uma frase de esclarecimento)
que não altera nenhuma permissão, lista de ferramentas ou comportamento
executável é uma edição de documentação normal e de baixo risco — o check
mira mudanças que afetam o que o agente tem permissão ou instrução de
fazer (permissão, comando de hook, acesso a ferramenta, instrução com
efeito comportamental), não qualquer edição a um arquivo sob
`.claude/`/`.agents/`.

**Como remediar:** rotear mudanças em arquivo de configuração de agente
pelo mesmo processo de PR/revisão que o código de aplicação, com quem
revisa checando especificamente mudança de permissão/escopo e qualquer
script de hook que execute comando de shell — tratando um hook novo ou uma
concessão de permissão ampla nova com o mesmo escrutínio de uma dependência
de produção nova.

**O que NAO conta como resolvido:** exigir revisão só para o arquivo de
configuração de topo (`CLAUDE.md`, `settings.json`) enquanto arquivos de
skill e scripts de hook referenciados por ele são mesclados sem o mesmo
escrutínio — a mudança de comportamento efetiva costuma morar no arquivo
referenciado (as instruções de uma skill, o corpo de um script de hook),
não no ponteiro que aponta para ele.

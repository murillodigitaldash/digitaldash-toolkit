# Secrets

Guia de julgamento do dominio `secrets`. Cada bloco corresponde a uma entrada
de `registry.yaml` com o mesmo id.

### SEC-001 — Secret hardcoded em codigo-fonte

**Por que existe:** uma credencial em código-fonte vaza junto com o código —
em fork, em backup, em screenshot, no cache do CI. Uma vez publicada,
considere-a comprometida.

**Falsos positivos conhecidos:** chaves públicas, exemplos em documentação
com valor obviamente fictício, fixtures de teste com valor gerado. Nesses
casos, registre exceção em `.dd/config.yml` com prazo.

**Como remediar:** mover para variável de ambiente lida de um cofre;
rotacionar a credencial exposta; remover do histórico com `git filter-repo`.

**O que NAO conta como resolvido:** apagar do HEAD. O secret continua no
histórico e a chave continua válida. Remediação exige as três coisas: remoção
do histórico, rotação da chave e confirmação de que o consumidor passou a ler
do cofre.

### SEC-002 — Arquivo .env versionado ou fora do .gitignore

**Por que existe:** um `.env` versionado carrega credenciais de todos os
ambientes (dev, staging, produção) para dentro do histórico do repositório,
exposto a qualquer pessoa com acesso de leitura ao código — inclusive clones
antigos e forks.

**Falsos positivos conhecidos:** arquivos `.env.example` ou `.env.sample`
com placeholders (`DATABASE_URL=<preencher>`) não são o problema — são
documentação de quais variáveis existem, sem carregar valor real.

**Como remediar:** remover o arquivo do índice (`git rm --cached .env`),
adicioná-lo ao `.gitignore` na mesma alteração, e rotacionar toda credencial
que ele continha, porque já esteve no histórico.

**O que NAO conta como resolvido:** rodar `git rm --cached .env` e atualizar
o `.gitignore` sem rotacionar as credenciais. O arquivo sai do HEAD, mas todo
valor que ele continha ainda é lido a partir do histórico do git e continua
válido até ser trocado no provedor.

### SEC-003 — Chave privada no repositorio

**Por que existe:** uma chave privada (SSH, TLS, assinatura de release,
service account) commitada dá acesso direto e reproduzível a quem clonar o
repositório — não depende de adivinhar nada, é a chave inteira.

**Falsos positivos conhecidos:** chaves geradas especificamente para
fixtures de teste, que nunca autenticam nada real (por exemplo, uma chave
usada só para testar um parser de PEM). Documente isso explicitamente perto
do arquivo e, ainda assim, prefira gerar a chave em tempo de execução do
teste em vez de commitá-la.

**Como remediar:** revogar a chave no serviço que a reconhece (GitHub, AWS
IAM, servidor SSH...), gerar um par novo, remover do histórico com
`git filter-repo`, e redistribuir a chave nova apenas por um canal seguro
(cofre, nunca chat).

**O que NAO conta como resolvido:** apenas apagar o arquivo do repositório.
A chave privada não muda de valor por sair do HEAD — se alguém já clonou o
repositório (inclusive um clone abandonado, um fork, um cache de CI) a chave
antiga continua funcionando até ser revogada do lado do serviço.

### SEC-004 — Secret presente no historico do git

**Por que existe:** um secret já removido do HEAD, mas não do histórico,
continua recuperável por qualquer pessoa com `git log -p` ou
`git show <commit-antigo>` — a exclusão no HEAD dá uma falsa sensação de que
o problema foi resolvido. Este check varre o histórico inteiro (sem
`--no-git`), por isso roda só nas cadências mais lentas (pr, release,
postura), nunca em hook.

**Falsos positivos conhecidos:** repositórios que já passaram por uma
reescrita de histórico completa (`git filter-repo` seguido de force-push
coordenado e revogação de todos os clones antigos) podem manter um commit
"fantasma" visível apenas em um reflog local não compartilhado — valide
contra o remoto, não contra o reflog local.

**Como remediar:** reescrever o histórico removendo o blob
(`git filter-repo --path <arquivo> --invert-paths` ou BFG Repo-Cleaner),
coordenar o force-push com o time, e rotacionar a credencial de qualquer
forma — não há garantia de que ninguém clonou o commit antes da reescrita.

**O que NAO conta como resolvido:** reescrever o histórico sem rotacionar a
credencial. Enquanto a chave antiga continuar válida no provedor, qualquer
cópia do repositório feita antes do force-push (clone local de alguém do
time, mirror, backup) ainda a expõe.

### SEC-005 — Valor sensivel em variavel de prefixo publico

**Por que existe:** frameworks como Next.js, Vite, Create React App e Expo
embutem no bundle do cliente qualquer variável de ambiente com prefixo
público (`NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `EXPO_PUBLIC_`) — o valor vai
parar em texto plano no JavaScript servido ao navegador, visível a qualquer
usuário pelo devtools. Um nome de variável com "SECRET", "KEY", "TOKEN" etc.
sob esse prefixo é quase sempre um erro de quem pretendia uma variável
server-side.

**Falsos positivos conhecidos:** chaves desenhadas para serem públicas por
natureza (por exemplo `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`) — o nome contém
"KEY" mas o valor é legitimamente público. Confirme isso na documentação do
provedor, nunca só pelo nome da variável.

**Como remediar:** remover o prefixo público da variável, mover o valor para
uma variável server-side lida só no backend/route handler, e se o valor já
foi publicado em um build anterior, tratá-lo como comprometido e rotacionar.

**O que NAO conta como resolvido:** só renomear a variável no `.env` sem
rebuildar e redistribuir a aplicação. O valor sensível já está nos bundles
JS publicados anteriormente (CDN, cache do navegador de quem já visitou); é
preciso invalidar esses builds e, de novo, rotacionar o valor exposto.

### SEC-006 — Credencial impressa em log

**Por que existe:** logs são replicados, agregados e retidos por muito mais
tempo e em muito mais lugares (stdout do container, agregador tipo Datadog
ou CloudWatch, terminal de quem está debugando) do que o código-fonte — uma
credencial que passa por `console.log`, por um stack trace de erro de
autenticação, ou por um payload de requisição logado inteiro, vaza para toda
essa cadeia.

**Falsos positivos conhecidos:** logs que imprimem só um identificador não
secreto (últimos 4 dígitos de um cartão, um `userId`, o nome de uma variável
de ambiente sem seu valor) não são o problema — o teste é se o valor
impresso autentica alguma coisa sozinho.

**Como remediar:** mascarar/redigir o campo sensível antes de logar
(bibliotecas de logging estruturado costumam suportar isso, como `redact`
no `pino`), auditar logs já emitidos e rotacionar qualquer credencial que já
tenha sido escrita neles, e configurar retenção/expurgo nos agregadores.

**O que NAO conta como resolvido:** remover a linha de `console.log` do
código sem tratar os logs já emitidos. A credencial já está nos agregadores
e em qualquer export/backup deles — o log em si sobrevive ao deploy que
"corrigiu" o código.

### SEC-007 — Secret sem rotacao documentada

**Por que existe:** um secret sem política de rotação definida costuma nunca
ser trocado — na prática vira permanente, e quanto mais tempo um valor fica
estático, maior a superfície acumulada de lugares onde pode ter vazado sem
que ninguém saiba (um log antigo, um dump de banco, uma pessoa que saiu do
time).

**Falsos positivos conhecidos:** segredos gerados dinamicamente por sessão
ou requisição (nonce, token de sessão de curta duração emitido pelo próprio
sistema) não precisam de política de rotação documentada porque já
"rotacionam" sozinhos a cada uso.

**Como remediar:** documentar, para cada credencial de longa duração, quem é
o dono, onde ela é usada, e uma cadência de rotação (chaves de API
trimestrais, certificados conforme validade, por exemplo) — registrando isso
em um lugar auditável (`.dd/config.yml`, runbook do time), não só na memória
de quem criou a credencial.

**O que NAO conta como resolvido:** rotacionar a credencial uma vez sem
deixar a política documentada. Sem um dono e uma cadência registrados, a
próxima rotação depende de alguém lembrar — o problema volta assim que a
pessoa que rotacionou sai do time ou esquece.

### SEC-008 — Ausencia de cofre de segredos

**Por que existe:** sem um cofre central (Vault, AWS Secrets Manager,
Doppler, 1Password for Teams etc.), segredos acabam espalhados em `.env`
locais, mensagens de chat, planilhas e scripts de deploy — cada cópia é um
novo ponto de vazamento, e não há como saber quem tem acesso a quê nem
revogar de forma centralizada.

**Falsos positivos conhecidos:** projetos pequenos em estágio de protótipo,
onde a variável de ambiente injetada pela própria plataforma de hosting (com
controle de acesso da plataforma) já cumpre o papel de cofre — o check é
sobre a ausência de qualquer mecanismo central com controle de acesso, não
sobre usar um produto específico chamado "cofre".

**Como remediar:** adotar um cofre de segredos com controle de acesso e
trilha de auditoria, migrar as credenciais existentes para ele, e apontar os
ambientes (CI, produção, cada pessoa do time) para lerem dali em vez de
arquivos locais.

**O que NAO conta como resolvido:** criar a conta no cofre e cadastrar
algumas credenciais novas nele, mantendo os `.env` locais antigos "por
enquanto". Enquanto as duas fontes coexistirem, a superfície de vazamento
não diminuiu — só ganhou mais um lugar para vazar.

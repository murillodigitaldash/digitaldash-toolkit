# Dependências

Guia de julgamento do dominio `dependencias`. Cada bloco corresponde a uma
entrada de `registry.yaml` com o mesmo id.

### DEP-001 — Dependência com CVE crítico ou alto com correção disponível

**Por que existe:** uma vulnerabilidade crítica ou alta com correção já
publicada é o caso mais barato de resolver e o mais caro de ignorar — o
exploit é conhecido publicamente (a CVE está documentada) e a única coisa
entre o projeto e o problema é rodar a atualização. O `jq -e` segue a
convenção de sair com código 0 quando o filtro é verdadeiro — ou seja,
quando existe ao menos uma vulnerabilidade crítica ou alta com correção
disponível — e com código diferente de zero quando a lista está vazia.

**Falsos positivos conhecidos:** a vulnerabilidade está em um caminho de
código que o projeto nunca exercita (uma dependência de build-time, ou uma
função da lib vulnerável que o projeto nunca chama). Mesmo assim, tratar
como falso positivo exige registrar a exceção com justificativa, porque "o
caminho não é usado hoje" muda a cada refactor.

**Como remediar:** atualizar a dependência para a versão corrigida
(`npm audit fix`, ou bump manual quando o fix está em uma major), rodar a
suíte de testes para confirmar que a atualização não quebrou nada, e refazer
o build de release.

**O que NAO conta como resolvido:** rodar `npm audit fix --force` sem
revisar o que mudou. Esse comando pode saltar majors automaticamente; sem
rodar os testes e sem checar o changelog, o projeto pode sair "sem
vulnerabilidade reportada" e quebrado em produção ao mesmo tempo.

### DEP-002 — Lockfile ausente ou dessincronizado do manifest

**Por que existe:** sem lockfile, ou com lockfile fora de sincronia com o
`package.json`, builds diferentes (a máquina de alguém do time, o CI, o
servidor de produção) podem resolver árvores de dependências diferentes para
o mesmo código — quebrando a garantia mais básica de reprodutibilidade e
abrindo espaço para uma dependência maliciosa entrar por um range de versão
amplo demais. Ao contrário dos comandos baseados em grep/jq deste núcleo, o
`npm ci --dry-run` segue a convenção padrão de ferramentas de build: sai com
código 0 quando o lockfile está sincronizado com o manifest e com código
diferente de zero quando está ausente ou dessincronizado.

**Falsos positivos conhecidos:** repositórios que publicam deliberadamente
uma biblioteca (não uma aplicação) costumam não versionar lockfile — é
convenção aceita para libs, porque quem consome decide as versões. O check
deve ser interpretado no contexto de "isto é uma aplicação deployável", não
aplicado literalmente a todo pacote.

**Como remediar:** gerar o lockfile com `npm install` a partir de um
`package.json` correto, revisar o diff gerado, e commitar o lockfile junto
com o manifest na mesma alteração que os modificou.

**O que NAO conta como resolvido:** commitar um lockfile qualquer só para o
arquivo existir, sem rodar `npm ci` (ou equivalente) para confirmar que ele
reflete exatamente o `package.json`. Um lockfile presente mas dessincronizado
passa numa checagem ingênua de "o arquivo existe" e falha exatamente na
garantia que deveria dar.

### DEP-003 — CVE crítico ou alto sem correção disponível

**Por que existe:** quando não há correção publicada, atualizar não resolve
— a decisão vira sobre mitigação (isolar o componente vulnerável, desabilitar
a funcionalidade que o usa, aplicar um patch próprio) e sobre risco aceito, o
que exige julgamento humano sobre a exposição real, não um script.

**Falsos positivos conhecidos:** a CVE afeta um subcomponente da dependência
que o projeto não instancia nem expõe externamente (um parser vulnerável só
acessível por uma flag de configuração que o projeto nunca liga, por
exemplo). Mesmo assim documente a análise, porque a superfície de exposição
muda com o código ao redor.

**Como remediar:** avaliar se existe uma forma alternativa de implementar a
funcionalidade sem a dependência vulnerável, aplicar mitigação de camada
(WAF, isolamento de rede, feature flag desligada), monitorar o upstream para
a correção, e registrar a decisão com prazo de reavaliação em
`.dd/config.yml`.

**O que NAO conta como resolvido:** registrar a exceção sem uma data de
reavaliação, ou sem uma mitigação real. Uma exceção sem prazo vira
permanente, e uma exceção sem mitigação é só a ausência de correção anotada,
não um risco tratado.

### DEP-004 — Dependência abandonada

**Por que existe:** uma dependência sem atividade de manutenção não recebe
correção quando uma vulnerabilidade for descoberta nela — o risco não é o
estado atual da lib, é a ausência de alguém do outro lado para corrigir o
próximo problema. Este comando apenas coleta evidência — as datas de última
publicação de cada dependência direta — e sempre sai com código 0
independentemente do resultado; ele não funciona como um portão de
aprovação/reprovação, a decisão sobre abandono cabe ao julgamento humano
lendo a saída.

**Falsos positivos conhecidos:** bibliotecas pequenas e estáveis, cuja
superfície de API não muda (um formatter de data, um utilitário de string),
podem ficar anos sem publicar uma versão nova simplesmente porque não há
nada a corrigir. A idade do último publish sozinha não decide — cruze com
issues abertas sem resposta e com vulnerabilidades conhecidas sem correção.

**Como remediar:** substituir a dependência por uma alternativa mantida, ou,
se não houver alternativa razoável, fazer fork interno e assumir a
manutenção, documentando a decisão.

**O que NAO conta como resolvido:** fixar a versão da dependência
(`overrides`/`resolutions` travando no que já está instalado) sem trocar de
biblioteca ou assumir manutenção. Isso apenas esconde o check — não muda o
fato de que ninguém vai corrigir a próxima vulnerabilidade encontrada nela.

### DEP-005 — SBOM não gerado no release

**Por que existe:** sem um SBOM (Software Bill of Materials) gerado a cada
release, não existe um registro auditável de exatamente quais dependências
— e em que versão — compõem aquele artefato específico. Quando uma CVE nova
é anunciada meses depois, não dá para responder rápido "quais dos nossos
releases publicados são afetados" sem ele. O comando sai com código 0 quando
o SBOM é gerado com sucesso e com código diferente de zero quando a geração
falha — a mesma convenção de 0 = sucesso usada por ferramentas de build como
o `npm ci`.

**Falsos positivos conhecidos:** releases de hotfix que não alteram nenhuma
dependência podem reaproveitar o SBOM do release anterior sem regenerar,
desde que isso fique registrado explicitamente (mesmo lockfile, mesmo SBOM).
O problema é a ausência do artefato, não a ausência de uma geração nova
quando nada mudou.

**Como remediar:** integrar a geração do SBOM (`cyclonedx-npm`, `syft` ou
equivalente) como etapa do pipeline de release, publicando o arquivo junto
dos demais artefatos daquele release.

**O que NAO conta como resolvido:** gerar o SBOM manualmente uma vez, na
máquina de alguém, e anexar ao release "desta vez". Sem a etapa integrada ao
pipeline, o próximo release sai sem SBOM de novo assim que a pessoa que
lembrou dessa vez não estiver no ciclo seguinte.

### DEP-006 — Pipeline instalando sem npm ci

**Por que existe:** `npm install` no CI resolve o lockfile de novo e pode
atualizar versões dentro dos ranges do `package.json`, tornando o build não
reprodutível — o que passou no CI pode não ser exatamente o que vai para
produção, e uma dependência comprometida publicada entre uma execução e
outra pode entrar sem ninguém ter mudado uma linha de código.

**Falsos positivos conhecidos:** um job de pipeline cujo propósito explícito
é atualizar dependências (um workflow de aplicar PRs do Renovate/Dependabot)
usa `npm install` de propósito — o check é sobre o pipeline de build/deploy
normal, não sobre jobs de manutenção de dependências.

**Como remediar:** trocar `npm install` por `npm ci` em todos os steps de
CI/CD que fazem build ou deploy, garantindo que o lockfile commitado seja a
única fonte de verdade sobre as versões instaladas.

**O que NAO conta como resolvido:** trocar o comando em um pipeline (o de
deploy, por exemplo) e deixar outro (o de testes de PR, por exemplo) ainda
usando `npm install`. Um pipeline não reprodutível já quebra a garantia que
o check busca, mesmo que os demais estejam corretos.

### DEP-007 — Pacote com sinal de typosquatting ou mantenedor único

**Por que existe:** ataques de cadeia de suprimento costumam publicar um
pacote com nome parecido a um popular, ou assumir o controle da conta de um
mantenedor de um pacote real, esperando que alguém instale por engano ou que
ninguém perceba a mudança de dono. Um pacote novo, com poucos downloads,
nome quase idêntico a outro popular, e um único mantenedor sem histórico é o
padrão clássico desses incidentes.

**Falsos positivos conhecidos:** pacotes legítimos e pequenos de um único
autor independente são comuns e normais no ecossistema JS — não são
automaticamente suspeitos. O sinal de alerta é a combinação de nome parecido
com um pacote estabelecido, publicação recente e ausência de histórico, não
"ter um único mantenedor" isoladamente.

**Como remediar:** antes de adicionar a dependência, conferir o nome
caractere a caractere contra o pacote esperado, revisar o perfil do
mantenedor e o histórico de publicação no registry, e preferir pacotes com
múltiplos mantenedores ou apoio de uma organização quando a alternativa
existir.

**O que NAO conta como resolvido:** remover o pacote suspeito da lista de
dependências diretas sem verificar se ele já foi instalado — e seu
`postinstall` já executado — em alguma máquina do time ou no CI antes da
remoção. Se o pacote malicioso já rodou um script de instalação, o dano
(exfiltração de tokens do ambiente, por exemplo) pode já ter ocorrido antes
da remoção.

# Maturidade de Supply Chain

Referência do eixo Postura para a maturidade de cadeia de suprimento de
dependências que fica **acima** do que o núcleo já verifica mecanicamente a
cada PR e release. `DEP-002` (lockfile sincronizado), `DEP-006` (pipeline
instalando de forma reprodutível) e `DEP-007` (sinal de typosquatting ou
mantenedor único) já têm julgamento próprio em `checks/dependencias.md` —
este arquivo não os repete; cita-os por id e cobre o que eles não alcançam:
decisão de processo e política organizacional, não o estado mecânico de um
commit específico. Cada tópico segue **Objetivo**, **Procurar**, **Evidência
aceitável** e **Reportar**.

### Proveniência de build

**Objetivo:** sem proveniência, não há como provar que o pacote publicado no
registry corresponde ao código-fonte que foi de fato revisado — alguém com
acesso à conta de publicação pode publicar um artefato diferente do
repositório sem deixar rastro.

**Procurar:** para pacotes publicados pelo próprio time, se o processo de
publicação gera algum attestation de proveniência (assinatura vinculando o
artefato publicado ao commit e ao pipeline que o gerou). Para dependências
de terceiro críticas, se o próprio pacote publica proveniência verificável.

**Evidência aceitável:** para pacotes publicados pelo time — o attestation
de proveniência visível na página do pacote no registry, gerado pelo próprio
pipeline de CI/CD. Para dependências de terceiro — **isto é um dos casos em
que não existe evidência verificável além da ausência**: a maior parte do
ecossistema hoje não publica proveniência, então a resposta correta é
reportar quais dependências críticas têm o atributo e quais não têm, sem
inventar uma prova substituta para as que não têm.

**Reportar:** pacotes publicados pelo time × attestation presente (sim/não);
dependências diretas críticas × proveniência de terceiro disponível
(sim/não).

### Fixação de versão além do lockfile

**Objetivo:** o lockfile garante que uma instalação a partir dele seja
reprodutível — mas isso não impede que a *próxima* instalação limpa (lockfile
recriado, ambiente novo, renovação de dependência) resolva uma versão nova e
não revisada, se o manifesto ainda declarar range aberto (`^`, `~`) nas
dependências diretas. Esta é a política que evita reabrir, no manifesto, a
mesma superfície que o lockfile fecha — não é o mesmo objeto que `DEP-002`
verifica a cada execução.

**Procurar:** o padrão de versionamento usado nas dependências diretas do
manifesto, e se existe automação (bot de atualização) trazendo updates como
mudança revisável, em vez de deixar o range se resolver sozinho em qualquer
instalação.

**Evidência aceitável:** uma amostra do manifesto mostrando o padrão adotado
nas dependências diretas (fixo ou range), e a configuração do bot de
atualização, quando existir, mostrando que os updates chegam como alteração
revisável, não como merge automático sem revisão humana para dependências de
produção.

**Reportar:** proporção de dependências diretas com versão fixa vs. em
range; bot de atualização configurado (sim/não) e modo de entrega dos
updates (revisão manual vs. automático).

### Política de registry

**Objetivo:** instalar de qualquer registry público sem controle abre a
porta tanto para um pacote malicioso individual — o sinal que `DEP-007` já
cobre no nível de pacote — quanto para um registry inteiro comprometido ou
substituído sem ninguém perceber.

**Procurar:** a configuração de registry efetivamente usada pelo projeto — o
registry oficial padrão, um proxy/mirror interno com política de allowlist,
ou ausência de qualquer controle sobre a origem dos pacotes.

**Evidência aceitável:** a configuração de registry ativa (não a assumida)
mostrando a URL de origem, e, quando houver proxy interno, a política de
allowlist configurada nele — "usamos o registry padrão" sem confirmar que
nenhuma configuração local aponta para outro lugar não é evidência
suficiente.

**Reportar:** registry configurado × proxy/mirror interno (sim/não) ×
escopos ou pacotes permitidos quando houver allowlist.

### Disciplina de lockfile em CI

**Objetivo:** `DEP-002` e `DEP-006` já cobrem o estado mecânico do lockfile
a cada execução de CI — sincronizado com o manifesto, e instalado de forma
reprodutível. A maturidade que falta é de processo, antes do CI: o que
impede alguém de abrir um PR que muda uma dependência direta sem que o
lockfile acompanhe, em vez de deixar só o CI pegar isso depois.

**Procurar:** verificação local (hook de pré-commit ou pré-push) ou regra de
revisão obrigatória que bloqueie um PR com manifesto alterado e lockfile
desacompanhado, antes de chegar ao pipeline.

**Evidência aceitável:** a configuração do hook local, ou a regra de
proteção de branch/revisão de código que exige o lockfile atualizado junto
do manifesto na mesma mudança. "O CI pega isso" não é evidência de
disciplina de processo — é apenas `DEP-002` fazendo o trabalho que já faz
normalmente; este tópico busca a camada anterior a ele.

**Reportar:** hook ou regra de pré-CI configurado (sim/não) × onde está
definido (repositório, configuração de branch protection, ou equivalente).

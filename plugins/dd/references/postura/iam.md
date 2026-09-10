# IAM

Referência do eixo Postura para identidade e controle de acesso — quem tem
acesso a quê, com que privilégio, e por quanto tempo. Nenhum destes tópicos
tem check formal no núcleo hoje (não confundir com o domínio `tenant`, que é
isolamento de dado *dentro* da aplicação, não gestão de identidade
organizacional). Cada tópico abaixo segue **Objetivo**, **Procurar**,
**Evidência aceitável** e **Reportar** — a terceira seção é o que impede
este arquivo de virar um checklist de "sim/não".

### MFA obrigatório para acesso administrativo

**Objetivo:** garantir que uma senha vazada sozinha não baste para tomar uma
conta com privilégio administrativo.

**Procurar:** o provedor de identidade em uso (Google Workspace, Okta,
Auth0, IAM nativo de nuvem) e a política de MFA aplicada a cada grupo de
acesso privilegiado.

**Evidência aceitável:** a lista de contas com privilégio administrativo
enumerada (identificador, papel) com o status de MFA de cada uma extraído
do painel do provedor — export ou captura com data — no momento da
auditoria. "MFA é obrigatório para todos" sem essa lista não conta como
evidência; conta sem MFA sem justificativa e prazo de correção é achado
aberto, não exceção documentada.

**Reportar:** tabela conta × papel × MFA ativo (sim/não) × data da
verificação.

### Menor privilégio em roles

**Objetivo:** reduzir o raio de dano de uma credencial comprometida ao
mínimo necessário para a função que ela exerce.

**Procurar:** roles e policies de IAM (nuvem ou aplicação) comparadas contra
o que a pessoa ou serviço realmente exerce no período recente.

**Evidência aceitável:** uma comparação concreta entre permissão concedida e
permissão efetivamente usada — relatório de uso de permissão do provedor
(quando existir) ou, na ausência de uma ferramenta assim na stack, log de
acesso por um período definido cruzado manualmente contra a policy. "Seguimos
menor privilégio" sem essa comparação não é evidência aceitável; quando a
stack não tem ferramenta de análise de uso de permissão, reportar essa
lacuna de tooling é a resposta correta, não uma afirmação sem lastro.

**Reportar:** lista de roles com privilégio excedente (concedido vs. usado)
e plano de redução, ou a lacuna de tooling quando a comparação não for
possível.

### Contas inativas removidas

**Objetivo:** uma conta sem uso é superfície de ataque sem ninguém cuidando
ativamente dela — credencial que ninguém rotaciona, acesso que ninguém
revisita.

**Procurar:** data do último login de toda conta humana e de serviço com
acesso a sistemas de produção.

**Evidência aceitável:** export do provedor de identidade com a data do
último login por conta, cruzado contra um corte definido (90 dias sem login
como padrão, salvo justificativa de negócio documentada por conta). "Já
revisamos e está tudo certo" sem o export com datas não conta.

**Reportar:** lista de contas inativas encontradas, com a ação tomada
(removida, desativada, ou justificada com prazo de reavaliação).

### Escopo de service account

**Objetivo:** contas de serviço tendem a acumular permissão ampla porque
"assim funciona" nunca é revisitado depois que o sistema entra em produção.

**Procurar:** cada credencial de sistema-a-sistema (service account, chave
de API interna) e os recursos que ela de fato consegue alcançar.

**Evidência aceitável:** para cada service account, a lista de recursos que
ela *pode* tocar (não só os que toca hoje), confrontada com o que o serviço
efetivamente precisa — sem role administrativa ampla concedida "para
simplificar", e sem coringa (`*`) sem justificativa registrada.

**Reportar:** tabela service account × permissões concedidas × permissões
necessárias × divergência encontrada.

### Escopo de token

**Objetivo:** um token de API com escopo total vira um passe-livre completo
quando vaza, em vez de limitar o dano ao que aquela integração de fato faz.

**Procurar:** tokens de API ativos (de usuário, de integração, de CI) e os
escopos declarados de cada um.

**Evidência aceitável:** o escopo real do token, lido do painel de emissão
(não da intenção de quem criou), confrontado com o uso real da integração
que o consome — token com escopo administrativo ou total sem justificativa
registrada é achado, mesmo que "nunca tenha sido usado para nada além do
esperado".

**Reportar:** lista de tokens ativos com escopo, dono, data de emissão e
data de expiração (ou ausência de expiração, que é achado por si).

### Timeout de sessão

**Objetivo:** uma sessão que nunca expira estende indefinidamente a janela
de uso de uma credencial já comprometida.

**Procurar:** o tempo de expiração configurado para sessão, cookie de
autenticação ou JWT, em cada superfície (painel administrativo, aplicação
cliente, API).

**Evidência aceitável:** o valor de TTL lido da configuração ativa — arquivo
de configuração, variável de ambiente ou painel do provedor de identidade
com o valor visível — não a lembrança de alguém do time sobre o que "deveria
estar" configurado.

**Reportar:** TTL de sessão por superfície, com a configuração de origem
citada.

### SSO quando aplicável

**Objetivo:** centralizar autenticação em um único ponto de controle — ao
desligar alguém no provedor de identidade, o acesso cai em todos os sistemas
de uma vez, sem depender de lembrar de revogar cada um manualmente.

**Procurar:** sistemas com login próprio (usuário e senha independentes) que
poderiam estar atrás do SSO corporativo já existente.

**Evidência aceitável:** lista explícita dos sistemas usados pela
organização, com cada um marcado como coberto pelo SSO ou não — para cada
sistema fora do SSO, uma justificativa (o provedor não suporta) ou um plano
de migração com prazo.

**Reportar:** cobertura de SSO (proporção e lista) e sistemas fora dele, com
justificativa ou plano de migração de cada um.

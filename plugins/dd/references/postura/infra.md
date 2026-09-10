# Infraestrutura

Referência do eixo Postura para a borda da infraestrutura — o que fica
exposto à internet, com que proteção, e com que configuração observada de
fato, não a pretendida no código-fonte. Nenhum destes tópicos tem check
formal no núcleo hoje. Cada tópico segue **Objetivo**, **Procurar**,
**Evidência aceitável** e **Reportar**.

### CORS restritivo

**Objetivo:** CORS aberto (`*`) combinado com credenciais permite que
qualquer site de terceiro leia respostas autenticadas do usuário a partir do
navegador dele.

**Procurar:** a configuração de CORS de cada origem pública (API, servidor
de aplicação, CDN).

**Evidência aceitável:** a lista de origens permitidas observada em uma
resposta real (por exemplo, o cabeçalho `Access-Control-Allow-Origin`
capturado contra o ambiente de produção), não a leitura do arquivo de
configuração presumindo que é o que está de fato publicado — os dois podem
divergir.

**Reportar:** origem × endpoint × cabeçalho observado.

### Cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)

**Objetivo:** mitigar classes inteiras de ataque do lado do cliente
(clickjacking, MIME sniffing, injeção via terceiros) sem depender de cada
tela individual acertar isso sozinha.

**Procurar:** os cabeçalhos de resposta de rotas públicas reais do domínio
de produção.

**Evidência aceitável:** a saída de uma checagem contra o domínio real
(captura de cabeçalho de resposta ou relatório de uma ferramenta de
verificação de cabeçalhos), listando presença e valor de cada cabeçalho —
"cabeçalhos configurados" sem essa saída não conta.

**Reportar:** tabela cabeçalho × presente (sim/não) × valor observado, por
domínio.

### TLS 1.2 ou superior

**Objetivo:** versões antigas do protocolo têm vulnerabilidades conhecidas e
exploráveis publicamente.

**Procurar:** as versões de protocolo que o balanceador, CDN ou servidor de
fato aceita.

**Evidência aceitável:** a saída de uma ferramenta de handshake TLS
apontando para o host real, mostrando quais versões o servidor aceita e
quais recusa — não a configuração pretendida no console do provedor, que
pode não refletir o que está de fato servido no momento da checagem.

**Reportar:** versões de protocolo aceitas, com a versão mínima observada
por domínio.

### Certificados válidos e renovação automática

**Objetivo:** um certificado expirado é uma interrupção total do serviço,
autoinfligida e evitável.

**Procurar:** a data de expiração do certificado ativo e o mecanismo de
renovação (automático via ACME, ou manual).

**Evidência aceitável:** a data de expiração lida do certificado real
servido, e a confirmação de que a renovação é automática (configuração do
provedor visível) — ou, quando manual, quem é o responsável e com que
antecedência a renovação é feita.

**Reportar:** domínio × data de expiração × mecanismo de renovação ×
responsável (quando manual).

### Cookies com HttpOnly, Secure e SameSite

**Objetivo:** um cookie de sessão sem essas flags é legível por script
injetado (sem HttpOnly) ou enviável entre sites (sem SameSite adequado).

**Procurar:** as flags do cookie de sessão observadas em uma resposta real.

**Evidência aceitável:** o cabeçalho `Set-Cookie` capturado de uma resposta
real com as flags visíveis — não a leitura do código que define o cookie,
que pode divergir do que o middleware ou proxy à frente efetivamente envia.

**Reportar:** cookie × flags observadas × ambiente onde foi observado.

### Buckets e containers de storage públicos sem motivo

**Objetivo:** um bucket público por engano é uma das causas mais comuns de
vazamento de dado em produção, e costuma ser silencioso até alguém achar.

**Procurar:** a policy de acesso de cada bucket ou container usado pelo
projeto.

**Evidência aceitável:** a policy efetiva de cada bucket lida diretamente do
provedor (não do código de infraestrutura como intenção), cruzada contra uma
lista explícita de buckets que precisam ser públicos (assets estáticos,
por exemplo) com justificativa registrada para cada um.

**Reportar:** bucket × público (sim/não) × justificativa quando público.

### Serviços internos não expostos (banco, cache, busca)

**Objetivo:** um banco de dados, cache ou motor de busca acessível
diretamente da internet, pulando a camada de aplicação, é uma porta de
entrada sem nenhuma das proteções que a aplicação normalmente aplica.

**Procurar:** a exposição de rede de cada serviço de dado — porta acessível
publicamente ou restrita à rede privada.

**Evidência aceitável:** o resultado de uma varredura de porta contra o
endereço público do serviço (ou a flag de "acesso público" do provedor
gerenciado), mostrando a porta fechada ou filtrada de fora — não a suposição
de que "está numa rede privada" sem checar a regra de firewall/security
group que de fato aplica isso.

**Reportar:** serviço × porta × acessível publicamente (sim/não) × regra que
garante o isolamento.

### WAF em endpoints públicos

**Objetivo:** uma camada de filtro antes da aplicação captura payloads
maliciosos conhecidos sem depender de cada rota validar tudo perfeitamente.

**Procurar:** se existe WAF na frente das APIs e endpoints públicos, e quais
conjuntos de regras estão ativos.

**Evidência aceitável:** o nome do WAF em uso, os conjuntos de regras
gerenciadas ativos, e se o modo é de bloqueio ou só de registro — um WAF em
modo de registro apenas observa, não protege nada.

**Reportar:** endpoint × WAF presente × modo (bloqueio/registro) × conjuntos
de regras ativos.

### Proteção contra DDoS

**Objetivo:** sem alguma camada de absorção de tráfego, um pico malicioso ou
orgânico derruba o serviço.

**Procurar:** se o provedor de borda ou CDN em uso oferece proteção contra
DDoS, e se ela está ativa no plano efetivamente contratado.

**Evidência aceitável:** a confirmação, no painel do provedor, do nível de
proteção incluído no plano atual — planos de entrada de alguns provedores
não incluem a camada avançada de proteção; "usamos um provedor que tem
proteção contra DDoS" sem checar o tier contratado não conta.

**Reportar:** provedor × tier de proteção × cobertura (rede e/ou aplicação).

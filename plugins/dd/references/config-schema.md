# Schema de configuração do projeto

Documenta o formato de `.dd/config.yml`, o arquivo que o comando
`/dd:setup` escreve no projeto auditado — não neste plugin.

**Este arquivo é um stub.** O schema completo (`versao`, `projeto`,
`stacks`, `areas_criticas`, `gates`, `excecoes`, e a regra de cada campo —
incluindo que uma exceção sem `expira` é inválida e que um gate desligado
exige comentário com o motivo na mesma linha) é escrito pela Task 16,
junto com o comando e a skill de setup do projeto. Até lá, a ausência de
conteúdo aqui é trabalho pendente, não uma decisão de design — não
preencha esta lacuna por conta própria.

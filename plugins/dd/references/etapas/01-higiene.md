# Etapa 1 — Higiene e código morto

**Objetivo:** remover tudo que não serve — código não usado, comentado sem motivo, ramos mortos. Reduz superfície de bug.

**Procurar:**
- Componentes criados mas nunca renderizados.
- Funções, hooks, tipos e constantes exportados e nunca importados.
- Importações não utilizadas.
- Variáveis de estado que nunca mudam ou nunca são lidas.
- Props declaradas e nunca usadas.
- Código comentado sem explicação (TODO/FIXME sem data ou ticket).
- Dependências em `package.json` que ninguém importa.
- Arquivos órfãos (não importados por nada e não sendo entrypoint).
- Branches `if (false)`, `process.env.NEVER_TRUE`, feature flags permanentes.

**Ferramentas:** `knip`, `ts-prune`, `eslint-plugin-unused-imports`, `@typescript-eslint/no-unused-vars`, `depcheck`, `madge --orphans`.

**Comandos:**
```bash
npx knip --reporter json > .protocolo/$STAMP/01-knip.json
npx ts-prune > .protocolo/$STAMP/01-ts-prune.txt
npx depcheck --json > .protocolo/$STAMP/01-depcheck.json
npx madge --orphans --extensions ts,tsx,js,jsx src > .protocolo/$STAMP/01-orphans.txt
```

**Reportar:** lista por categoria com caminho, linha e sugestão.

**Gate de saída:** zero arquivos órfãos, zero exports não usados em produção, TODOs sem ticket aberto remediados.

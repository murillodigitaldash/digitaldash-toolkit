# Etapa 4 — DRY e duplicação

**Objetivo:** eliminar duplicação real (não acidental). Com camadas separadas e tipos firmes, a duplicação aparece honesta.

**Procurar:**
- Funções com corpo equivalente em arquivos diferentes.
- Componentes que diferem só em props/estilo.
- Hooks reimplementando fetch + cache + loading (consolidar em wrapper sobre TanStack Query/SWR).
- Constantes mágicas repetidas.
- Schemas duplicados entre front e back.

**Cuidado:** "três strikes" antes de extrair. Duplicação aparente com semânticas diferentes deve ficar duplicada.

**Ferramentas:** `jscpd`, `eslint-plugin-sonarjs` (`no-duplicate-string`, `no-identical-functions`), `satisfies` do TS.

**Comandos:**
```bash
npx jscpd --min-tokens 50 --reporters json --output .protocolo/$STAMP/04-jscpd src
```

**Reportar:** clusters de duplicação acima do threshold; proposta de abstração e onde mora.

**Gate de saída:** clusters acima do threshold endereçados ou aceitos com justificativa.

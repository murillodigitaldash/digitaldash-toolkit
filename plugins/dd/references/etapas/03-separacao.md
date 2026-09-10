# Etapa 3 — Separação de responsabilidades

**Objetivo:** garantir que UI, lógica de negócio, acesso a dados e estado vivem em camadas distintas. Vem antes de DRY porque agora os contratos entre camadas estão tipados (Etapa 2).

**Procurar:**
- Componentes de apresentação com regras de negócio embutidas.
- `fetch`/`axios`/SDK chamados direto em componentes de UI.
- Componentes que misturam estado de servidor, estado de UI e formatação.
- Hooks "fat" que fazem fetch + transform + side-effect no mesmo bloco.
- Em Next.js App Router: lógica de servidor rodando em Client Component (ou vice-versa).
- Falta de tipos de domínio (`domain/`, `entities/`) versus DTOs de API.

**Heurísticas:**
- Container / Presentational.
- Custom hooks isolam side-effects.
- Service layer: componentes nunca chamam `fetch` direto.
- Server Components primeiro em Next.js.
- Camadas: `dto → mapper → domain → view-model`.

**Ferramentas:** `eslint-plugin-boundaries`, `dependency-cruiser`, ESLint com `react-hooks/exhaustive-deps`, `complexity`, `max-lines-per-function`.

**Reportar:** mapa de violações por componente; proposta de refatoração com origem e destino da lógica.

**Gate de saída:** nenhum componente de UI chama API direto. Regras do `eslint-plugin-boundaries` passando. `"use client"` só onde precisa.

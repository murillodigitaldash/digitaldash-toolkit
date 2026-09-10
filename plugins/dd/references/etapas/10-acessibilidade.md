# Etapa 10 — Acessibilidade

**Objetivo:** garantir que o produto é usável por todos. WCAG AA mínimo. Tem implicação legal (Lei Brasileira de Inclusão — Lei 13.146/2015).

**Procurar:**

*Estrutura semântica:*
- HTML semântico (`<button>` em vez de `<div onClick>`, `<nav>`, `<main>`, `<article>`).
- Landmarks corretos.
- Hierarquia de heading (`h1` → `h2` → `h3` sem pular).
- Listas representadas como `<ul>`/`<ol>`.

*Teclado:*
- Navegação 100% por teclado nos fluxos críticos.
- Foco visível e estilizado.
- Ordem de tab lógica.
- Foco gerenciado em modais (trap), drawer, navegação SPA.
- Atalhos não conflitam com leitor de tela.

*Leitor de tela:*
- Imagens com `alt` apropriado (descritivo para conteúdo, `alt=""` para decorativo).
- Formulários com `<label>` associado.
- Mensagens de erro associadas ao campo (`aria-describedby`).
- Estado dinâmico anunciado (`aria-live` em toast, loading, erro).
- ARIA usado corretamente (não inventado — usar o nativo quando possível).

*Contraste e visual:*
- Texto com contraste >= 4.5:1 (AA) ou 7:1 (AAA).
- Informação não transmitida só por cor.
- Reduced motion respeitado (`prefers-reduced-motion`).
- Zoom até 200% sem perda de funcionalidade.

*Formulários:*
- Validação acessível (não só visual).
- Autocompletar com `autocomplete` apropriado.
- Erros descritivos.

**Testes obrigatórios:**
- Lighthouse a11y >= 95 nas telas principais (automatizado).
- `axe-core` rodando em CI nas telas críticas.
- **Teste manual com leitor de tela** (NVDA no Windows, VoiceOver no Mac/iOS, TalkBack no Android) nos fluxos críticos. Automação não substitui isso.
- **Teste com navegação por teclado** nos fluxos críticos.

**Ferramentas:** `@axe-core/playwright`, `eslint-plugin-jsx-a11y`, Lighthouse CI, Wave (extensão), NVDA/VoiceOver.

**Comandos:**
```bash
npx playwright test --grep @a11y --reporter=json > .protocolo/$STAMP/10-a11y-e2e.json
# Lighthouse a11y já capturado na Etapa 9 (lhci)
```

**Reportar:**
- Score Lighthouse a11y por tela principal.
- Findings do `axe-core` por severidade.
- Resultado dos testes manuais (teclado + leitor de tela).
- Lista de violações de contraste.

**Gate de saída:** Lighthouse a11y >= 95 nas telas principais. Zero findings de severidade `serious` ou `critical` no `axe-core`. Fluxos críticos navegáveis por teclado. Fluxos críticos passam em teste manual com leitor de tela.

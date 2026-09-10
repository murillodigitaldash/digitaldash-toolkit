# Etapa 9 — Performance

**Objetivo:** medir e otimizar com base em dados, agora com observabilidade pronta (Etapa 7) e queries saudáveis (Etapa 8).

**Procurar (frontend React):**
- Componentes que re-renderizam frequentemente sem necessidade (`React.memo` apenas com evidência de medição).
- Funções inline passadas a componentes memoizados (`useCallback`).
- Cálculos pesados em cada render (`useMemo`).
- Listas longas (>100 itens) sem virtualização (`@tanstack/react-virtual`, `react-window`).
- Imagens não otimizadas (sem `next/image`, sem dimensões, formatos pesados).
- Bundle inchado: deps pesadas importadas inteiras quando dava pra tree-shake.
- Fontes bloqueando render.
- Hidratação cara: Client Component que devia ser Server.

**Procurar (Next.js):**
- Falta de `loading.tsx` (sem Suspense streaming).
- `fetch` sem `cache`/`revalidate` explícito.
- Server Actions fazendo trabalho de background job.
- Rotas dinâmicas sem ISR onde caberia.

**Procurar (React Native):** ver `references/stack-react-native.md`.

**Procurar (geral):**
- Core Web Vitals fora do alvo: LCP > 2.5s, INP > 200ms, CLS > 0.1.
- Waterfalls de requisição paralelizáveis.

**Antes de otimizar: medir.** Memoizar tudo é antipadrão.

**Ferramentas:** React DevTools Profiler, `why-did-you-render`, Lighthouse CI, `@next/bundle-analyzer`, `size-limit`, WebPageTest, Chrome DevTools.

**Comandos:**
```bash
npx @lhci/cli autorun --collect.numberOfRuns=3 --upload.target=filesystem --upload.outputDir=.protocolo/$STAMP/09-lhci
ANALYZE=true npm run build
npx size-limit --json > .protocolo/$STAMP/09-size-limit.json
```

**Reportar:** Core Web Vitals p75 (mobile/desktop), top 10 componentes por render time, top 10 deps por peso, listas sem virtualização, imagens não otimizadas, bundle atual vs orçamento.

**Gate de saída:** Web Vitals no alvo. Bundle no orçamento. Nenhuma otimização sem evidência de medição.

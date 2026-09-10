# Etapa 2 — Type safety

**Objetivo:** aproveitar TypeScript como rede de segurança para todas as refatorações seguintes. Eliminar `any` direto e indireto, fortalecer fronteiras de dados, padronizar convenções.

**Bifurcação por runtime:** esta etapa tem dois gates, não um. Projeto TypeScript segue o gate abaixo (`tsc --noEmit`, `type-coverage`). Projeto JavaScript sem TypeScript segue `references/stacks/runtime-js.md` — gate equivalente por percentual de fronteiras externas validadas por schema, não por percentual de tipos. Detecte pela presença de `tsconfig.json` e pela proporção de arquivos `.ts`/`.tsx` versus `.js`/`.jsx` no projeto. Ausência de TypeScript não é "N/A": é a trilha JS.

**Procurar (trilha TypeScript):**

*`any` explícito e implícito:*
- `any` direto em código de produção.
- `any` implícito quando `noImplicitAny` está desligado.
- `Function`, `Object`, `{}` — equivalentes a `any` na prática.

*Escapes do checker:*
- `@ts-ignore`, `@ts-expect-error` sem comentário, `@ts-nocheck`.
- Type assertions usadas pra calar o compilador (`as Foo`, `as unknown as Foo`).
- Non-null assertions (`foo!`) sem garantia documentada.

*Fronteiras sem validação:*
- `JSON.parse`, `fetch().json()`, `localStorage`, `URLSearchParams`, query params — todos retornam dados que o TS aceita como qualquer coisa.
- Payloads de API tipados manualmente em vez de derivados de schema.
- Webhooks e Server Actions sem validação de input.

*Props e contratos:*
- Componentes React sem interface/type de props.
- Props com tipos largos demais (`string` onde caberia union literal).
- `children: ReactNode` quando o componente só aceita texto ou 1 filho específico.

*Tipos pouco restritivos:*
- `string` onde caberia union literal.
- Estados representados por múltiplos booleanos em vez de discriminated union.
- IDs como `string` genérico em vez de branded types.
- Datas como `string` sem indicação de formato.

*Configuração:*
- `strict: false` ou flags estritas individuais desligadas.
- Falta de `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.

*Convenção `interface` vs `type`:*
- Inconsistência. Regra prática: `interface` para shapes de objeto extensíveis; `type` para unions, intersections, mapped, conditional, tuplas, primitivas.

**Implementar:**
- Ligar `strict: true` e flags adicionais. Se gerar muitos erros, criar baseline e reduzir em ondas.
- Validação de fronteira com Zod/Valibot. Tipo derivado: `type User = z.infer<typeof userSchema>`.
- `ts-reset` para corrigir tipos da stdlib (`JSON.parse` retorna `unknown`, `array.filter(Boolean)` filtra corretamente).
- Discriminated unions para estados.
- Branded types para IDs.
- Substituir assertions por type guards.

**tsconfig recomendado:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Ferramentas:** `tsc --noEmit`, `type-coverage`, `typescript-eslint` (regras `no-explicit-any`, `no-unsafe-*`, `ban-ts-comment`, `no-non-null-assertion`, `consistent-type-imports`, `consistent-type-definitions`), `ts-reset`, `zod`/`valibot`.

**Comandos:**
```bash
npx tsc --noEmit > .protocolo/$STAMP/02-tsc.txt 2>&1
npx type-coverage --detail > .protocolo/$STAMP/02-type-coverage.txt
grep -rn "as any\|as unknown as\|@ts-ignore\|@ts-nocheck" src > .protocolo/$STAMP/02-escapes.txt
```

**Reportar:** tabela por categoria, cobertura de tipos atual vs alvo, top 10 arquivos com mais débito, diff proposto do tsconfig. Na trilha JS, reportar conforme `references/stacks/runtime-js.md`.

**Gate de saída (trilha TypeScript):** `tsc --noEmit` zero erros. `type-coverage >= 99%` (ou threshold acordado). Zero `any` explícito em código novo. Zero `@ts-ignore` sem comentário e ticket. Toda fronteira externa com schema. Na trilha JS, o gate é o de `references/stacks/runtime-js.md`.

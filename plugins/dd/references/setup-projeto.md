# Setup inicial do protocolo no projeto

Material de apoio para `skills/setup/SKILL.md`: instalação de ferramentas
por etapa, scripts de `package.json`, `tsconfig.json` recomendado, config
base de ESLint e configs auxiliares (`.knip.json`, `.jscpd.json`,
`lighthouserc.json`). Rodar uma vez por projeto, antes da primeira
execução do protocolo — e revisitar quando uma etapa nova entra em uso
(por exemplo, quando o projeto adota TypeScript e passa a valer a pena
ligar `type_coverage_minimo`, ver `references/config-schema.md`).

**O que `/dd:setup` faz sozinho, nesta versão:** propõe e escreve
`.dd/config.yml`, depois de aprovação — ver `skills/setup/SKILL.md`. O
conteúdo abaixo (instalar dependências, criar `tsconfig.json`, configurar
ESLint, `.knip.json`) é material que a skill pode oferecer como passo
seguinte, item por item, sempre com a mesma regra: propor e esperar
aprovação antes de escrever qualquer arquivo ou rodar qualquer instalação.
Nada aqui roda ou se escreve sozinho.

**Exceção explícita — seção 8 (CI/CD):** esta versão do plugin **não**
instala workflow de CI. Ver a nota no início daquela seção antes de usar
o conteúdo.

## 1. Instalar ferramentas

Tudo dev dependency. Ajustar conforme o stack do projeto.

```bash
# Etapa 1 (higiene)
npm i -D knip ts-prune depcheck madge

# Etapa 2 (types)
npm i -D type-coverage @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm i zod  # ou valibot
npm i -D @total-typescript/ts-reset  # ts-reset

# Etapa 3 (boundaries)
npm i -D eslint-plugin-boundaries dependency-cruiser

# Etapa 4 (DRY)
npm i -D jscpd eslint-plugin-sonarjs

# Etapa 5 (errors)
npm i react-error-boundary
npm i -D eslint-plugin-promise

# Etapa 6 (testes)
npm i -D @stryker-mutator/core @stryker-mutator/typescript-checker
# Já assumindo Vitest/Jest + Playwright instalados

# Etapa 7 (observabilidade) — depende do perfil escolhido

# Etapa 9 (performance)
npm i -D @lhci/cli size-limit @size-limit/preset-app

# Etapa 10 (acessibilidade)
npm i -D @axe-core/playwright eslint-plugin-jsx-a11y

# Etapa 11 (segurança)
# gitleaks: binário standalone, instalar via brew/apt/scoop
# osv-scanner: binário standalone
# semgrep: pip install semgrep ou brew

npm i -D eslint-plugin-security eslint-plugin-no-unsanitized
```

## 2. Scripts no `package.json`

```json
{
  "scripts": {
    "protocolo:01-clean": "knip && ts-prune && depcheck",
    "protocolo:02-types": "tsc --noEmit && type-coverage --at-least 99",
    "protocolo:04-dup": "jscpd src",
    "protocolo:06-tests": "vitest run --coverage && stryker run",
    "protocolo:09-perf": "lhci autorun && size-limit",
    "protocolo:10-a11y": "playwright test --grep @a11y",
    "protocolo:11-sec": "gitleaks detect && osv-scanner --lockfile=package-lock.json && semgrep --config=auto && npm audit --audit-level=high",
    "protocolo:all": "npm run protocolo:01-clean && npm run protocolo:02-types && npm run protocolo:04-dup && npm run protocolo:06-tests && npm run protocolo:09-perf && npm run protocolo:10-a11y && npm run protocolo:11-sec"
  }
}
```

## 3. `tsconfig.json` recomendado

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

Projeto sem TypeScript: não force a migração como parte do setup. Ver
`references/stacks/runtime-js.md` para o gate equivalente sobre a trilha
JS — a Etapa 2 tem um caminho próprio para esse caso, e o gate
`type_coverage_minimo` fica `null` com o motivo comentado ao lado (ver
`references/config-schema.md`).

## 4. ESLint config base

```js
// eslint.config.js (flat config) ou .eslintrc
module.exports = {
  plugins: [
    '@typescript-eslint',
    'unused-imports',
    'boundaries',
    'sonarjs',
    'security',
    'no-unsanitized',
    'jsx-a11y',
    'promise',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    'unused-imports/no-unused-imports': 'error',
    'sonarjs/no-duplicate-string': 'warn',
    'sonarjs/no-identical-functions': 'error',
    'security/detect-eval-with-expression': 'error',
    'no-unsanitized/method': 'error',
    'no-unsanitized/property': 'error',
  },
};
```

## 5. `.knip.json`

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": ["app/**/*.{ts,tsx}", "src/main.{ts,tsx}"],
  "project": ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
  "ignore": ["**/*.test.*", "**/*.spec.*"]
}
```

## 6. `.jscpd.json`

```json
{
  "threshold": 1,
  "minTokens": 50,
  "ignore": ["**/*.test.*", "**/*.spec.*", "**/dist/**", "**/build/**"],
  "format": ["typescript", "tsx", "javascript", "jsx"]
}
```

## 7. `lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

## 8. CI/CD — referência apenas; instalação automatizada é v0.3

**Esta versão do plugin (v0.1) não instala workflow de CI.** O gate de
projeto automatizado — o workflow `dd-gate.yml`, dentro de `ci/github/`
neste plugin, com os jobs `critico` e `qualidade` descritos na spec,
§6.4 — é trabalho de v0.3. Se você é um
agente executando `/dd:setup` ou `skills/setup/SKILL.md`: **não crie
`.github/workflows/*.yml` a partir do conteúdo abaixo.** O bloco existe
como referência de desenho — o que um pipeline de CI para este protocolo
precisa cobrir — não como um arquivo pronto pra copiar. Quando v0.3
implementar isso, o desenho final segue a spec (dois jobs, `critico`
reprovando o PR nos sete checks de bloqueio duro do núcleo; `qualidade`
nunca reprovando), não necessariamente os nomes de job abaixo, que vêm de
uma versão anterior deste material.

`.github/workflows/protocolo.yml` (exemplo histórico, não prescritivo):

```yaml
name: Protocolo de Sanitização

on:
  pull_request:
    branches: [main]
  push:
    tags: ['v*']

jobs:
  rapido:
    name: Etapas rápidas (todo PR)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # pra git diff completo
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      - name: Etapa 1 — higiene
        run: npm run protocolo:01-clean
        continue-on-error: true  # report-only no PR

      - name: Etapa 2 — types
        run: npm run protocolo:02-types

      - name: Etapa 4 — duplicação
        run: npm run protocolo:04-dup
        continue-on-error: true

      - name: Etapa 11 — segurança (rápido)
        run: |
          npm audit --audit-level=high
          npx gitleaks detect --no-banner
          npx osv-scanner --lockfile=package-lock.json

  completo:
    name: Protocolo completo (tags e main)
    if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      - run: npm run protocolo:all
```

## 9. Pre-commit com Husky + lint-staged

```bash
npm i -D husky lint-staged
npx husky init
```

`.husky/pre-commit`:
```bash
npx lint-staged
```

`package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "tsc --noEmit -p tsconfig.json --pretty false"
    ]
  }
}
```

E `gitleaks` standalone como hook adicional:
```bash
# .husky/pre-commit
npx lint-staged
gitleaks protect --staged --no-banner
```

Isto é um git hook local (Husky), independente dos hooks de Claude Code
(`PreToolUse`/`PostToolUse`) descritos na spec, §6.3 — aqueles são v0.2 e
não fazem parte deste material.

## 10. Renovate ou Dependabot

`renovate.json`:
```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended", ":dependencyDashboard"],
  "schedule": ["before 5am on monday"],
  "labels": ["dependencies"],
  "vulnerabilityAlerts": { "enabled": true },
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "matchPackagePatterns": ["*"],
      "groupName": "minor + patch"
    }
  ]
}
```

## 11. Estrutura recomendada do projeto

```
projeto/
├── .protocolo/              # outputs versionados (relatórios)
│   ├── 2025-01-15-1830/
│   └── 2025-01-22-0945/
├── docs/
│   ├── critical-flows.md    # fluxos críticos pra Etapa 6
│   ├── adr/                 # Architecture Decision Records
│   └── runbooks/            # runbooks dos alertas (Etapa 7)
├── src/
│   ├── app/                 # Next.js routes ou equivalente
│   ├── components/          # UI puro
│   ├── features/            # composições por feature
│   ├── domain/              # lógica de negócio pura (Etapa 3)
│   ├── services/            # acesso a API/SDK (Etapa 3)
│   └── lib/                 # utils, schemas, logger
└── e2e/                     # testes Playwright/Detox/Maestro
```

## 12. `.gitignore` recomendado

```gitignore
# Artefatos brutos do protocolo (manter só relatórios)
.protocolo/*/06-lhci/
.protocolo/*/04-jscpd/
.protocolo/*/06-mutation/
# Manter relatórios
!.protocolo/*/report.md
!.protocolo/*/*.txt
!.protocolo/*/*.json
```

Decidir caso a caso o que vale versionar — os relatórios `report.md` valem; logs gigantes não.

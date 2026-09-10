# Variação de plataforma — React Native / Expo

Carregue este arquivo quando detectar:
- `app.json` ou `app.config.*` com configuração Expo.
- Dependência `react-native` ou `expo`.
- Pastas `ios/`, `android/`.

Adapta as etapas 6, 9, 10 e 11 do protocolo. As outras etapas (1, 2, 3, 4, 5, 7, 8, 12) seguem o SKILL.md principal com adaptações pequenas.

## Etapa 6 (testes) — adaptações RN

- E2E com **Detox** ou **Maestro** (Playwright/Cypress não rodam em RN).
- Testes em **device físico** + simulador. Comportamento de gestos, foco em input, teclado, push notification só aparece em device.
- Snapshot tests com **react-native-testing-library** + `toJSON()` — cuidado com snapshots gigantes.

## Etapa 9 (performance) — RN/Expo

**Procurar:**
- `FlatList` sem `keyExtractor`, sem `getItemLayout` em listas com altura fixa, sem `windowSize` ajustado.
- Listas longas usando `ScrollView` em vez de `FlatList`/`FlashList`.
- Animações em JS thread (usar `react-native-reanimated` com worklets).
- `Image` sem dimensões fixas (layout shift).
- Imagens remotas sem cache (preferir `expo-image` ou `react-native-fast-image`).
- Re-renders disparados por contexto global mal segmentado.
- Hermes não habilitado (Hermes deve ser default).
- `console.log` em produção (lento via JSI).
- Bundle grande sem code splitting (RAM bundles ou `expo-router` lazy).

**Ferramentas:**
- React Native DevTools.
- `react-native-performance` para custom marks.
- Reanimated Profiler.
- `expo-doctor` para auditoria de config.
- `react-native-bundle-visualizer`.

**Comandos:**
```bash
npx expo-doctor > .protocolo/$STAMP/09-expo-doctor.txt
npx react-native-bundle-visualizer > .protocolo/$STAMP/09-bundle.txt
```

**Alvos:**
- Tempo até interatividade da tela inicial < 2s em device médio.
- 60fps em scroll de listas principais.
- Bundle JS < 4MB (varia conforme produto).

## Etapa 10 (acessibilidade) — RN/Expo

- **`accessibilityLabel`** em todo elemento interativo.
- **`accessibilityRole`** declarado (`button`, `link`, `header`, etc.).
- **`accessibilityHint`** quando a ação não é óbvia.
- **`accessibilityState`** pra estados (`selected`, `disabled`, `checked`).
- **`importantForAccessibility`** pra ocultar decorativos do leitor.
- **Tamanho mínimo de touch target:** 44x44pt (Apple HIG) / 48x48dp (Material).
- **Suporte a Dynamic Type** (iOS) e font scaling (Android).
- **VoiceOver** (iOS) e **TalkBack** (Android) testados nos fluxos críticos — não só simulador.

## Etapa 11 (segurança) — RN/Expo

### Secrets
- **`EXPO_PUBLIC_*` é embarcado no app** — qualquer um com o APK/IPA lê. Nunca usar para chaves de API privadas.
- Chaves sensíveis ficam no backend; o app fala com seu próprio backend.
- Em runtime, secrets do dispositivo: `expo-secure-store` (KeyChain iOS / Keystore Android).

### Armazenamento local
- **`AsyncStorage` NÃO é seguro.** Apenas dados não-sensíveis.
- Tokens de autenticação: `expo-secure-store`.
- Dados sensíveis em SQLite local: criptografia em camada de aplicação.

### Rede
- TLS 1.2+.
- Certificate pinning para apps de alta sensibilidade (`react-native-ssl-pinning`).
- App Transport Security (iOS) sem exceções.
- `usesCleartextTraffic=false` no Android.

### Deep links
- Validar parâmetros como hostis (vêm de qualquer app).
- Universal Links (iOS) / App Links (Android) preferidos sobre custom schemes.

### Permissões
- Pedir só o que usa.
- Justificar no manifesto (iOS exige descrição em `Info.plist`).
- Revisar `app.json` / `app.config.js` para permissões herdadas de libs.

### Build e distribuição
- ProGuard/R8 habilitado no Android release.
- Hermes habilitado (bytecode mais difícil de inspecionar).
- Code signing válido, sem certificados expirados.
- OTA updates (EAS Update): assinados, rollback configurado.

### SAST específicos
- `MobSF` (Mobile Security Framework) para análise estática do APK/IPA.
- `semgrep --config=p/react-native`.

### OWASP MASVS
Para apps com requisitos altos, consultar [OWASP MASVS](https://mas.owasp.org/MASVS/) e [MASTG](https://mas.owasp.org/MASTG/) além do Top 10 web.

**Comandos:**
```bash
# MobSF (após `eas build` ou `gradlew assembleRelease`):
mobsfscan ./android > .protocolo/$STAMP/11-mobsfscan.txt

# Auditoria de config Expo:
npx expo-doctor > .protocolo/$STAMP/11-expo-doctor.txt

# Permissões declaradas:
npx expo config --type prebuild | jq '.android.permissions, .ios.infoPlist' > .protocolo/$STAMP/11-permissions.json
```

## Etapa 12 (gate) — adicional pra RN/Expo

- [ ] Testado em iOS e Android (devices físicos, não só simulador).
- [ ] Tamanho de download na App Store/Play Store dentro do alvo.
- [ ] Permissões justificadas e mínimas.
- [ ] Crashlytics ou equivalente reportando.
- [ ] OTA update plan (se EAS Update): canal, rollout, rollback.
- [ ] E2E com Detox/Maestro nos happy paths críticos.
- [ ] Compatibilidade com versões mínimas suportadas (iOS / Android) validada.

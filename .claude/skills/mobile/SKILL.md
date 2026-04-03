---
name: mobile
description: Mobile-first React Native + Expo development. TDD with React Native Testing Library, Detox E2E, NativeWind styling, EAS Build pipeline. Hexagonal architecture adapted for mobile.
disable-model-invocation: true
argument-hint: [scope: scaffold | feature | qa | release]
---

# /mobile — React Native Mobile-First Development

> Mobile-first development com React Native + Expo. Arquitetura hexagonal adaptada: domain puro, screens como adapters, navigation como infrastructure.
> Substitui `/browser-qa` por Detox E2E. Substitui Cypress por React Native Testing Library + Detox.

---

## Stack padrão

| Camada | Tecnologia |
|--------|------------|
| Framework | React Native + Expo SDK (latest stable) |
| Linguagem | TypeScript (strict) |
| Navegação | React Navigation v7 (Stack + Tab + Drawer) |
| Estilo | NativeWind v4 (Tailwind para React Native) |
| State global | Zustand |
| Server state | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| HTTP | Axios (com interceptors OTel) |
| Storage local | AsyncStorage + Expo SecureStore (secrets) |
| Push notifications | Expo Notifications |
| Icons | @expo/vector-icons (Ionicons/MaterialCommunityIcons) + lucide-react-native |
| Animações | React Native Reanimated 3 (native thread) |
| Loading states | react-native-skeleton-placeholder + lottie-react-native |
| Haptics | expo-haptics |
| Tests unitários | Jest + React Native Testing Library |
| E2E | Detox |
| Build | EAS Build (Expo Application Services) |

---

## Arquitetura (hexagonal adaptada para mobile)

```
src/
  domain/            Entidades e regras de negócio puras. Zero deps externos.
  application/       Use cases. Depende de domain + ports only.
  ports/             Interfaces (contratos de adapters).
  infrastructure/
    api/             Adapters HTTP (Axios clients).
    storage/         Adapters AsyncStorage / SecureStore.
    notifications/   Adapters push notifications.
    analytics/       Adapters analytics / crash reporting.
  screens/           Telas (adapters — entry points do usuário).
  navigation/        Estrutura React Navigation (infrastructure).
  components/        Componentes UI compartilhados.
  shared/            Config, utils, theme, constants.
tests/
  unit/              Jest + RNTL por componente/use case.
  e2e/               Detox — fluxos completos.
  bdd/               Cucumber.js (Gherkin scenarios).
```

**Regras de camada (mesmo do hexagonal web):**
- `domain/` → zero imports de `react-native`, `expo`, `axios`
- `application/` → imports de `domain/` e `ports/` somente
- `screens/` → nunca importa `infrastructure/` diretamente — passa por `application/`

---

## Scope: scaffold

> Inicializar projeto React Native do zero.

### Fase 1 — Bootstrap

```bash
# Criar projeto Expo
rtk npx create-expo-app@latest [nome] --template expo-template-blank-typescript
cd [nome]

# NativeWind v4
rtk npm install nativewind tailwindcss
rtk npx tailwindcss init

# Navegação
rtk npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
rtk npm install react-native-screens react-native-safe-area-context react-native-gesture-handler

# State + Query
rtk npm install zustand @tanstack/react-query axios

# Forms
rtk npm install react-hook-form zod @hookform/resolvers

# Storage
rtk npm install @react-native-async-storage/async-storage expo-secure-store

# Tests
rtk npm install -D jest @testing-library/react-native @testing-library/jest-native detox

# Tipos
rtk npm install -D @types/react @types/react-native
```

### Fase 2 — Estrutura de pastas

Criar estrutura conforme arquitetura acima. Gerar arquivos base:
- `src/shared/theme.ts` — palette, typography, spacing
- `src/navigation/RootNavigator.tsx` — estrutura de navegação raiz
- `src/navigation/AuthNavigator.tsx` — stack de auth
- `src/navigation/AppNavigator.tsx` — stack de app autenticado
- `tailwind.config.js` — configurado para RN

### Fase 3 — Design system mobile

Criar em `src/components/ui/`:
- `Button.tsx` — variantes: primary, secondary, ghost, danger
- `Input.tsx` — com label, erro, ícone
- `Card.tsx` — com sombra adaptada por plataforma
- `Typography.tsx` — h1→h4, body, caption, label
- `Screen.tsx` — wrapper com SafeAreaView + KeyboardAvoidingView
- `LoadingSpinner.tsx`
- `EmptyState.tsx` — com ícone + mensagem + ação opcional

Todos com suporte a dark mode via NativeWind `dark:` classes.

### Fase 4 — Auth scaffold

Implementar estrutura de auth:
- `src/domain/auth/` — entidades User, Token, AuthError
- `src/ports/AuthPort.ts` — interface AuthService
- `src/application/auth/` — use cases: login, logout, register, refreshToken
- `src/infrastructure/api/AuthAdapter.ts` — implementação HTTP
- `src/screens/auth/` — LoginScreen, RegisterScreen, ForgotPasswordScreen
- Auth state no Zustand: `src/shared/stores/authStore.ts`
- Protected routes via navigation: `AppNavigator` só acessível quando autenticado

### Fase 5 — Requisitos obrigatórios App Store / Play Store

> Criar junto com o scaffold. Não é feature opcional — é requisito de aprovação nas lojas.

#### Apple App Store — obrigatórios

**1. Exclusão de conta (obrigatório desde junho 2023)**

Todo app com criação de conta DEVE oferecer exclusão de conta dentro do app.

```typescript
// src/screens/settings/DeleteAccountScreen.tsx
// Fluxo:
// 1. Tela de confirmação com aviso claro do que será deletado
// 2. Confirmação adicional (digitar "DELETAR" ou reautenticar)
// 3. Haptics.notificationAsync(NotificationFeedbackType.Warning) antes de confirmar
// 4. Chamar API DELETE /auth/account
// 5. Limpar SecureStore + AsyncStorage + auth state
// 6. Navegar para AuthNavigator (logout total)

// A tela deve estar acessível em: Settings → Conta → Deletar conta
```

**2. Política de Privacidade (obrigatório)**
- URL da privacy policy configurada no App Store Connect
- Link acessível dentro do app: Settings → Política de Privacidade
- Deve abrir `Linking.openURL(PRIVACY_POLICY_URL)` ou WebView interna
- Manter URL em `src/shared/constants/legal.ts`

**3. Termos de Uso (fortemente recomendado, obrigatório para compras)**
- Link acessível: Settings → Termos de Uso
- Aceite no primeiro login/registro (checkbox + timestamp gravado)

**4. App Privacy Nutrition Label**
- Configurar no App Store Connect quais dados o app coleta
- Documentar em `docs/privacy/data-collected.md` (facilita preenchimento)

```typescript
// src/shared/constants/legal.ts
export const LEGAL = {
  PRIVACY_POLICY_URL: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL!,
  TERMS_OF_USE_URL: process.env.EXPO_PUBLIC_TERMS_URL!,
  SUPPORT_URL: process.env.EXPO_PUBLIC_SUPPORT_URL!,
};
```

#### Telas obrigatórias no SettingsNavigator

```typescript
// src/navigation/SettingsNavigator.tsx — incluir sempre:
// - SettingsScreen (hub)
// - PrivacyPolicyScreen → abre URL
// - TermsOfUseScreen → abre URL
// - DeleteAccountScreen → fluxo de exclusão (se app tem auth)
// - ContactSupportScreen → abre email ou URL de suporte
```

#### Play Store — obrigatórios

- **Política de Privacidade**: URL obrigatória no Play Console para apps que coletam dados
- **Data Safety Section**: declarar quais dados são coletados/compartilhados no Play Console
- **Target API Level**: manter `targetSdkVersion` atualizado (Google exige versão atual)
- Exclusão de conta: não obrigatória pelo Play Store, mas fortemente recomendada (paridade iOS)

#### Gate de aprovação nas lojas

```
⛔ GATE STORE COMPLIANCE:
  □ DeleteAccountScreen implementada e acessível em Settings
  □ PrivacyPolicyScreen com URL válida
  □ TermsOfUseScreen com URL válida (se app tem compras: obrigatório)
  □ LEGAL constants configuradas em .env
  □ Aceite de termos no registro (timestamp gravado)
  □ docs/privacy/data-collected.md criado
  Sem estes itens → app será rejeitado na App Store.
```

---

---

## UX Quality — Nielsen Heuristics + Platform Conventions

> Aplicar em toda tela e componente. Não é opcional — é qualidade mínima aceitável.

### 10 Heurísticas de Nielsen aplicadas ao mobile

| # | Heurística | Aplicação mobile |
|---|-----------|-----------------|
| 1 | Visibilidade do status do sistema | Loading states sempre visíveis: skeleton, spinner, progress bar. Nunca operação silenciosa > 300ms |
| 2 | Correspondência com o mundo real | Labels nativos da plataforma (iOS: "Cancel", Android: "Cancelar" em PT, ícone Back ← não ✕) |
| 3 | Controle e liberdade do usuário | Back sempre disponível. Desfazer em ações destrutivas. Swipe-back em iOS nunca bloqueado |
| 4 | Consistência e padrões | Seguir convenções da plataforma (ver abaixo). Não inventar padrões de navegação |
| 5 | Prevenção de erros | Botão destrutivo desabilitado até confirmação. Dialog de confirmação antes de deletar |
| 6 | Reconhecimento em vez de lembrança | Ações contextuais visíveis (não em menu oculto). Labels em ícones quando há espaço |
| 7 | Flexibilidade e eficiência | Swipe gestures para power users. Atalhos para ações frequentes |
| 8 | Design estético e minimalista | Uma ação primária por tela. Hierarquia visual clara. Sem informação desnecessária |
| 9 | Reconhecimento, diagnóstico e recuperação de erros | Mensagem específica (não "Erro desconhecido"). Ação de recuperação sempre presente |
| 10 | Ajuda e documentação | Onboarding em features complexas. Tooltips em ícones sem label |

### Convenções de Plataforma

**iOS (Human Interface Guidelines):**
- Navigation bar no topo, Tab bar na base
- Swipe-to-go-back (nunca interceptar o gesto padrão)
- Large Title em telas de entrada de seções
- SF Symbols style (rounded, stroked) para ícones — usar Ionicons como aproximação
- Botão destrutivo sempre vermelho, sempre último
- Pull-to-refresh nativo (`RefreshControl`)
- Action Sheet para menus com múltiplas opções
- Sheets modais com drag handle visível

**Android (Material Design 3):**
- Top App Bar (não navigation bar no estilo iOS)
- FAB (Floating Action Button) para ação primária
- Bottom Navigation para 3-5 destinos principais
- Ripple effect em todo elemento tappable (`android_ripple`)
- Snackbar para feedback de ação (não Alert)
- Material Icons style (rounded ou outlined)
- Back button do dispositivo deve funcionar sempre

**Implementação com `Platform.OS`:**
```typescript
import { Platform } from 'react-native';

const styles = {
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1 },
      android: { elevation: 2 },
    }),
  },
};
```

### Haptic Feedback — Padrão de uso

```typescript
import * as Haptics from 'expo-haptics';

// Light — seleção, toggle, switch
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium — botão primário, confirmação
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Heavy — ação irreversível (delete, logout)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Success — operação concluída com sucesso
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error — falha, validação inválida
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Warning — ação de risco, confirmação necessária
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
```

Regra: **todo botão primário tem haptic Medium**. Elementos de lista selecionados têm haptic Light. Erros têm haptic Error. Nunca haptic em scroll ou ações passivas.

### Loading States — Hierarquia de escolha

1. **Skeleton screen** — para conteúdo que tem forma definida (cards, listas, perfis)
2. **Lottie** — para empty states, onboarding, success/error com personalidade
3. **ActivityIndicator nativo** — somente para operações globais (login, submit)
4. Spinner por componente individual = anti-pattern

```typescript
// Skeleton com shimmer
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const CardSkeleton = () => (
  <SkeletonPlaceholder borderRadius={8}>
    <SkeletonPlaceholder.Item width="100%" height={120} />
    <SkeletonPlaceholder.Item marginTop={8} width="60%" height={16} />
    <SkeletonPlaceholder.Item marginTop={4} width="80%" height={12} />
  </SkeletonPlaceholder>
);

// Lottie para empty state
import LottieView from 'lottie-react-native';

const EmptyState = ({ title, subtitle, animationSource }) => (
  <View style={styles.container}>
    <LottieView source={animationSource} autoPlay loop style={styles.animation} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);
```

### Animações Mobile — Reanimated 3

```typescript
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// Entrada de item de lista com stagger
const ListItem = ({ item, index }) => (
  <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
    <ItemContent item={item} />
  </Animated.View>
);

// Botão com feedback de press
const AnimatedButton = ({ onPress, children }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={onPress}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
};
```

### Iconografia mobile

- **Ionicons** (via `@expo/vector-icons`) — style iOS nativo, padrão para apps com iOS focus
- **MaterialCommunityIcons** (via `@expo/vector-icons`) — style Android nativo
- **lucide-react-native** — quando paridade visual com web é necessária
- Regra: **nunca emojis como ícones funcionais**
- Regra: tamanho mínimo 20px, área tappable mínima 44pt (iOS) / 48dp (Android)
- Regra: consistência de estilo — não misturar Ionicons + Material no mesmo layout

---

## Scope: feature

> Implementar uma feature mobile seguindo TDD. Adapta o `/feature-dev` 7 fases para mobile.

### Fase 1 — BDD Scenarios

Escrever Gherkin em `tests/bdd/features/[feature].feature` antes de qualquer código.
Mobile-specific scenarios incluem:
- `Given the app is on foreground`
- `Given the device is offline`
- `When the user pulls to refresh`
- `When the user swipes left on [item]`

### Fase 2 — Domain RED (testes failing)

Tests em `tests/unit/domain/[feature].test.ts`.
Usar Jest puro (sem RN) para domain — é TypeScript puro.

### Fase 3 — Domain GREEN

Implementar entidades e regras em `src/domain/[feature]/`.

### Fase 4 — Use Cases RED → GREEN

Tests em `tests/unit/application/[feature].test.ts`.
Mockar ports. Sem RN, sem HTTP.

### Fase 5 — Infrastructure + Screen RED → GREEN

Tests de componentes com RNTL:

```typescript
import { render, fireEvent, screen } from '@testing-library/react-native';

it('should show product list when loaded', async () => {
  render(<ProductListScreen />);
  expect(await screen.findByText('Product A')).toBeTruthy();
});

it('should navigate to detail on tap', () => {
  const { getByText } = render(<ProductListScreen />);
  fireEvent.press(getByText('Product A'));
  expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { id: '1' });
});
```

Princípios RNTL:
- `getByRole`, `getByLabelText`, `getByText` — não `getByTestId`
- Testar comportamento, não implementação
- `fireEvent.press()` para taps, `fireEvent.changeText()` para inputs
- `waitFor` e `findBy*` para operações assíncronas

### Fase 6 — Detox E2E

Escrever specs em `tests/e2e/[feature].e2e.ts`:

```typescript
describe('Product List', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should load and display products', async () => {
    await expect(element(by.id('product-list'))).toBeVisible();
    await expect(element(by.text('Product A'))).toBeVisible();
  });

  it('should navigate to detail on tap', async () => {
    await element(by.text('Product A')).tap();
    await expect(element(by.id('product-detail-screen'))).toBeVisible();
  });
});
```

Rodar:
```bash
rtk npx detox build --configuration ios.sim.debug
rtk npx detox test --configuration ios.sim.debug tests/e2e/[feature].e2e.ts
```

### Fase 7 — Review + Performance

- `FlashList` (Shopify) em vez de `FlatList` para listas longas (> 50 itens)
- `React.memo` para componentes de lista que não mudam
- `useCallback` em handlers passados a filhos
- Verificar: sem `console.log` em produção, sem imagens não otimizadas

---

## Scope: qa

> QA exaustivo mobile — substitui `/browser-qa` para projetos React Native.

### Dimensões de QA mobile

**Visual (ambas plataformas)**
- iOS Simulator (iPhone 14, 375pt): sem overflow, sem clip
- Android Emulator (Pixel 5, 360dp): sem overflow, sem clip
- Dark mode: testar em `Appearance.getColorScheme() === 'dark'`
- Landscape: elementos se adaptam?

**Interações**
- Todo `TouchableOpacity`/`Pressable` tem feedback visual (`activeOpacity` ou `android_ripple`)
- Long press onde esperado (menus contextuais)
- Pull-to-refresh em listas
- Swipe gestures (se aplicável)

**Teclado**
- Inputs empurram conteúdo com `KeyboardAvoidingView`
- Teclado fecha ao tocar fora (ou em Submit)
- `returnKeyType` correto por tipo de campo
- Sequência de `nextFocus` lógica

**Offline / Edge cases**
- App carrega sem internet (cache local)
- Erro amigável quando sem conexão
- Ação de retry disponível

**Acessibilidade**
- Todo elemento interativo tem `accessibilityLabel`
- Todo elemento de texto tem contraste mínimo WCAG AA
- Suporte a TalkBack/VoiceOver (pelo menos fluxo principal)
- `accessibilityRole` correto em botões, links, imagens

**Performance**
- FlatList/FlashList com `keyExtractor` único
- Imagens com `resizeMode` correto e tamanho adequado
- Sem re-renders desnecessários (verificar com React DevTools Profiler)
- Tempo de startup < 3s em device real

### Gate QA

```
⛔ GATE MOBILE QA:
  □ RNTL: 0 failures
  □ Detox E2E: 0 failures
  □ iOS render: sem overflow/clip (iPhone 14 375pt)
  □ Android render: sem overflow/clip (Pixel 5 360dp)
  □ Dark mode: sem texto ilegível, sem componente quebrado

  UX (Nielsen):
  □ Todo loading > 300ms tem skeleton ou spinner visível
  □ Nenhuma operação silenciosa (sem feedback visual/haptic)
  □ Back navigation funciona em todas as telas
  □ Botões destrutivos têm confirmação
  □ Erros têm mensagem específica + ação de recuperação

  Plataforma:
  □ iOS: swipe-back não interceptado, Tab bar na base
  □ Android: hardware back button funciona, ripple em tappables
  □ Platform.OS usado onde convenções divergem

  Haptics:
  □ Botão primário tem Haptics.Medium
  □ Ações destrutivas têm Haptics.Heavy + Haptics.Error
  □ Seleção de item tem Haptics.Light

  Acessibilidade:
  □ Todo interativo tem accessibilityLabel
  □ accessibilityRole correto em botões, links, imagens
  □ Touch targets ≥ 44pt (iOS) / 48dp (Android)
  □ Contraste WCAG AA em modo claro e escuro

  □ Offline: erro amigável + retry disponível
  Fix loop automático (máx 3 iterações) antes de escalar.
```

---

## Scope: release

> Build e release via EAS.

### Setup EAS (primeira vez)

```bash
rtk npm install -g eas-cli
rtk eas login
rtk eas build:configure
```

Configura `eas.json` com perfis:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

### Build

```bash
# Preview build (TestFlight / Play Console internal)
rtk eas build --platform ios --profile preview
rtk eas build --platform android --profile preview

# Production build
rtk eas build --platform all --profile production
```

### Submit

```bash
# iOS → TestFlight
rtk eas submit --platform ios --latest

# Android → Play Store internal track
rtk eas submit --platform android --latest
```

### OTA Updates (sem nova build)

```bash
# Publish update instantânea para todos os usuários
rtk eas update --branch production --message "fix: [descrição]"
```

---

## Diferenças vs. web (guia rápido)

| Web | Mobile (RN) |
|-----|-------------|
| Cypress E2E | Detox E2E |
| `/browser-qa` | `/mobile qa` |
| shadcn/ui | Componentes customizados + NativeWind |
| CSS flexbox | StyleSheet flexbox (column-first por padrão) |
| `onClick` | `onPress` |
| `<div>` | `<View>` |
| `<p>`, `<span>` | `<Text>` |
| `<img>` | `<Image>` |
| `<input>` | `<TextInput>` |
| `<a>` | `navigation.navigate()` |
| localStorage | AsyncStorage / SecureStore |
| `window.fetch` | Axios (com interceptors) |
| React Router | React Navigation |
| Responsive CSS | Platform.OS + Dimensions API |
| `window.alert` | `Alert.alert()` |

---

## Foundation Protocol (mobile)

Para qualquer app com UI, Foundation antes de qualquer feature:

### [M-3a] Design System + Navigation Base

1. Instalar e configurar NativeWind + tema (cores, fontes, dark/light mode)
2. Criar componentes base (`Button`, `Input`, `Screen`, `Typography`, `Card`)
3. Configurar `RootNavigator` + `AuthNavigator` + `AppNavigator`
4. Testar renderização em iOS simulator + Android emulator

```
⛔ GATE [M-3a]: /mobile qa
  □ Componentes renderizam sem erro em iOS e Android
  □ Dark mode funciona
  □ Navegação entre telas funciona
  PASS obrigatório antes de qualquer feature
```

### [M-3b] Auth — Register / Login / Logout

1. Implementar fluxo completo: register, login, logout, refresh token, proteção de rotas
2. Escrever Detox specs: `tests/e2e/auth.e2e.ts`
3. `rtk npx detox test tests/e2e/auth.e2e.ts`

```
⛔ GATE [M-3b]: /mobile qa (escopo: auth)
  Se auth falha → TODO o build para
  Sem exceções.
```

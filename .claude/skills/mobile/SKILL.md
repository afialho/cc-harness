---
name: mobile
description: Mobile-first React Native + Expo development. TDD with React Native Testing Library, Detox E2E, NativeWind styling, EAS Build pipeline. Hexagonal architecture adapted for mobile.
disable-model-invocation: true
argument-hint: [scope: scaffold | feature | qa | release]
---

# /mobile — React Native Mobile-First Development

> Mobile-first development with React Native + Expo. Adapted hexagonal architecture: pure domain, screens as adapters, navigation as infrastructure.
> Replaces `/browser-qa` with Detox E2E. Replaces Cypress with React Native Testing Library + Detox.

---

## Default stack

| Layer | Technology |
|--------|------------|
| Framework | React Native + Expo SDK (latest stable) |
| Language | TypeScript (strict) |
| Navigation | React Navigation v7 (Stack + Tab + Drawer) |
| Styling | NativeWind v4 (Tailwind for React Native) |
| State global | Zustand |
| Server state | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| HTTP | Axios (com interceptors OTel) |
| Local storage | AsyncStorage + Expo SecureStore (secrets) |
| Push notifications | Expo Notifications |
| Icons | @expo/vector-icons (Ionicons/MaterialCommunityIcons) + lucide-react-native |
| Animations | React Native Reanimated 3 (native thread) |
| Loading states | react-native-skeleton-placeholder + lottie-react-native |
| Haptics | expo-haptics |
| Unit tests | Jest + React Native Testing Library |
| E2E | Detox |
| Build | EAS Build (Expo Application Services) |

---

## Architecture (hexagonal adapted for mobile)

```
src/
  domain/            Pure business entities and rules. Zero external deps.
  application/       Use cases. Depends on domain + ports only.
  ports/             Interfaces (adapter contracts).
  infrastructure/
    api/             HTTP adapters (Axios clients).
    storage/         AsyncStorage / SecureStore adapters.
    notifications/   Push notification adapters.
    analytics/       Analytics / crash reporting adapters.
  screens/           Screens (adapters — user entry points).
  navigation/        React Navigation structure (infrastructure).
  components/        Shared UI components.
  shared/            Config, utils, theme, constants.
tests/
  unit/              Jest + RNTL per component/use case.
  e2e/               Detox — complete flows.
  bdd/               Cucumber.js (Gherkin scenarios).
```

**Layer rules (same as hexagonal web):**
- `domain/` → zero imports from `react-native`, `expo`, `axios`
- `application/` → imports from `domain/` and `ports/` only
- `screens/` → never imports `infrastructure/` directly — goes through `application/`

---

## Scope: scaffold

> Initialize React Native project from scratch.

### Phase 1 — Bootstrap

```bash
# Create Expo project
rtk npx create-expo-app@latest [nome] --template expo-template-blank-typescript
cd [nome]

# NativeWind v4
rtk npm install nativewind tailwindcss
rtk npx tailwindcss init

# Navigation
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

# Types
rtk npm install -D @types/react @types/react-native
```

### Phase 2 — Folder structure

Create structure according to architecture above. Generate base files:
- `src/shared/theme.ts` — palette, typography, spacing
- `src/navigation/RootNavigator.tsx` — root navigation structure
- `src/navigation/AuthNavigator.tsx` — auth stack
- `src/navigation/AppNavigator.tsx` — authenticated app stack
- `tailwind.config.js` — configured for RN

### Phase 3 — Mobile design system

Create in `src/components/ui/`:
- `Button.tsx` — variants: primary, secondary, ghost, danger
- `Input.tsx` — with label, error, icon
- `Card.tsx` — with platform-adapted shadow
- `Typography.tsx` — h1→h4, body, caption, label
- `Screen.tsx` — wrapper with SafeAreaView + KeyboardAvoidingView
- `LoadingSpinner.tsx`
- `EmptyState.tsx` — with icon + message + optional action

All with dark mode support via NativeWind `dark:` classes.

### Phase 4 — Auth scaffold

Implement auth structure:
- `src/domain/auth/` — entities User, Token, AuthError
- `src/ports/AuthPort.ts` — AuthService interface
- `src/application/auth/` — use cases: login, logout, register, refreshToken
- `src/infrastructure/api/AuthAdapter.ts` — HTTP implementation
- `src/screens/auth/` — LoginScreen, RegisterScreen, ForgotPasswordScreen
- Auth state in Zustand: `src/shared/stores/authStore.ts`
- Protected routes via navigation: `AppNavigator` only accessible when authenticated

### Phase 5 — Mandatory App Store / Play Store Requirements

> Create alongside scaffold. This is not an optional feature — it is a store approval requirement.

#### Apple App Store — required

**1. Account deletion (required since June 2023)**

Every app with account creation MUST offer account deletion within the app.

```typescript
// src/screens/settings/DeleteAccountScreen.tsx
// Flow:
// 1. Confirmation screen with clear warning of what will be deleted
// 2. Additional confirmation (type "DELETE" or re-authenticate)
// 3. Haptics.notificationAsync(NotificationFeedbackType.Warning) before confirming
// 4. Call API DELETE /auth/account
// 5. Clear SecureStore + AsyncStorage + auth state
// 6. Navigate to AuthNavigator (full logout)

// Screen must be accessible at: Settings → Account → Delete account
```

**2. Privacy Policy (required)**
- Privacy policy URL configured in App Store Connect
- Accessible link within the app: Settings → Privacy Policy
- Must open `Linking.openURL(PRIVACY_POLICY_URL)` or internal WebView
- Keep URL in `src/shared/constants/legal.ts`

**3. Terms of Use (strongly recommended, required for purchases)**
- Accessible link: Settings → Terms of Use
- Acceptance on first login/registration (checkbox + recorded timestamp)

**4. App Privacy Nutrition Label**
- Configure in App Store Connect which data the app collects
- Document in `docs/privacy/data-collected.md` (facilitates form filling)

```typescript
// src/shared/constants/legal.ts
export const LEGAL = {
  PRIVACY_POLICY_URL: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL!,
  TERMS_OF_USE_URL: process.env.EXPO_PUBLIC_TERMS_URL!,
  SUPPORT_URL: process.env.EXPO_PUBLIC_SUPPORT_URL!,
};
```

#### Mandatory screens in SettingsNavigator

```typescript
// src/navigation/SettingsNavigator.tsx — always include:
// - SettingsScreen (hub)
// - PrivacyPolicyScreen → opens URL
// - TermsOfUseScreen → opens URL
// - DeleteAccountScreen → deletion flow (if app has auth)
// - ContactSupportScreen → opens email or support URL
```

#### Play Store — required

- **Privacy Policy**: required URL in Play Console for apps that collect data
- **Data Safety Section**: declare which data is collected/shared in Play Console
- **Target API Level**: keep `targetSdkVersion` updated (Google requires current version)
- Account deletion: not required by Play Store, but strongly recommended (iOS parity)

#### Store approval gate

```
⛔ GATE STORE COMPLIANCE:
  □ DeleteAccountScreen implemented and accessible in Settings
  □ PrivacyPolicyScreen with valid URL
  □ TermsOfUseScreen with valid URL (if app has purchases: required)
  □ LEGAL constants configured in .env
  □ Terms acceptance on registration (recorded timestamp)
  □ docs/privacy/data-collected.md created
  Without these items → app will be rejected from the App Store.
```

---

---

## UX Quality — Nielsen Heuristics + Platform Conventions

> Apply to every screen and component. This is not optional — it is minimum acceptable quality.

### Nielsen's 10 Heuristics applied to mobile

| # | Heuristic | Mobile application |
|---|-----------|-------------------|
| 1 | Visibility of system status | Loading states always visible: skeleton, spinner, progress bar. Never silent operation > 300ms |
| 2 | Match between system and real world | Platform-native labels (iOS: "Cancel", Android: platform convention, Back icon ← not ✕) |
| 3 | User control and freedom | Back always available. Undo on destructive actions. Swipe-back on iOS never blocked |
| 4 | Consistency and standards | Follow platform conventions (see below). Do not invent navigation patterns |
| 5 | Error prevention | Destructive button disabled until confirmation. Confirmation dialog before delete |
| 6 | Recognition rather than recall | Contextual actions visible (not in hidden menu). Labels on icons when there is space |
| 7 | Flexibility and efficiency of use | Swipe gestures for power users. Shortcuts for frequent actions |
| 8 | Aesthetic and minimalist design | One primary action per screen. Clear visual hierarchy. No unnecessary information |
| 9 | Help users recognize, diagnose, and recover from errors | Specific message (not "Unknown error"). Recovery action always present |
| 10 | Help and documentation | Onboarding for complex features. Tooltips on unlabeled icons |

### Platform Conventions

**iOS (Human Interface Guidelines):**
- Navigation bar at top, Tab bar at bottom
- Swipe-to-go-back (never intercept the default gesture)
- Large Title on section entry screens
- SF Symbols style (rounded, stroked) for icons — use Ionicons as approximation
- Destructive button always red, always last
- Native pull-to-refresh (`RefreshControl`)
- Action Sheet for menus with multiple options
- Modal sheets with visible drag handle

**Android (Material Design 3):**
- Top App Bar (not iOS-style navigation bar)
- FAB (Floating Action Button) for primary action
- Bottom Navigation for 3-5 main destinations
- Ripple effect on every tappable element (`android_ripple`)
- Snackbar for action feedback (not Alert)
- Material Icons style (rounded or outlined)
- Device back button must always work

**Implementation with `Platform.OS`:**
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

### Haptic Feedback — Usage pattern

```typescript
import * as Haptics from 'expo-haptics';

// Light — selection, toggle, switch
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium — primary button, confirmation
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Heavy — irreversible action (delete, logout)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Success — operation completed successfully
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error — failure, invalid validation
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Warning — risky action, confirmation needed
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
```

Rule: **every primary button has haptic Medium**. Selected list elements have haptic Light. Errors have haptic Error. Never haptic on scroll or passive actions.

### Loading States — Choice hierarchy

1. **Skeleton screen** — for content with defined shape (cards, lists, profiles)
2. **Lottie** — for empty states, onboarding, success/error with personality
3. **Native ActivityIndicator** — only for global operations (login, submit)
4. Spinner per individual component = anti-pattern

```typescript
// Skeleton with shimmer
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const CardSkeleton = () => (
  <SkeletonPlaceholder borderRadius={8}>
    <SkeletonPlaceholder.Item width="100%" height={120} />
    <SkeletonPlaceholder.Item marginTop={8} width="60%" height={16} />
    <SkeletonPlaceholder.Item marginTop={4} width="80%" height={12} />
  </SkeletonPlaceholder>
);

// Lottie for empty state
import LottieView from 'lottie-react-native';

const EmptyState = ({ title, subtitle, animationSource }) => (
  <View style={styles.container}>
    <LottieView source={animationSource} autoPlay loop style={styles.animation} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);
```

### Mobile Animations — Reanimated 3

```typescript
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// List item entry with stagger
const ListItem = ({ item, index }) => (
  <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
    <ItemContent item={item} />
  </Animated.View>
);

// Button with press feedback
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

### Mobile iconography

- **Ionicons** (via `@expo/vector-icons`) — native iOS style, default for iOS-focused apps
- **MaterialCommunityIcons** (via `@expo/vector-icons`) — native Android style
- **lucide-react-native** — when visual parity with web is needed
- Rule: **never emojis as functional icons**
- Rule: minimum size 20px, minimum tappable area 44pt (iOS) / 48dp (Android)
- Rule: style consistency — do not mix Ionicons + Material in the same layout

---

## Scope: feature

> Implement a mobile feature following TDD. Adapts `/feature-dev` 7 phases for mobile.

### Phase 1 — BDD Scenarios

Write Gherkin in `tests/bdd/features/[feature].feature` before any code.
Mobile-specific scenarios include:
- `Given the app is on foreground`
- `Given the device is offline`
- `When the user pulls to refresh`
- `When the user swipes left on [item]`

### Phase 2 — Domain RED (failing tests)

Tests in `tests/unit/domain/[feature].test.ts`.
Use pure Jest (no RN) for domain — it is pure TypeScript.

### Phase 3 — Domain GREEN

Implement entities and rules in `src/domain/[feature]/`.

### Phase 4 — Use Cases RED → GREEN

Tests in `tests/unit/application/[feature].test.ts`.
Mock ports. No RN, no HTTP.

### Phase 5 — Infrastructure + Screen RED → GREEN

Component tests with RNTL:

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

RNTL principles:
- `getByRole`, `getByLabelText`, `getByText` — not `getByTestId`
- Test behavior, not implementation
- `fireEvent.press()` for taps, `fireEvent.changeText()` for inputs
- `waitFor` and `findBy*` for async operations

### Phase 6 — Detox E2E

Write specs in `tests/e2e/[feature].e2e.ts`:

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

Run:
```bash
rtk npx detox build --configuration ios.sim.debug
rtk npx detox test --configuration ios.sim.debug tests/e2e/[feature].e2e.ts
```

### Phase 7 — Review + Performance

- `FlashList` (Shopify) instead of `FlatList` for long lists (> 50 items)
- `React.memo` for list components that do not change
- `useCallback` on handlers passed to children
- Check: no `console.log` in production, no unoptimized images

---

## Scope: qa

> Exhaustive mobile QA — replaces `/browser-qa` for React Native projects.

### Mobile QA dimensions

**Visual (both platforms)**
- iOS Simulator (iPhone 14, 375pt): no overflow, no clip
- Android Emulator (Pixel 5, 360dp): no overflow, no clip
- Dark mode: test with `Appearance.getColorScheme() === 'dark'`
- Landscape: do elements adapt?

**Interactions**
- Every `TouchableOpacity`/`Pressable` has visual feedback (`activeOpacity` or `android_ripple`)
- Long press where expected (contextual menus)
- Pull-to-refresh on lists
- Swipe gestures (if applicable)

**Keyboard**
- Inputs push content with `KeyboardAvoidingView`
- Keyboard closes when tapping outside (or on Submit)
- Correct `returnKeyType` per field type
- Logical `nextFocus` sequence

**Offline / Edge cases**
- App loads without internet (local cache)
- Friendly error when offline
- Retry action available

**Accessibility**
- Every interactive element has `accessibilityLabel`
- Every text element has minimum WCAG AA contrast
- TalkBack/VoiceOver support (at least main flow)
- Correct `accessibilityRole` on buttons, links, images

**Performance**
- FlatList/FlashList with unique `keyExtractor`
- Images with correct `resizeMode` and appropriate size
- No unnecessary re-renders (check with React DevTools Profiler)
- Startup time < 3s on real device

### Gate QA

```
⛔ GATE MOBILE QA:
  □ RNTL: 0 failures
  □ Detox E2E: 0 failures
  □ iOS render: no overflow/clip (iPhone 14 375pt)
  □ Android render: no overflow/clip (Pixel 5 360dp)
  □ Dark mode: no illegible text, no broken components

  UX (Nielsen):
  □ Every loading > 300ms has visible skeleton or spinner
  □ No silent operation (no visual/haptic feedback)
  □ Back navigation works on all screens
  □ Destructive buttons have confirmation
  □ Errors have specific message + recovery action

  Platform:
  □ iOS: swipe-back not intercepted, Tab bar at bottom
  □ Android: hardware back button works, ripple on tappables
  □ Platform.OS used where conventions diverge

  Haptics:
  □ Primary button has Haptics.Medium
  □ Destructive actions have Haptics.Heavy + Haptics.Error
  □ Item selection has Haptics.Light

  Accessibility:
  □ Every interactive has accessibilityLabel
  □ Correct accessibilityRole on buttons, links, images
  □ Touch targets ≥ 44pt (iOS) / 48dp (Android)
  □ WCAG AA contrast in light and dark mode

  □ Offline: friendly error + retry available
  Automatic fix loop (max 3 iterations) before escalating.
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

### OTA Updates (no new build)

```bash
# Publish instant update to all users
rtk eas update --branch production --message "fix: [description]"
```

---

## Differences vs. web (quick guide)

| Web | Mobile (RN) |
|-----|-------------|
| Cypress E2E | Detox E2E |
| `/browser-qa` | `/mobile qa` |
| shadcn/ui | Custom components + NativeWind |
| CSS flexbox | StyleSheet flexbox (column-first by default) |
| `onClick` | `onPress` |
| `<div>` | `<View>` |
| `<p>`, `<span>` | `<Text>` |
| `<img>` | `<Image>` |
| `<input>` | `<TextInput>` |
| `<a>` | `navigation.navigate()` |
| localStorage | AsyncStorage / SecureStore |
| `window.fetch` | Axios (with interceptors) |
| React Router | React Navigation |
| Responsive CSS | Platform.OS + Dimensions API |
| `window.alert` | `Alert.alert()` |

---

## Foundation Protocol (mobile)

For any app with UI, Foundation before any feature:

### [M-3a] Design System + Navigation Base

1. Install and configure NativeWind + theme (colors, fonts, dark/light mode)
2. Create base components (`Button`, `Input`, `Screen`, `Typography`, `Card`)
3. Configure `RootNavigator` + `AuthNavigator` + `AppNavigator`
4. Test rendering in iOS simulator + Android emulator

```
⛔ GATE [M-3a]: /mobile qa
  □ Components render without error on iOS and Android
  □ Dark mode works
  □ Navigation between screens works
  Mandatory PASS before any feature
```

### [M-3b] Auth — Register / Login / Logout

1. Implement complete flow: register, login, logout, refresh token, route protection
2. Write Detox specs: `tests/e2e/auth.e2e.ts`
3. `rtk npx detox test tests/e2e/auth.e2e.ts`

```
⛔ GATE [M-3b]: /mobile qa (scope: auth)
  If auth fails → ALL build stops
  No exceptions.
```

> **Checkpoint:** If context reaches ~60k tokens → writes `.claude/checkpoint.md` with skill, phase, files, next step. Emits: `↺ Context ~60k. Recommend /compact. Use /resume to continue.`

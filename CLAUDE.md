# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Expo / React Native app (`brightpath`) built from the `create-expo-app` starter template, using Expo Router, TypeScript (strict), and the React Compiler. Targets iOS, Android, and web (static output). This repo is the mobile app only; the backend is a separate repo (`brightpath-server`, Express + MySQL). The app calls it through `src/services/api.ts` using `EXPO_PUBLIC_API_URL` (Android emulator: `10.0.2.2`; physical device: PC LAN IP). See [AGENTS.md](AGENTS.md) for the Expo-specific rules (do not trust memorized Expo APIs; check the versioned docs at `https://docs.expo.dev/versions/v<major>.0.0/` and `https://docs.expo.dev/llms.txt` before touching Expo/EAS/RN APIs).

## Commands

```bash
npx expo start              # dev server (also: npm run android | ios | web)
npx expo lint               # lint (npm run lint)
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency/config issues
npx expo install <package>  # always use this to add deps (SDK-compatible versions), not npm add
npx expo install --fix      # fix incompatible versions
```

Run lint and typecheck before declaring a task done. There is no test runner configured. `npm run reset-project` moves the starter code to `app-example/` and blanks `src/app` — don't run it casually.

## Architecture

- **Routing**: Expo Router with `src/app/` as the routes directory (not root `app/`). `_layout.tsx` is the root layout; `index.tsx` and `explore.tsx` are the two tab screens. Typed routes are enabled (`experiments.typedRoutes`).
- **Root layout** ([src/app/_layout.tsx](src/app/_layout.tsx)): wraps everything in a React Navigation `ThemeProvider` (dark/light via `useColorScheme`), shows `AnimatedSplashOverlay`, and renders `AppTabs` directly instead of a `<Stack>`/`<Slot>`.
- **Platform-split components via file extensions**: the tab bar and the animated icon each have a native and a `.web.tsx` implementation, resolved automatically by Metro.
  - `app-tabs.tsx` uses `NativeTabs` from `expo-router/unstable-native-tabs` (system native tab bar, PNG icons from `assets/images/tabIcons`).
  - `app-tabs.web.tsx` uses headless `expo-router/ui` (`Tabs`, `TabList`, `TabTrigger`, `TabSlot`) with a custom floating top bar. Tab names/hrefs must be kept in sync between both files and the route files.
  - `use-color-scheme.ts` / `use-color-scheme.web.ts` and `animated-icon.tsx` / `animated-icon.web.tsx` follow the same split.
- **Theming**: `src/constants/theme.ts` holds `Colors` (light/dark tokens), `Fonts` (per-platform), `Spacing` scale, `BottomTabInset`, and `MaxContentWidth`. `useTheme()` resolves the current palette; `ThemedText` / `ThemedView` take a `type`/`themeColor` that is a key of `Colors` — use those instead of hardcoded colors. `theme.ts` imports `@/global.css` (web font CSS variables used by `Fonts.web`).
- **Path aliases** (tsconfig): `@/*` → `src/*`, and `@/assets/*` → `assets/*` (the latter wins for assets, e.g. `require('@/assets/images/...')`).
- **Native config**: no `ios/` or `android/` dirs (Continuous Native Generation). Configure native behavior in [app.json](app.json) / config plugins; never hand-create or edit native dirs. Native-code libraries require a development build, not Expo Go.

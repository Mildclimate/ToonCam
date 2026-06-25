# ToonCam Copilot Instructions

- Project: ToonCam
- Stack: React Native + Expo + TypeScript
- App shape: Expo Router with `app/` screens and a feature-based `src/` tree
- Priorities: working MVP, minimal changes, clear types, predictable structure
- Camera flow: keep capture logic under `src/features/camera/`
- Shared tokens: keep app-wide constants in `src/constants/` and theme values in `src/styles/`
- Do not add new architecture unless the current requirement clearly needs it

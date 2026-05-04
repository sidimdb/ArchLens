# @archlens/runtime-demo

Sample Expo / React Native app used to test and demo `@archlens/runtime`.

Five screens, each with at least one **planted UX issue** so the
runtime annotation tool always has something realistic to flag during
the jury demo:

| Screen | Planted issue |
|---|---|
| Home | "Get Started" button is 80×18 px — far below the 44×44 minimum touch target |
| Profile | Card text uses `#5a5a5a` on `#4a4a4a` — barely readable contrast |
| Settings | Toggle rows have wide gaps between label and switch with no visual grouping |
| Notifications | Empty list renders nothing — no empty state |
| About | "Visit our website" link is styled identically to body text — no affordance |

## Run it

From the workspace root:

```bash
npm install
npm start --workspace @archlens/runtime-demo
```

Or inside this folder:

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `i` for iOS
simulator / `a` for Android emulator.

In dev mode, the floating ArchLens annotation button appears in the
bottom-right of every screen. (Phase 1 only flips state visually;
Phase 2 wires up the real capture flow.)

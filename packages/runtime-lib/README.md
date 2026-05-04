# @archlens/runtime

In-app React Native library that turns any RN app into a UX-auditable surface.

A reviewer taps a floating button, then taps any UI element, leaves a note,
and the library captures a screenshot, the current screen/route, the source
file and line of the tapped component, and exports the whole session as a
Markdown report.

The Markdown report is consumed by `@archlens/verify`, which uses Claude
vision to confirm that issues have been resolved after fixes are applied.

## Status

**Phase 0 scaffold.** Implementation begins in Phase 1.

## Planned usage

```jsx
import { ArchLensProvider } from '@archlens/runtime';

export default function App() {
  return (
    <ArchLensProvider>
      <YourApp />
    </ArchLensProvider>
  );
}
```

In dev builds (`__DEV__ === true`), a floating annotation button appears.
In production builds, the provider is a no-op.

/**
 * Filename-pattern signal.
 *
 * When the folder layout is non-standard we can often still recover
 * the layer from the filename itself: `LoginScreen.tsx`, `useAuth.ts`,
 * `AuthContext.tsx`, `api.ts`, etc.
 *
 * Patterns are matched against the basename only (no directories,
 * no extension). We fire at `medium` confidence by default because
 * filenames are a weaker signal than folder paths — lots of projects
 * use `Button.tsx` for a screen if they're sloppy.
 */

import { AstFacts, ClassificationSignal, Confidence, Layer } from "../../types";

interface FilenamePattern {
  layer: Layer;
  confidence: Confidence;
  test: (name: string) => boolean;
  reason: string;
}

const PATTERNS: FilenamePattern[] = [
  // Hooks — "useXxx" is an enforced React convention, very high signal.
  {
    layer: "hook",
    confidence: "high",
    test: (n) => /^use[A-Z]/.test(n),
    reason: "filename starts with 'use' + capital letter (React hook convention)",
  },

  // Screens — "XxxScreen" / "XxxPage" are almost universal RN conventions.
  {
    layer: "screen",
    confidence: "high",
    test: (n) => /Screen$/.test(n) || /Page$/.test(n),
    reason: "filename ends with Screen/Page",
  },

  // Looser screen names ("XxxView", "XxxScene") — still useful but
  // more likely to false-positive on RN's own `View` element.
  {
    layer: "screen",
    confidence: "medium",
    test: (n) => /View$/.test(n) || /Scene$/.test(n),
    reason: "filename ends with View/Scene",
  },

  // Navigation — suffixes like Navigator/TabBar. We deliberately
  // require a real suffix so plain `App` (the React Native root file,
  // which isn't navigation) doesn't get mis-tagged.
  {
    layer: "navigation",
    confidence: "high",
    test: (n) =>
      /Navigator$/.test(n) ||
      /TabBar$/.test(n) ||
      /^Routes$/.test(n) ||
      /^AppNav(igator)?$/.test(n) ||
      /^AppRoutes$/.test(n),
    reason: "filename matches a navigation naming convention",
  },

  // State — Context / Store / Provider / Slice / Reducer suffixes.
  {
    layer: "state",
    confidence: "high",
    test: (n) => /(Context|Store|Provider|Slice|Reducer|Atom)$/.test(n),
    reason: "filename ends with Context/Store/Provider/Slice/Reducer/Atom",
  },

  // Services — Api / Service / Client / Repository suffixes, or literal 'api'.
  {
    layer: "service",
    confidence: "high",
    test: (n) =>
      /(Api|API|Service|Client|Repository|Gateway)$/.test(n) ||
      /^api$/i.test(n) ||
      /^client$/i.test(n),
    reason: "filename ends with Api/Service/Client/Repository/Gateway",
  },

  // Config — well-known config filenames.
  {
    layer: "config",
    confidence: "high",
    test: (n) => /^(config|constants|env|theme|colors|typography|spacing)$/i.test(n) ||
                  /Config$/.test(n),
    reason: "filename is a typical config/constants file",
  },

  // Utils — generic helpers (including XxxStyles, a very common RN pattern).
  {
    layer: "util",
    confidence: "medium",
    test: (n) =>
      /(Utils|Helpers|Helper|Util|Styles|Style)$/.test(n) ||
      /^(utils|helpers|styles)$/i.test(n),
    reason: "filename ends with Utils/Helpers/Styles",
  },
];

export function filenameSignal(
  facts: AstFacts
): ClassificationSignal | null {
  const name = facts.basename;

  for (const p of PATTERNS) {
    if (p.test(name)) {
      return {
        source: "filename",
        layer: p.layer,
        confidence: p.confidence,
        reason: p.reason,
      };
    }
  }

  // Fallback: PascalCase file with JSX → probably a component.
  // We keep this weak (low confidence) because plenty of screens are
  // PascalCase too; folder/content signals should outweigh this.
  if (/^[A-Z][A-Za-z0-9]*$/.test(name) && facts.hasJsx) {
    return {
      source: "filename",
      layer: "component",
      confidence: "low",
      reason: "PascalCase filename with JSX content",
    };
  }

  return null;
}

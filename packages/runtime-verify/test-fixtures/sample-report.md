# UX Audit Report

**Project:** FitTrack (ArchLens demo)
**Date:** May 4, 2026 · 15:00 (2026-05-04T15:00:00.000Z)
**Session ID:** `session_test_001`
**Total issues:** 2

---

<a id="issue-1"></a>
## Issue #1 — Save button too small to tap

**Screen:** Profile
**Component:** `<SaveButton>`
**Source:** `src/components/SaveButton.jsx:42`
**Captured at:** 2026-05-04T14:21:09.000Z
**Status:** unverified

**Reviewer note:**

> Bu buton çok küçük, parmakla isabet etmek zor.

**Element bounds:** x=320, y=620, w=48, h=24

**Screenshot:**

![issue-1](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

---

<a id="issue-2"></a>
## Issue #2 — Low contrast on profile card

**Screen:** Profile
**Component:** `<ProfileCard>`
**Source:** `src/screens/ProfileScreen.tsx:18`
**Captured at:** 2026-05-04T14:22:30.000Z
**Status:** unverified

**Reviewer note:**

> Yazılar çok soluk, arka planla kontrast yetersiz.

**Element bounds:** x=24, y=120, w=342, h=180

**Screenshot:**

![issue-2](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

---

## Machine-readable export

```json
{
  "schema": "archlens-runtime-export@1",
  "projectName": "FitTrack (ArchLens demo)",
  "sessionId": "session_test_001",
  "generatedAt": "2026-05-04T15:00:00.000Z",
  "annotations": [
    {
      "id": "ann_test_001",
      "capturedAt": 1746371269000,
      "note": "Bu buton çok küçük, parmakla isabet etmek zor.",
      "element": {
        "componentName": "SaveButton",
        "fileName": "src/components/SaveButton.jsx",
        "lineNumber": 42,
        "bounds": { "x": 320, "y": 620, "width": 48, "height": 24 }
      },
      "screenName": "Profile"
    },
    {
      "id": "ann_test_002",
      "capturedAt": 1746371350000,
      "note": "Yazılar çok soluk, arka planla kontrast yetersiz.",
      "element": {
        "componentName": "ProfileCard",
        "fileName": "src/screens/ProfileScreen.tsx",
        "lineNumber": 18,
        "bounds": { "x": 24, "y": 120, "width": 342, "height": 180 }
      },
      "screenName": "Profile"
    }
  ]
}
```

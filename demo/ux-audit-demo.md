# UX Audit Report

**Project:** FitTrack (ArchLens demo)
**Date:** May 4, 2026 · 16:10 (2026-05-04T16:10:00.000Z)
**Session ID:** `session_demo_001`
**Total issues:** 6

---

<a id="issue-1"></a>
## Issue #1 — Save button too small to tap reliably

**Screen:** Profile
**Component:** `<SaveButton>`
**Source:** `src/components/SaveButton.jsx:42`
**Captured at:** 2026-05-04T16:01:09.000Z
**Status:** unverified

**Reviewer note:**

> Bu buton çok küçük (24×16px), parmakla isabet etmek zor. Apple'ın 44×44 hedef boyut önerisinin altında.

**Element bounds:** x=320, y=620, w=24, h=16

**Screenshot:**

![issue-1](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

---

<a id="issue-2"></a>
## Issue #2 — Low contrast on profile card

**Screen:** Profile
**Component:** `<ProfileCard>`
**Source:** `src/screens/ProfileScreen.tsx:18`
**Captured at:** 2026-05-04T16:02:30.000Z
**Status:** unverified

**Reviewer note:**

> Yazılar koyu gri (#5a5a5a) zemin üstünde koyu gri (#4a4a4a). Kontrast oranı 1.3:1 — WCAG AA gereksinimi olan 4.5:1'in çok altında.

**Element bounds:** x=24, y=120, w=342, h=180

**Screenshot:**

![issue-2](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

---

<a id="issue-3"></a>
## Issue #3 — Settings rows lack visual grouping

**Screen:** Settings
**Component:** `<SettingsRow>`
**Source:** `src/screens/SettingsScreen.tsx:24`
**Captured at:** 2026-05-04T16:03:45.000Z
**Status:** unverified

**Reviewer note:**

> Toggle ile etiket arasında 280px boşluk var ve ayırıcı çizgi yok. Hangi switch hangi label'a ait belirsiz kalıyor.

**Element bounds:** x=24, y=180, w=342, h=48

**Screenshot:**

![issue-3](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

---

<a id="issue-4"></a>
## Issue #4 — Notifications screen has no empty state

**Screen:** Notifications
**Component:** `<NotificationsList>`
**Source:** `src/screens/NotificationsScreen.tsx:22`
**Captured at:** 2026-05-04T16:05:12.000Z
**Status:** unverified

**Reviewer note:**

> Bildirim listesi boşken ekran tamamen boş kalıyor. Yükleniyor mu, hata mı var, gerçekten boş mu — kullanıcı bilemez.

**Element bounds:** x=0, y=120, w=390, h=600

**Screenshot:**

![issue-4](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

---

<a id="issue-5"></a>
## Issue #5 — "Visit our website" link looks like body text

**Screen:** About
**Component:** `<WebsiteLink>`
**Source:** `src/screens/AboutScreen.tsx:31`
**Captured at:** 2026-05-04T16:06:33.000Z
**Status:** unverified

**Reviewer note:**

> Tıklanabilir bir link ama altı çizili değil, mavi değil, hiçbir affordance yok. Kullanıcı tıklanabilir olduğunu anlayamaz.

**Element bounds:** x=24, y=420, w=200, h=24

**Screenshot:**

![issue-5](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

---

<a id="issue-6"></a>
## Issue #6 — Get Started CTA hierarchy unclear

**Screen:** Home
**Component:** `<GetStartedButton>`
**Source:** `src/screens/HomeScreen.tsx:28`
**Captured at:** 2026-05-04T16:08:01.000Z
**Status:** unverified

**Reviewer note:**

> Ana CTA çok küçük ve sayfanın altında dört ikincil link arasında kayboluyor. Birincil aksiyon öne çıkmalı.

**Element bounds:** x=140, y=320, w=80, h=18

**Screenshot:**

![issue-6](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

---

## Machine-readable export

```json
{
  "schema": "archlens-runtime-export@1",
  "projectName": "FitTrack (ArchLens demo)",
  "sessionId": "session_demo_001",
  "generatedAt": "2026-05-04T16:10:00.000Z",
  "annotations": [
    {
      "id": "ann_demo_001",
      "capturedAt": 1746374469000,
      "note": "Bu buton çok küçük (24×16px), parmakla isabet etmek zor. Apple'ın 44×44 hedef boyut önerisinin altında.",
      "element": {
        "componentName": "SaveButton",
        "fileName": "src/components/SaveButton.jsx",
        "lineNumber": 42,
        "bounds": { "x": 320, "y": 620, "width": 24, "height": 16 }
      },
      "screenName": "Profile"
    },
    {
      "id": "ann_demo_002",
      "capturedAt": 1746374550000,
      "note": "Yazılar koyu gri (#5a5a5a) zemin üstünde koyu gri (#4a4a4a). Kontrast oranı 1.3:1 — WCAG AA gereksinimi olan 4.5:1'in çok altında.",
      "element": {
        "componentName": "ProfileCard",
        "fileName": "src/screens/ProfileScreen.tsx",
        "lineNumber": 18,
        "bounds": { "x": 24, "y": 120, "width": 342, "height": 180 }
      },
      "screenName": "Profile"
    },
    {
      "id": "ann_demo_003",
      "capturedAt": 1746374625000,
      "note": "Toggle ile etiket arasında 280px boşluk var ve ayırıcı çizgi yok. Hangi switch hangi label'a ait belirsiz kalıyor.",
      "element": {
        "componentName": "SettingsRow",
        "fileName": "src/screens/SettingsScreen.tsx",
        "lineNumber": 24,
        "bounds": { "x": 24, "y": 180, "width": 342, "height": 48 }
      },
      "screenName": "Settings"
    },
    {
      "id": "ann_demo_004",
      "capturedAt": 1746374712000,
      "note": "Bildirim listesi boşken ekran tamamen boş kalıyor. Yükleniyor mu, hata mı var, gerçekten boş mu — kullanıcı bilemez.",
      "element": {
        "componentName": "NotificationsList",
        "fileName": "src/screens/NotificationsScreen.tsx",
        "lineNumber": 22,
        "bounds": { "x": 0, "y": 120, "width": 390, "height": 600 }
      },
      "screenName": "Notifications"
    },
    {
      "id": "ann_demo_005",
      "capturedAt": 1746374793000,
      "note": "Tıklanabilir bir link ama altı çizili değil, mavi değil, hiçbir affordance yok. Kullanıcı tıklanabilir olduğunu anlayamaz.",
      "element": {
        "componentName": "WebsiteLink",
        "fileName": "src/screens/AboutScreen.tsx",
        "lineNumber": 31,
        "bounds": { "x": 24, "y": 420, "width": 200, "height": 24 }
      },
      "screenName": "About"
    },
    {
      "id": "ann_demo_006",
      "capturedAt": 1746374881000,
      "note": "Ana CTA çok küçük ve sayfanın altında dört ikincil link arasında kayboluyor. Birincil aksiyon öne çıkmalı.",
      "element": {
        "componentName": "GetStartedButton",
        "fileName": "src/screens/HomeScreen.tsx",
        "lineNumber": 28,
        "bounds": { "x": 140, "y": 320, "width": 80, "height": 18 }
      },
      "screenName": "Home"
    }
  ]
}
```

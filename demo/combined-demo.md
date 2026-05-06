# ArchLens — Combined Project Audit

**Project:** FitTrack (demo)  
**Date:** May 4, 2026 (2026-05-04T17:50:56.060Z)

| Mode | Score |
|---|---|
| Architectural Health | **78/100** (Grade B) |
| UX Audit | **2/6 verified** |

---

## Architectural Health

**Overall:** 78/100, grade B
**Project size:** 42 files, 3,187 LOC
**Rules:** 4 passed, 4 failed, 0 n/a — 13 total violation(s)

| Rule | Status | Score | Violations |
|---|---|---|---|
| Service layer usage | ❌ fail | 71 | 3 |
| No circular dependencies | ✅ pass | 100 | 0 |
| File size & complexity thresholds | ❌ fail | 80 | 2 |
| Layer separation (import policy) | ✅ pass | 100 | 0 |
| Rules of Hooks compliance | ✅ pass | 100 | 0 |
| Inline styles vs StyleSheet | ❌ fail | 60 | 7 |
| Naming conventions | ✅ pass | 100 | 0 |
| Native APIs in UI | ❌ fail | 90 | 1 |

**Weakest rules:**
- Inline styles vs StyleSheet — 60/100
- Service layer usage — 71/100
- File size & complexity thresholds — 80/100

---

## UX Audit

**Captured:** 6 issue(s)
**Session:** `session_demo_001`

| Verdict | Count |
|---|---|
| ✅ verified | 2 |
| ❌ rejected | 2 |
| ⚠️ uncertain | 2 |
| ➖ no-after | 0 |

| # | Screen | Component | Note | Verdict |
|---|---|---|---|---|
| 1 | Profile | `<SaveButton>` | Bu buton çok küçük (24×16px), parmakla isabet etmek zor. Ap… | ✅ verified |
| 2 | Profile | `<ProfileCard>` | Yazılar koyu gri (#5a5a5a) zemin üstünde koyu gri (#4a4a4a)… | ⚠️ uncertain |
| 3 | Settings | `<SettingsRow>` | Toggle ile etiket arasında 280px boşluk var ve ayırıcı çizg… | ❌ rejected |
| 4 | Notifications | `<NotificationsList>` | Bildirim listesi boşken ekran tamamen boş kalıyor. Yükleniy… | ✅ verified |
| 5 | About | `<WebsiteLink>` | Tıklanabilir bir link ama altı çizili değil, mavi değil, hi… | ⚠️ uncertain |
| 6 | Home | `<GetStartedButton>` | Ana CTA çok küçük ve sayfanın altında dört ikincil link ara… | ❌ rejected |

---

## Recommendations

- **Architecture:** focus on **Inline styles vs StyleSheet** (score 60). Move inline style objects into StyleSheet.create() blocks.
- **UX (rejected fix):** issue #3 on `Settings` — [DRY RUN] Synthetic verdict — the AFTER image does not seem to resolve the original concern.
- **UX (rejected fix):** issue #6 on `Home` — [DRY RUN] Synthetic verdict — the AFTER image does not seem to resolve the original concern.
- **UX (review needed):** 2 issue(s) returned `uncertain` — manually verify them before shipping.

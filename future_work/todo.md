# Future work

First phase done. Next steps.

> Convention: `[ ]` = open. Move items into the active `TODO.md` only
> when someone is actively working on them.

---

## 1. Auto-fix submitted UX issues (runtime mode)

Today the runtime UX audit ends at "issue triaged in the dashboard."
The next step is to close the loop:

- [ ] Once a reviewer submits an issue (screenshot + note + element
      metadata), feed it to an AI model along with the project source
      and have the AI propose a code change that fixes the reported
      problem.
- [ ] Surface the proposed change in the dashboard as a diff /
      pull request the developer can review, edit, and merge.

End goal: the human reports the issue, the AI ships the fix.

---

## 2. Expand the static analyzer beyond React Native

The `statik` module is React Native-specific today. The same scoring
pipeline could be applied to other mobile frameworks:

- [ ] Flutter (Dart sources, widget tree, layer conventions).
- [ ] Native Android (Kotlin / Jetpack Compose).
- [ ] Native iOS (Swift / SwiftUI).
- [ ] .NET MAUI.

Each framework would need its own classifier signals and a rule set
tuned to that ecosystem, but the scoring / reporting / dashboard
layers stay shared.

---

## 3. More architectural rules for the statik module

ArchLens currently runs 8 rules. The pipeline is built so adding rules
is cheap (drop a new file under `packages/statik-backend/src/rules/`,
register it in `rules/index.ts`, add a weight in the scorer).

- [ ] Add new rules that cover gaps the current 8 don't catch.
- [ ] Each new rule should keep the same shape as the existing ones
      (status, confidence, weight, violation list) so the dashboard
      and scoring keep working unchanged.

---

— Last updated: June 2026

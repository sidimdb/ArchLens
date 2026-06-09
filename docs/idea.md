# ArchLens — the idea

ArchLens is two related but independent tools for measuring the
health of a React Native project.

## The problem

React Native is great at letting small teams ship mobile apps fast,
but the framework deliberately doesn't enforce any architecture. It
won't tell you that your screen file is 1200 lines, that your UI
component is reaching directly into the network layer, or that you
have a quiet circular dependency. Codebases drift. Six months later,
nobody remembers why.

UX problems have the same trouble. A designer says *"this button
feels off"* and the developer asks *"off how?"* — and there's no
shared, traceable record of the conversation.

## Statik — the static analyzer

The statik module reads the source code of a React Native project and
scores its architecture against eight rules: service layer usage,
circular dependencies, file size, layer separation, React Hooks
compliance, inline styles, naming conventions, and use of native
APIs in UI code.

The output is a single number from 0 to 100, a letter grade from A
to F, and a per-rule breakdown of what failed and where. For each
failed rule, Claude is called to write a short, project-specific
explanation in plain language. The AI never decides what counts as
a violation — that's the deterministic rule engine's job. The AI
only translates findings into something a developer can act on.

## Runtime UX audit

The runtime module runs inside the app being reviewed. A reviewer
taps any UI element on the screen, picks a category, and writes a
note. ArchLens captures the screenshot, walks React's fiber tree to
identify the exact component (name, source file, line), and sends
everything through a cloud API into a triage dashboard.

A developer opens the dashboard, sees the inbox of reported issues,
filters by status, and drills into each one to see the screenshot,
the note, and the source location to fix.

There is no AI step in this flow today — the reviewer reports the
issue, the developer fixes it. Closing that loop with AI is on the
roadmap (`future_work/todo.md`).

## Who it's for

React Native teams that want their architecture to stay healthy as
the project grows, code reviewers who want measurable feedback, and
students learning what *good architecture* actually means in
practice.

## Why it's different

ESLint and SonarQube work at the line level. ArchLens works at the
architecture level for the statik module, and at the live-user-flow
level for the runtime module — and both are specific to React Native,
not generic JavaScript tools retrofitted to a mobile framework.

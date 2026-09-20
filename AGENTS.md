# AGENTS.md

## Working on this repository

Follow existing React, TypeScript, Tailwind, and project-specific patterns before
introducing new abstractions.

Prefer small, targeted changes over broad refactors. Do not modify unrelated
code as part of a feature or bug fix.

Before changing behavior, inspect the nearby implementation and the relevant
project documentation.

## Sources of truth

Use these documents rather than duplicating their contents here:

- `docs/data-model.md`
  - Read before changing persisted score/catalog structures, IDs, relationships,
    chart summaries, or data-loading assumptions.
  - `src/utils/types.ts` remains authoritative for current TypeScript data shapes.

- `docs/decisions-summary.md`
  - Read before changing architecture, user-visible behavior, responsive layout,
    workflow behavior, or an existing implementation pattern.
  - Later decisions supersede earlier ones.
  - Pay particular attention to the "Non-negotiable constraints for future work"
    section.

- `docs/operations.md`
  - Read before changing imports, synchronization, deployment, validation,
    caching, external-service configuration, or generated data.

If code and documentation appear inconsistent, report the discrepancy instead
of silently choosing one or rewriting one to match the other.

## Implementation behavior

- Match nearby component and utility patterns before introducing a new pattern.
- Reuse existing utilities, runtime value lists, and UI primitives when they
  already represent the concept being changed.
- Do not introduce dependencies unless there is a clear benefit.
- Do not regenerate, normalize, or mass-edit hand-maintained data unless the
  task explicitly requires it.
- Treat generated files as generated data; modify their source/generation path
  rather than manually patching them unless specifically instructed otherwise.

## UI work

- Preserve the application's existing visual language.
- Treat mobile and desktop behavior as intentional rather than assuming desktop
  layout should simply collapse onto mobile.
- Check responsive behavior and mobile Safari when relevant.
- Prefer existing shared UI components and styling conventions over one-off
  implementations.

## Architectural changes

Before making a substantial change to architecture, persistence, data ownership,
or user-visible behavior:

1. Identify the relevant existing decision(s) in `docs/decisions-summary.md`.
2. Explain how the proposed change relates to or supersedes them.
3. Avoid implementing the architectural change until that relationship is clear.

## Validation

After meaningful changes, run the relevant existing checks.

At minimum, use the commands already defined by the repository rather than
inventing alternate validation paths.

For data/import changes, follow the validation and regeneration order documented
in `docs/operations.md`.

Report:
- checks run,
- failures or checks that could not be run,
- files changed,
- any non-obvious implementation decisions.
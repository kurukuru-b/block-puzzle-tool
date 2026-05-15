# Beta Roadmap

## Phase 1: Foundation

- Create the `beta` branch from the closed alpha.
- Add beta docs and requirements.
- Introduce beta difficulty ids and labels.
- Add alpha-to-beta puzzle migration helpers.

## Phase 2: Architecture Cleanup

- Split editor, viewer, and operational panels into clearer modules.
- Extract placement preview and legality checks into a dedicated placement flow.
- Keep the Three.js render layer separate from core puzzle logic.

## Phase 3: Editor Interaction

- Add keyboard movement for selected pieces.
- Add `R`, `F`, and `V` rotation shortcuts.
- Add contextual selected-piece actions near the piece.
- Add puzzle naming to registration.
- Add hide/show controls for import/export/copy/register JSON tools.

## Phase 4: Viewer Library UX

- Add six-difficulty filtering.
- Add puzzle index and title display in the lower-left.
- Add puzzle number lookup.
- Add title search.
- Preserve random puzzle selection.

## Phase 5: Hint System

- Decide hint model.
- Add optional hint data to puzzle metadata or sidecar data.
- Implement the first hint mode.

## Phase 6: Finalization

- Update Supabase schema and migration notes if needed.
- Verify alpha import compatibility.
- Run app build and puzzle-lab build.
- Update README for beta operation.

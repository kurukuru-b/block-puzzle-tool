# Alpha Retrospective

This project started as a fast implementation-first 3D block puzzle editor and
viewer. The alpha version is useful enough to keep as a reference, but the beta
version should treat it as a prototype rather than a final architecture.

## Keep

- 5x5x5 grid model.
- Shape definitions as stable `shapeId` plus normalized local cells.
- Export/import format based on `shapeId`, origin, and rotation.
- Editor and Viewer in one browser app.
- Supabase-backed puzzle library.
- External tools under `external-tools/` for backup and Codex-assisted puzzle generation.
- Color mode switch for old/new display names and colors.

## Rework

- Placement preview and interaction should become a first-class placement module.
- Editor controls should be keyboard-friendly and direct manipulation friendly.
- Piece selection should expose local actions near the selected piece.
- Viewer puzzle lookup should support index and title search, not only list selection.
- Import/export/register tools should be hideable because they are operational UI, not always-needed UI.

## Known Alpha Costs

- `main.ts` grew as features accumulated.
- Some interaction behavior is split between UI state, pointer logic, and render updates.
- Difficulty levels are too coarse for longer-term puzzle library curation.
- The admin/editor/viewer responsibilities are present but not cleanly separated.

## Beta Principle

Build beta as a maintainable tool around the alpha's proven behavior. Do not
rewrite everything for its own sake; extract and redesign only where the alpha
made future changes expensive.

# Puzzle Lab

External puzzle-generation tools for the block puzzle project.

This folder is intentionally outside `src/` so it is easy to tell these scripts
are not part of the browser app itself. The scripts import shared logic from
`src/core` for shape definitions, rotations, and placement validation.

## Commands

```powershell
npm run puzzle-lab:build
node external-tools/puzzle-lab/dist/block-puzzle-tool/external-tools/puzzle-lab/src/generateArtPuzzles.js
node external-tools/puzzle-lab/dist/block-puzzle-tool/external-tools/puzzle-lab/src/deletePuzzlesByTitlePrefix.js "Codex Art "
```

To create a new named batch:

```powershell
$env:PUZZLE_LAB_TITLE_PREFIX="Codex Art Trial"
node external-tools/puzzle-lab/dist/block-puzzle-tool/external-tools/puzzle-lab/src/generateArtPuzzles.js
```

The scripts read Supabase settings from `.env.local`.

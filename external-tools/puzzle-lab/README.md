# Puzzle Lab

External puzzle-generation tools for the block puzzle project.

This folder is intentionally outside `src/` so it is easy to tell these scripts
are not part of the browser app itself. The scripts import shared logic from
`src/core` for shape definitions, rotations, and placement validation.

## Commands

```powershell
npm run puzzle-lab:build
npm run puzzle-lab:backup
npm run puzzle-lab:restore -- latest
npm run puzzle-lab:restore -- latest --apply
npm run puzzle-lab:restore -- external-tools/puzzle-lab/backups/puzzles-YYYY-MM-DDTHH-MM-SS-ZZZZ.json
npm run puzzle-lab:restore -- external-tools/puzzle-lab/backups/puzzles-YYYY-MM-DDTHH-MM-SS-ZZZZ.json --apply
node external-tools/puzzle-lab/dist/block-puzzle-tool/external-tools/puzzle-lab/src/generateArtPuzzles.js
node external-tools/puzzle-lab/dist/block-puzzle-tool/external-tools/puzzle-lab/src/deletePuzzlesByTitlePrefix.js "Codex Art "
```

To create a new named batch:

```powershell
$env:PUZZLE_LAB_TITLE_PREFIX="Codex Art Trial"
node external-tools/puzzle-lab/dist/block-puzzle-tool/external-tools/puzzle-lab/src/generateArtPuzzles.js
```

The scripts read Supabase settings from `.env.local`.

Backups are written to `external-tools/puzzle-lab/backups/` and are ignored by
Git.

Restore runs in dry-run mode unless `--apply` is passed. It upserts rows by
`id` and never deletes existing DB rows.

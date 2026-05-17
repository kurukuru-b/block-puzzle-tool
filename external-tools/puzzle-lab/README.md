# Puzzle Lab

External puzzle-generation tools for the block puzzle project.

This folder is intentionally outside `src/` so it is easy to tell these scripts
are not part of the browser app itself. The scripts import shared logic from
`src/core` for shape definitions, rotations, and placement validation.

## Commands

```powershell
npm run puzzle-lab:build
npm run puzzle-lab:backup
npm run puzzle-lab:inspect
npm run puzzle-lab:restore -- latest
npm run puzzle-lab:restore -- latest --apply
npm run puzzle-lab:restore -- external-tools/puzzle-lab/backups/puzzles-YYYY-MM-DDTHH-MM-SS-ZZZZ.json
npm run puzzle-lab:restore -- external-tools/puzzle-lab/backups/puzzles-YYYY-MM-DDTHH-MM-SS-ZZZZ.json --apply
npm run puzzle-lab:generate
npm run puzzle-lab:generate -- --dry-run
npm run puzzle-lab:generate -- --cohesion 60 --stability 65 --artistry 45
npm run puzzle-lab:delete-prefix -- "Codex Art "
```

`puzzle-lab:inspect` is read-only. It reports:

- difficulty counts and published/hidden counts
- duplicate titles
- duplicate cell layouts
- `order_index` duplicates or gaps
- invalid puzzle placement data

To create a new named batch:

```powershell
$env:PUZZLE_LAB_TITLE_PREFIX="Codex Art Trial"
npm run puzzle-lab:generate
```

Generated puzzle candidates are scored on three 0-100 axes:

- `cohesion`: how strongly the pieces feel connected as one shape.
- `stability`: how comfortable the puzzle should be to build physically.
- `artistry`: a heuristic for symmetry, rhythm, height variation, and composition.

Thresholds can be set with command flags:

```powershell
npm run puzzle-lab:generate -- --cohesion 60 --stability 65 --artistry 45
```

Or with environment variables:

```powershell
$env:PUZZLE_LAB_MIN_COHESION="60"
$env:PUZZLE_LAB_MIN_STABILITY="65"
$env:PUZZLE_LAB_MIN_ARTISTRY="45"
npm run puzzle-lab:generate
```

Use `--attempts-multiplier 2` when stricter thresholds need a wider search.

The scripts read Supabase settings from `.env.local`.

Generated rows explicitly set the final beta DB fields:

- `order_index`: appended to the end of the target difficulty.
- `is_published`: `true`.

Backups are written to `external-tools/puzzle-lab/backups/` and are ignored by
Git.

Restore runs in dry-run mode unless `--apply` is passed. It upserts rows by
`id` and never deletes existing DB rows.

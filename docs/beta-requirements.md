# Beta Requirements

## Difficulty Levels

Beta uses six difficulty levels:

- Beginner
- Easy
- Normal
- Hard
- Expert
- Challenge

Database values should use lowercase stable ids:

- `beginner`
- `easy`
- `normal`
- `hard`
- `expert`
- `challenge`

## Editor

The editor should support the alpha feature set plus more direct controls.

- Rotate selected or previewed piece with `R`, `F`, and `V`.
- Show rotation direction affordances on the preview when possible.
- Move the selected piece with `WASD` or arrow keys.
- Move vertically with `Space` and `Shift`.
- Show contextual `Edit` and `Delete` buttons near a selected piece.
- Allow naming a puzzle when registering it.
- Keep board reset, undo/redo, color mode, and UI hide/show.

## Viewer

- Show puzzle index and puzzle title in the lower-left.
- Allow selecting by difficulty.
- Allow random selection.
- Allow lookup by puzzle number.
- Allow lookup by puzzle title search.
- Keep color mode and timer behavior from alpha unless changed later.

## Operational UI

The following controls should be hideable:

- Import
- Export
- Copy
- Register
- JSON text area

These controls are useful for editing and operations, but should not dominate
the everyday viewer/editor surface.

## Hint Feature

The hint feature is intentionally deferred until its design is specified.

Possible directions:

- Reveal one piece.
- Reveal one occupied cell.
- Show silhouette or layer.
- Show next placement candidate.
- Step-by-step solution path.

The beta architecture should leave room for hints without requiring puzzle data
format changes later.

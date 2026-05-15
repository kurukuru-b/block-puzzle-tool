# Beta Data Format

The alpha format is the starting point. Beta should keep the core placement data
small and stable, while adding metadata for library management.

## Puzzle Export

```ts
type BetaPuzzleExport = {
  version: 2
  grid: {
    width: 5
    height: 5
    depth: 5
  }
  metadata: {
    id?: string
    title: string
    difficulty: "beginner" | "easy" | "normal" | "hard" | "expert" | "challenge"
    author?: string
    tags?: string[]
    createdAt?: string
    updatedAt?: string
  }
  placedShapes: Array<{
    shapeId: string
    origin: {
      x: number
      y: number
      z: number
    }
    rotation: {
      x: 0 | 1 | 2 | 3
      y: 0 | 1 | 2 | 3
      z: 0 | 1 | 2 | 3
    }
  }>
  hints?: BetaPuzzleHint[]
}
```

## Hints

The final hint model is not decided yet. Keep it optional.

```ts
type BetaPuzzleHint =
  | { type: "piece"; shapeId: string }
  | { type: "cell"; x: number; y: number; z: number }
  | { type: "message"; text: string }
```

## Migration Notes

- Alpha `version: 1` exports can be migrated by adding `metadata`.
- Alpha difficulty `easy | normal | hard | challenge` remains valid, but beta
  adds `beginner` and `expert`.
- Shape ids should remain compatible with alpha shape definitions.
- Color mode is display state, not puzzle data.

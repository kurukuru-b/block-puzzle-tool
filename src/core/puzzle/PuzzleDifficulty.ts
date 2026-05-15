export const PUZZLE_DIFFICULTIES = [
  "beginner",
  "easy",
  "normal",
  "hard",
  "expert",
  "challenge",
] as const

export type PuzzleDifficulty = typeof PUZZLE_DIFFICULTIES[number]

export function isPuzzleDifficulty(value: unknown): value is PuzzleDifficulty {
  return typeof value === "string" &&
    (PUZZLE_DIFFICULTIES as readonly string[]).includes(value)
}

export function formatDifficulty(difficulty: PuzzleDifficulty): string {
  return difficulty[0]!.toUpperCase() + difficulty.slice(1)
}

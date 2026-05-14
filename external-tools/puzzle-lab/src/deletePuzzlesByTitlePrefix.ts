import { loadSupabaseEnv } from "./env"
import { createSupabaseClient } from "./supabaseRest"

async function main() {
  const prefix = process.argv[2]

  if (!prefix) {
    throw new Error("Usage: node deletePuzzlesByTitlePrefix.js \"Codex Art \"")
  }

  const client = createSupabaseClient(loadSupabaseEnv())
  const deletedCount = await client.deleteByTitlePrefix(prefix)

  console.log(`Deleted ${deletedCount} puzzle(s) with title prefix: ${prefix}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

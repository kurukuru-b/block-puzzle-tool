import { execSync } from "node:child_process"
import { defineConfig } from "vite"

const commitHash = execSync("git rev-parse --short HEAD", {
  encoding: "utf8",
}).trim()

export default defineConfig({
  base: "/block-puzzle-tool/",
  define: {
    "import.meta.env.VITE_APP_COMMIT": JSON.stringify(commitHash),
  },
})

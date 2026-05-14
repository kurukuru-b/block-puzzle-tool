declare const process: {
  argv: string[]
  env: Record<string, string | undefined>
  exit(code?: number): never
}

declare const console: {
  log(...values: unknown[]): void
  error(...values: unknown[]): void
}

declare module "node:fs" {
  const fs: {
    existsSync(path: string): boolean
    readFileSync(path: string, encoding: string): string
  }

  export default fs
}

declare module "node:path" {
  const path: {
    resolve(...paths: string[]): string
  }

  export default path
}

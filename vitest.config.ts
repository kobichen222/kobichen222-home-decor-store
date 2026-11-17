import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)), "server-only": fileURLToPath(new URL("tests/server-only.ts", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    env: loadEnv(mode, process.cwd(), ""),
    testTimeout: 30_000,
    fileParallelism: false,
  },
}));

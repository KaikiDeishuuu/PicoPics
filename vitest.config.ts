import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
      include: ["lib/**/*.test.{ts,tsx}", "workers/**/*.test.ts", "server/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    environment: "jsdom",
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**"],
    environment: "jsdom",
  },
});

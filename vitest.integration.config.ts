import { defineConfig } from "vitest/config";
import path from "path";
// Integration tests run against a separate database (dineflow_test), reset + seeded before the run.
const TEST_DB = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/dineflow_test";
process.env.DATABASE_URL = TEST_DB;
export default defineConfig({
  test: { include: ["tests/integration/**/*.test.ts"], environment: "node", globalSetup: ["tests/integration/setup.ts"], fileParallelism: false, testTimeout: 30000, hookTimeout: 120000, env: { DATABASE_URL: TEST_DB } },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});

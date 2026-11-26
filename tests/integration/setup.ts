import { execSync } from "child_process";
export default function setup() {
  const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/dineflow_test" };
  execSync("npx prisma db push --skip-generate", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}

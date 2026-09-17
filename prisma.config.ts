import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 6 config files do not auto-load .env; load it explicitly.
config();

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

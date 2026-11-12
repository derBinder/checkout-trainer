import { defineConfig } from "drizzle-kit";
import { withVerifiedSsl } from "./src/lib/db/driver";

const url = process.env.DATABASE_URL && withVerifiedSsl(process.env.DATABASE_URL);

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(url
    ? { dbCredentials: { url } }
    : { driver: "pglite", dbCredentials: { url: ".data/pglite" } }),
});

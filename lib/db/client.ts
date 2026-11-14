/** SERVER-ONLY. Drizzle over Neon HTTP. Returns null when DATABASE_URL is not set. */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!cached) cached = drizzle({ client: neon(url), schema });
  return cached;
}
export { schema };

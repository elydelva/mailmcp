import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";

export async function runMigrations(connectionString: string): Promise<void> {
  const db = drizzle(new SQL(connectionString));
  await migrate(db, { migrationsFolder: "./drizzle" });
}

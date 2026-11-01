import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run database migrations");
}

const migrationsDirectory = path.resolve("database/migrations");
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();
const sql = postgres(connectionString, { max: 1 });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS relay_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  for (const fileName of migrationFiles) {
    const [existing] = await sql`
      SELECT name FROM relay_migrations WHERE name = ${fileName}
    `;

    if (existing) {
      process.stdout.write(`skip ${fileName}\n`);
      continue;
    }

    const source = await readFile(path.join(migrationsDirectory, fileName), "utf8");

    await sql.begin(async (transaction) => {
      await transaction.unsafe(source);
      await transaction`
        INSERT INTO relay_migrations (name) VALUES (${fileName})
      `;
    });

    process.stdout.write(`apply ${fileName}\n`);
  }
} finally {
  await sql.end();
}

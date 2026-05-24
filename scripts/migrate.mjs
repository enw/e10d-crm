import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function describeDatabaseTarget(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.username}@${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

function printConnectionHelp(url, error) {
  const target = describeDatabaseTarget(url);
  console.error(`\nDatabase migration failed for ${target}`);
  console.error(`Postgres error: ${error.message}\n`);

  if (error.code === "28000") {
    console.error(`The database user does not exist on the server you reached.

Common causes on macOS:
- Local Postgres is bound to localhost:5432 while Docker also maps Postgres
- Fix: use the Docker Compose port from .env.example (127.0.0.1:5433)

Try:
  pnpm db:up
  pnpm db:migrate

Or update DATABASE_URL in .env to match your Postgres user/database.`);
  }
}

loadEnvFile();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (set in .env or environment)");
  process.exit(1);
}

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/db/migrations",
);

const client = postgres(url, { max: 1 });
const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete");
} catch (error) {
  const cause = error instanceof Error && "cause" in error ? error.cause : error;
  if (cause instanceof Error) {
    printConnectionHelp(url, cause);
  }
  throw error;
} finally {
  await client.end();
}

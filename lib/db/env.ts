const databaseUrl = process.env.DATABASE_URL;

export function hasDatabaseConfig() {
  return Boolean(databaseUrl?.trim());
}

export function getDatabaseUrl() {
  const url = databaseUrl?.trim();

  if (!url) {
    throw new Error("Missing DATABASE_URL. Add a PostgreSQL connection string to .env.local.");
  }

  return url;
}

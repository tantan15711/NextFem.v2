const shouldUseDatabaseSsl = () => {
  const explicit = String(process.env.DATABASE_SSL || "").toLowerCase();
  const pgSslMode = String(process.env.PGSSLMODE || "").toLowerCase();

  return ["1", "true", "require"].includes(explicit) || pgSslMode === "require";
};

const getDatabaseOptions = () => ({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseDatabaseSsl() ? { rejectUnauthorized: false } : undefined
});

module.exports = {
  getDatabaseOptions,
  shouldUseDatabaseSsl
};

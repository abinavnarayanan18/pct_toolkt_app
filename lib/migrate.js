// Run once to initialise the Postgres schema.
// Usage: node --input-type=module < lib/migrate.js
// Or call migrate() from a one-off script / deploy hook.
import { sql } from './pg.js';

export async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS cohorts (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name         TEXT        NOT NULL,
      sponsor      TEXT,
      status       TEXT        NOT NULL DEFAULT 'open',
      target       INTEGER     NOT NULL DEFAULT 20,
      avg_released BOOLEAN     NOT NULL DEFAULT FALSE,
      description  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      cohort_id    UUID        NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
      name         TEXT,
      role         TEXT,
      scores       JSONB       NOT NULL DEFAULT '[]',
      priority     INTEGER,
      ranking      JSONB       NOT NULL DEFAULT '[]',
      activators   JSONB       NOT NULL DEFAULT '{}',
      step         INTEGER     NOT NULL DEFAULT 0,
      ai_summary   JSONB,
      submitted_at TIMESTAMPTZ,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  return { ok: true };
}

// Allow running directly: node lib/migrate.js
if (process.argv[1] === new URL(import.meta.url).pathname) {
  migrate()
    .then(() => { console.log('Migration complete.'); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}

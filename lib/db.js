const { sql } = require('@vercel/postgres');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS cohorts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sponsor TEXT,
      status TEXT DEFAULT 'open',
      target INTEGER DEFAULT 20,
      cohort_avg_released INTEGER DEFAULT 0,
      description TEXT,
      audience TEXT DEFAULT 'leadership_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
      name TEXT,
      role TEXT DEFAULT 'leadership',
      anonymous BOOLEAN DEFAULT false,
      participant_name TEXT,
      scores TEXT DEFAULT '[]',
      priority INTEGER,
      ranking TEXT DEFAULT '[]',
      activators TEXT DEFAULT '{}',
      step INTEGER DEFAULT 0,
      ai_summary TEXT,
      ai_generated_at TEXT,
      submitted_at TEXT,
      updated_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pct_deltas (
      id SERIAL PRIMARY KEY,
      cohort_id TEXT NOT NULL,
      element_index INTEGER NOT NULL,
      leadership_avg REAL,
      org_avg REAL,
      delta REAL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(cohort_id, element_index)
    )
  `;
  // Add columns that may be missing on older deployments
  try { await sql`ALTER TABLE responses ADD COLUMN IF NOT EXISTS ai_generated_at TEXT`; } catch (_) {}
  try { await sql`ALTER TABLE responses ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT false`; } catch (_) {}
  try { await sql`ALTER TABLE responses ADD COLUMN IF NOT EXISTS participant_name TEXT`; } catch (_) {}
  try { await sql`ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'leadership_only'`; } catch (_) {}
}

async function seedAdmin() {
  const { rows } = await sql`SELECT id FROM admins WHERE email = 'admin@pctcatalyst.com'`;
  if (!rows.length) {
    const hash = await bcrypt.hash('pct-admin-2026', 10);
    await sql`
      INSERT INTO admins (id, email, password_hash, created_at)
      VALUES (${uuidv4()}, 'admin@pctcatalyst.com', ${hash}, ${new Date().toISOString()})
    `;
    console.log('Seeded admin: admin@pctcatalyst.com / pct-admin-2026');
  }
}

const initPromise = migrate().then(seedAdmin).catch(console.error);

// ── Cohort helpers ──────────────────────────────────────────────
const cohortHelpers = {
  async list() {
    await initPromise;
    const { rows } = await sql`
      SELECT c.*,
        COUNT(r.id)::int as response_count,
        SUM(CASE WHEN r.submitted_at IS NOT NULL THEN 1 ELSE 0 END)::int as submitted_count
      FROM cohorts c
      LEFT JOIN responses r ON r.cohort_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    return rows;
  },

  async get(id) {
    const { rows } = await sql`SELECT * FROM cohorts WHERE id = ${id}`;
    return rows[0] || null;
  },

  async create({ name, sponsor, status, target, description, audience }) {
    const now = new Date().toISOString();
    const id = uuidv4();
    await sql`
      INSERT INTO cohorts (id, name, sponsor, status, target, description, audience, created_at, updated_at)
      VALUES (${id}, ${name}, ${sponsor || null}, ${status || 'open'}, ${target || 20}, ${description || null}, ${audience || 'leadership_only'}, ${now}, ${now})
    `;
    const { rows } = await sql`SELECT * FROM cohorts WHERE id = ${id}`;
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['name', 'sponsor', 'status', 'target', 'description', 'cohort_avg_released', 'audience'];
    const now = new Date().toISOString();
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        if (k === 'name')                await sql`UPDATE cohorts SET name = ${fields[k]}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'sponsor')             await sql`UPDATE cohorts SET sponsor = ${fields[k]}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'status')              await sql`UPDATE cohorts SET status = ${fields[k]}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'target')              await sql`UPDATE cohorts SET target = ${fields[k]}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'description')         await sql`UPDATE cohorts SET description = ${fields[k]}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'cohort_avg_released') await sql`UPDATE cohorts SET cohort_avg_released = ${fields[k]}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'audience')            await sql`UPDATE cohorts SET audience = ${fields[k]}, updated_at = ${now} WHERE id = ${id}`;
      }
    }
    const { rows } = await sql`SELECT * FROM cohorts WHERE id = ${id}`;
    return rows[0] || null;
  },

  async delete(id) {
    await sql`DELETE FROM cohorts WHERE id = ${id}`;
  },

  async getResponses(cohortId) {
    const { rows } = await sql`
      SELECT * FROM responses WHERE cohort_id = ${cohortId} ORDER BY updated_at DESC
    `;
    return rows;
  },

  async getRadarData(cohortId) {
    const { rows } = await sql`
      SELECT scores FROM responses
      WHERE cohort_id = ${cohortId} AND submitted_at IS NOT NULL AND scores != '[]'
    `;
    if (!rows.length) return null;
    const avgs = Array(10).fill(0);
    let count = 0;
    for (const row of rows) {
      // Postgres may return TEXT as a string or already-parsed value — handle both
      const scores = typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores;
      if (Array.isArray(scores) && scores.length === 10 && scores.every(s => s !== null)) {
        for (let i = 0; i < 10; i++) avgs[i] += scores[i];
        count++;
      }
    }
    if (!count) return null;
    return avgs.map(v => +(v / count).toFixed(2));
  },

  async toggleRelease(id) {
    const { rows: cur } = await sql`SELECT cohort_avg_released FROM cohorts WHERE id = ${id}`;
    if (!cur.length) return null;
    const newVal = cur[0].cohort_avg_released ? 0 : 1;
    await sql`UPDATE cohorts SET cohort_avg_released = ${newVal}, updated_at = ${new Date().toISOString()} WHERE id = ${id}`;
    const { rows } = await sql`SELECT * FROM cohorts WHERE id = ${id}`;
    return rows[0];
  }
};

// ── Response helpers ───────────────────────────────────────────
const responseHelpers = {
  async get(id) {
    const { rows } = await sql`SELECT * FROM responses WHERE id = ${id}`;
    return rows[0] || null;
  },

  async create(cohortId, { name, role, anonymous, participant_name } = {}) {
    const now = new Date().toISOString();
    const id = uuidv4();
    await sql`
      INSERT INTO responses (id, cohort_id, name, role, anonymous, participant_name, scores, priority, ranking, activators, step, updated_at)
      VALUES (${id}, ${cohortId}, ${name || null}, ${role || 'leadership'}, ${anonymous || false}, ${participant_name || null}, '[]', NULL, '[]', '{}', 0, ${now})
    `;
    const { rows } = await sql`SELECT * FROM responses WHERE id = ${id}`;
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['name', 'role', 'scores', 'priority', 'ranking', 'activators', 'step', 'ai_summary', 'ai_generated_at'];
    const now = new Date().toISOString();
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        const v = (typeof fields[k] === 'object' && fields[k] !== null) ? JSON.stringify(fields[k]) : fields[k];
        if (k === 'name')            await sql`UPDATE responses SET name = ${v}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'role')            await sql`UPDATE responses SET role = ${v}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'scores')          await sql`UPDATE responses SET scores = ${v}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'priority')        await sql`UPDATE responses SET priority = ${v}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'ranking')         await sql`UPDATE responses SET ranking = ${v}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'activators')      await sql`UPDATE responses SET activators = ${v}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'step')            await sql`UPDATE responses SET step = ${v}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'ai_summary')      await sql`UPDATE responses SET ai_summary = ${v}, updated_at = ${now} WHERE id = ${id}`;
        if (k === 'ai_generated_at') await sql`UPDATE responses SET ai_generated_at = ${v}, updated_at = ${now} WHERE id = ${id}`;
      }
    }
    const { rows } = await sql`SELECT * FROM responses WHERE id = ${id}`;
    return rows[0] || null;
  },

  async submit(id) {
    const now = new Date().toISOString();
    await sql`UPDATE responses SET submitted_at = ${now}, step = 5, updated_at = ${now} WHERE id = ${id}`;
    const { rows } = await sql`SELECT * FROM responses WHERE id = ${id}`;
    return rows[0];
  },

  async delete(id) {
    await sql`DELETE FROM responses WHERE id = ${id}`;
  },

  async storeAISummary(id, summary) {
    const now = new Date().toISOString();
    await sql`
      UPDATE responses
      SET ai_summary = ${JSON.stringify(summary)}, ai_generated_at = ${now}, updated_at = ${now}
      WHERE id = ${id}
    `;
  }
};

// ── Admin helpers ──────────────────────────────────────────────
const adminHelpers = {
  async findByEmail(email) {
    const { rows } = await sql`SELECT * FROM admins WHERE email = ${email}`;
    return rows[0] || null;
  },

  async summary() {
    const [tc, oc, tr, sub, ai] = await Promise.all([
      sql`SELECT COUNT(*)::int as n FROM cohorts`,
      sql`SELECT COUNT(*)::int as n FROM cohorts WHERE status = 'open'`,
      sql`SELECT COUNT(*)::int as n FROM responses`,
      sql`SELECT COUNT(*)::int as n FROM responses WHERE submitted_at IS NOT NULL`,
      sql`SELECT COUNT(*)::int as n FROM responses WHERE ai_summary IS NOT NULL`,
    ]);
    return {
      totalCohorts:   tc.rows[0].n,
      openCohorts:    oc.rows[0].n,
      totalResponses: tr.rows[0].n,
      submitted:      sub.rows[0].n,
      withAI:         ai.rows[0].n,
    };
  },

  async exportCSV(cohortId) {
    const { rows: cohortRows } = await sql`SELECT * FROM cohorts WHERE id = ${cohortId}`;
    const { rows } = await sql`
      SELECT * FROM responses
      WHERE cohort_id = ${cohortId} AND submitted_at IS NOT NULL
    `;
    return { cohort: cohortRows[0] || null, rows };
  }
};

// ── Role-aware radar data ──────────────────────────────────────
async function getRadarDataByRole(cohortId) {
  const { rows } = await sql`
    SELECT role, scores FROM responses
    WHERE cohort_id = ${cohortId} AND submitted_at IS NOT NULL AND scores != '[]'
  `;

  function avgForGroup(group) {
    const avgs = Array(10).fill(0);
    let count = 0;
    for (const row of group) {
      const scores = typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores;
      if (Array.isArray(scores) && scores.length === 10 && scores.every(s => s !== null)) {
        for (let i = 0; i < 10; i++) avgs[i] += scores[i];
        count++;
      }
    }
    if (!count) return null;
    return avgs.map(v => +(v / count).toFixed(2));
  }

  const leadershipRows = rows.filter(r => !r.role || r.role === 'leadership');
  const orgRows        = rows.filter(r => r.role === 'org');

  return {
    leadership: avgForGroup(leadershipRows),
    org:        avgForGroup(orgRows)
  };
}

async function upsertDeltas(cohortId) {
  const { leadership, org } = await getRadarDataByRole(cohortId);

  const results = [];
  for (let i = 0; i < 10; i++) {
    const la = leadership ? leadership[i] : null;
    const oa = org ? org[i] : null;
    const delta = (la !== null && oa !== null) ? +(oa - la).toFixed(2) : null;

    await sql`
      INSERT INTO pct_deltas (cohort_id, element_index, leadership_avg, org_avg, delta, updated_at)
      VALUES (${cohortId}, ${i}, ${la}, ${oa}, ${delta}, NOW())
      ON CONFLICT (cohort_id, element_index)
      DO UPDATE SET leadership_avg = EXCLUDED.leadership_avg,
                    org_avg        = EXCLUDED.org_avg,
                    delta          = EXCLUDED.delta,
                    updated_at     = NOW()
    `;
    results.push({ elementIndex: i, leadershipAvg: la, orgAvg: oa, delta });
  }
  return results;
}

async function getRankedPCTs(cohortId) {
  const cohort = await cohortHelpers.get(cohortId);
  if (!cohort) return [];

  const { rows } = await sql`
    SELECT element_index, leadership_avg, org_avg, delta
    FROM pct_deltas WHERE cohort_id = ${cohortId}
    ORDER BY element_index
  `;

  if (!rows.length) return [];

  const audience = cohort.audience || 'leadership_only';

  let sorted;
  if (audience === 'mixed') {
    sorted = [...rows].sort((a, b) => {
      const da = a.delta !== null ? a.delta : 999;
      const db = b.delta !== null ? b.delta : 999;
      if (da !== db) return da - db;
      const la = a.leadership_avg !== null ? a.leadership_avg : 999;
      const lb = b.leadership_avg !== null ? b.leadership_avg : 999;
      return la - lb;
    });
  } else {
    sorted = [...rows].sort((a, b) => {
      const la = a.leadership_avg !== null ? a.leadership_avg : 999;
      const lb = b.leadership_avg !== null ? b.leadership_avg : 999;
      return la - lb;
    });
  }

  return sorted.map((r, rank) => ({
    elementIndex:  r.element_index,
    rank:          rank + 1,
    leadershipAvg: r.leadership_avg,
    orgAvg:        r.org_avg,
    delta:         r.delta
  }));
}

module.exports = { cohortHelpers, responseHelpers, adminHelpers, getRadarDataByRole, upsertDeltas, getRankedPCTs };
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'pct_catalyst.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS cohorts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sponsor TEXT,
    status TEXT DEFAULT 'open',
    target INTEGER DEFAULT 20,
    cohort_avg_released INTEGER DEFAULT 0,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    name TEXT,
    role TEXT,
    scores TEXT DEFAULT '[]',
    priority INTEGER,
    ranking TEXT DEFAULT '[]',
    activators TEXT DEFAULT '{}',
    step INTEGER DEFAULT 0,
    ai_summary TEXT,
    ai_generated_at TEXT,
    submitted_at TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Seed admin
function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get('admin@pctcatalyst.com');
  if (!existing) {
    const hash = bcrypt.hashSync('pct-admin-2026', 10);
    db.prepare(`
      INSERT INTO admins (id, email, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), 'admin@pctcatalyst.com', hash, new Date().toISOString());
    console.log('Seeded admin: admin@pctcatalyst.com / pct-admin-2026');
  }
}

seedAdmin();

// ── Cohort helpers ──────────────────────────────────────────────
const cohortHelpers = {
  list() {
    return db.prepare(`
      SELECT c.*, COUNT(r.id) as response_count,
        SUM(CASE WHEN r.submitted_at IS NOT NULL THEN 1 ELSE 0 END) as submitted_count
      FROM cohorts c
      LEFT JOIN responses r ON r.cohort_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();
  },

  get(id) {
    return db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
  },

  create({ name, sponsor, status, target, description }) {
    const now = new Date().toISOString();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO cohorts (id, name, sponsor, status, target, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, sponsor || null, status || 'open', target || 20, description || null, now, now);
    return db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
  },

  update(id, fields) {
    const allowed = ['name', 'sponsor', 'status', 'target', 'description', 'cohort_avg_released'];
    const updates = [];
    const vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        updates.push(`${k} = ?`);
        vals.push(fields[k]);
      }
    }
    if (!updates.length) return db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
    vals.push(new Date().toISOString(), id);
    db.prepare(`UPDATE cohorts SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`).run(...vals);
    return db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM cohorts WHERE id = ?').run(id);
  },

  getResponses(cohortId) {
    return db.prepare(`
      SELECT * FROM responses WHERE cohort_id = ? ORDER BY updated_at DESC
    `).all(cohortId);
  },

  getRadarData(cohortId) {
    const rows = db.prepare(`
      SELECT scores FROM responses
      WHERE cohort_id = ? AND submitted_at IS NOT NULL AND scores != '[]'
    `).all(cohortId);

    if (!rows.length) return null;

    const avgs = Array(10).fill(0);
    let count = 0;
    for (const row of rows) {
      const scores = JSON.parse(row.scores);
      if (scores.length === 10 && scores.every(s => s !== null)) {
        for (let i = 0; i < 10; i++) avgs[i] += scores[i];
        count++;
      }
    }
    if (!count) return null;
    return avgs.map(v => +(v / count).toFixed(2));
  },

  toggleRelease(id) {
    const cohort = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
    if (!cohort) return null;
    const newVal = cohort.cohort_avg_released ? 0 : 1;
    db.prepare('UPDATE cohorts SET cohort_avg_released = ?, updated_at = ? WHERE id = ?')
      .run(newVal, new Date().toISOString(), id);
    return db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
  }
};

// ── Response helpers ───────────────────────────────────────────
const responseHelpers = {
  get(id) {
    return db.prepare('SELECT * FROM responses WHERE id = ?').get(id);
  },

  create(cohortId, { name, role } = {}) {
    const now = new Date().toISOString();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO responses (id, cohort_id, name, role, scores, priority, ranking, activators, step, updated_at)
      VALUES (?, ?, ?, ?, '[]', NULL, '[]', '{}', 0, ?)
    `).run(id, cohortId, name || null, role || null, now);
    return db.prepare('SELECT * FROM responses WHERE id = ?').get(id);
  },

  update(id, fields) {
    const allowed = ['name', 'role', 'scores', 'priority', 'ranking', 'activators', 'step', 'ai_summary', 'ai_generated_at'];
    const updates = [];
    const vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        updates.push(`${k} = ?`);
        const v = typeof fields[k] === 'object' && fields[k] !== null ? JSON.stringify(fields[k]) : fields[k];
        vals.push(v);
      }
    }
    if (!updates.length) return db.prepare('SELECT * FROM responses WHERE id = ?').get(id);
    vals.push(new Date().toISOString(), id);
    db.prepare(`UPDATE responses SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`).run(...vals);
    return db.prepare('SELECT * FROM responses WHERE id = ?').get(id);
  },

  submit(id) {
    const now = new Date().toISOString();
    db.prepare(`UPDATE responses SET submitted_at = ?, step = 6, updated_at = ? WHERE id = ?`)
      .run(now, now, id);
    return db.prepare('SELECT * FROM responses WHERE id = ?').get(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM responses WHERE id = ?').run(id);
  },

  storeAISummary(id, summary) {
    const now = new Date().toISOString();
    db.prepare(`UPDATE responses SET ai_summary = ?, ai_generated_at = ?, updated_at = ? WHERE id = ?`)
      .run(JSON.stringify(summary), now, now, id);
  }
};

// ── Admin helpers ──────────────────────────────────────────────
const adminHelpers = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  },

  summary() {
    const totalCohorts = db.prepare('SELECT COUNT(*) as n FROM cohorts').get().n;
    const openCohorts = db.prepare("SELECT COUNT(*) as n FROM cohorts WHERE status = 'open'").get().n;
    const totalResponses = db.prepare('SELECT COUNT(*) as n FROM responses').get().n;
    const submitted = db.prepare('SELECT COUNT(*) as n FROM responses WHERE submitted_at IS NOT NULL').get().n;
    const withAI = db.prepare('SELECT COUNT(*) as n FROM responses WHERE ai_summary IS NOT NULL').get().n;
    return { totalCohorts, openCohorts, totalResponses, submitted, withAI };
  },

  exportCSV(cohortId) {
    const cohort = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(cohortId);
    const rows = db.prepare('SELECT * FROM responses WHERE cohort_id = ? AND submitted_at IS NOT NULL').all(cohortId);
    return { cohort, rows };
  }
};

module.exports = { cohortHelpers, responseHelpers, adminHelpers };

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const { cohortHelpers, responseHelpers, adminHelpers, getRadarDataByRole, upsertDeltas, getRankedPCTs } = require('./lib/db');
const { isAIAvailable, generateIndividualSummary, generateCohortSynthesis } = require('./lib/ai');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pct-catalyst-dev-secret-change-in-prod';
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.cdnfonts.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://fonts.cdnfonts.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(compression());
app.use(morgan(IS_PROD ? 'combined' : 'dev'));
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a minute.' }
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: IS_PROD ? '1d' : 0,
  etag: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// ── Helpers ──────────────────────────────────────────────────
// Safely parse a value that may already be a parsed object or a JSON string
function safeParse(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val; // already parsed by Postgres driver
  try { return JSON.parse(val); } catch { return fallback; }
}

// ── Auth middleware ──────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.admin = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Auth routes ──────────────────────────────────────────────
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const admin = await adminHelpers.findByEmail(email);
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, email: admin.email });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => res.json({ ok: true }));

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ email: req.admin.email });
});

// ── Cohort routes ────────────────────────────────────────────
app.get('/api/cohorts', async (req, res) => {
  try {
    res.json(await cohortHelpers.list());
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to list cohorts' });
  }
});

app.post('/api/cohorts', requireAuth, async (req, res) => {
  try {
    const { name, sponsor, status, target, description, audience } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    res.status(201).json(await cohortHelpers.create({ name, sponsor, status, target, description, audience }));
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to create cohort' });
  }
});

app.get('/api/cohorts/:id', async (req, res) => {
  try {
    const cohort = await cohortHelpers.get(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    res.json(cohort);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to get cohort' });
  }
});

app.patch('/api/cohorts/:id', requireAuth, async (req, res) => {
  try {
    const cohort = await cohortHelpers.get(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    res.json(await cohortHelpers.update(req.params.id, req.body));
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to update cohort' });
  }
});

app.delete('/api/cohorts/:id', requireAuth, async (req, res) => {
  try {
    await cohortHelpers.delete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to delete cohort' });
  }
});

app.get('/api/cohorts/:id/responses', requireAuth, async (req, res) => {
  try {
    const cohort = await cohortHelpers.get(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    res.json(await cohortHelpers.getResponses(req.params.id));
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to get responses' });
  }
});

app.get('/api/cohorts/:id/radar', async (req, res) => {
  try {
    const cohort = await cohortHelpers.get(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    const { leadership, org } = await getRadarDataByRole(req.params.id);
    res.json({
      released:   !!cohort.cohort_avg_released,
      audience:   cohort.audience || 'leadership_only',
      leadership,
      org
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to get radar data' });
  }
});

app.patch('/api/cohorts/:id/release', requireAuth, async (req, res) => {
  try {
    const cohort = await cohortHelpers.toggleRelease(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    res.json(cohort);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to toggle release' });
  }
});

app.post('/api/cohorts/:id/synthesize', requireAuth, async (req, res) => {
  try {
    if (!isAIAvailable()) {
      return res.status(503).json({ error: 'AI synthesis unavailable — ANTHROPIC_API_KEY not configured' });
    }
    const cohort = await cohortHelpers.get(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    const responses = await cohortHelpers.getResponses(req.params.id);
    const synthesis = await generateCohortSynthesis(cohort, responses);
    res.json(synthesis);
  } catch (e) {
    console.error('Cohort synthesis error:', e.message);
    res.status(500).json({ error: 'AI synthesis failed', detail: e.message });
  }
});

// ── Response routes ──────────────────────────────────────────
app.post('/api/cohorts/:id/responses', async (req, res) => {
  try {
    const cohort = await cohortHelpers.get(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
    if (cohort.status !== 'open') return res.status(403).json({ error: 'Cohort is closed' });
    const { role, anonymous, participantName } = req.body;
    res.status(201).json(await responseHelpers.create(req.params.id, {
      ...req.body,
      role: role || 'leadership',
      anonymous: !!anonymous,
      participant_name: participantName || null
    }));
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to create response' });
  }
});

app.post('/api/responses/solo', async (req, res) => {
  try {
    const { participantName, anonymous, role } = req.body;
    let cohortName;
    if (participantName && participantName.trim()) {
      cohortName = `${participantName.trim()}'s Session`;
    } else {
      cohortName = `Anonymous Session ${Date.now()}`;
    }
    const cohort = await cohortHelpers.create({
      name: cohortName,
      status: 'open',
      audience: 'leadership_only'
    });
    const response = await responseHelpers.create(cohort.id, {
      name: anonymous ? null : (participantName || null),
      role: role || 'leadership',
      anonymous: !!anonymous,
      participant_name: participantName || null
    });
    res.status(201).json({ ...response, cohortId: cohort.id });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to create solo session' });
  }
});

app.get('/api/responses/:id', async (req, res) => {
  try {
    const response = await responseHelpers.get(req.params.id);
    if (!response) return res.status(404).json({ error: 'Not found' });
    res.json(response);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to get response' });
  }
});

app.patch('/api/responses/:id', async (req, res) => {
  try {
    const response = await responseHelpers.get(req.params.id);
    if (!response) return res.status(404).json({ error: 'Not found' });
    res.json(await responseHelpers.update(req.params.id, req.body));
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to update response' });
  }
});

app.post('/api/responses/:id/submit', async (req, res) => {
  try {
    const response = await responseHelpers.get(req.params.id);
    if (!response) return res.status(404).json({ error: 'Not found' });
    res.json(await responseHelpers.submit(req.params.id));
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

app.delete('/api/responses/:id', requireAuth, async (req, res) => {
  try {
    await responseHelpers.delete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

// ── AI routes ────────────────────────────────────────────────
app.get('/api/ai/status', (req, res) => {
  res.json({ available: isAIAvailable() });
});

app.post('/api/responses/:id/analyze', async (req, res) => {
  try {
    if (!isAIAvailable()) {
      return res.status(503).json({ error: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured' });
    }
    const response = await responseHelpers.get(req.params.id);
    if (!response) return res.status(404).json({ error: 'Not found' });
    const cohort = await cohortHelpers.get(response.cohort_id);
    const summary = await generateIndividualSummary(response, cohort ? cohort.name : 'Unknown Cohort');
    await responseHelpers.storeAISummary(req.params.id, summary);
    res.json(summary);
  } catch (e) {
    console.error('AI analysis error:', e.message);
    res.status(500).json({ error: 'AI analysis failed', detail: e.message });
  }
});

// ── Admin routes ─────────────────────────────────────────────
app.get('/api/admin/summary', requireAuth, async (req, res) => {
  try {
    res.json(await adminHelpers.summary());
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

app.get('/api/admin/export/:cohortId', async (req, res) => {
  // Accept token from Authorization header OR ?token= query param (for direct browser downloads)
  let token = null;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { cohort, rows } = await adminHelpers.exportCSV(req.params.cohortId);
    if (!cohort) return res.status(404).json({ error: 'Not found' });

    const PCT_TITLES = [
      'Communicate_a_Compelling_Change_Narrative',
      'Act_to_Think_Differently',
      'Embrace_Situational_Humility',
      'Focus_Attention_on_What_Matters',
      'Motivate_Discretionary_Effort',
      'Give_Others_Agency',
      'Decentralize_Decision_Making',
      'Catalyze_the_Network',
      'Lead_the_System',
      'Nudge_the_Culture'
    ];

    const headers = [
      'id', 'name', 'role', 'submitted_at',
      ...PCT_TITLES.map((t, i) => `PCT${i + 1}_${t}`),
      'priority_element', 'ai_generated_at'
    ];

    const csvRows = rows.map(r => {
      const scores = safeParse(r.scores, []);
      const priority = r.priority !== null && r.priority !== undefined ? r.priority : '';
      const priorityTitle = priority !== '' ? `PCT${Number(priority) + 1}` : '';
      return [
        r.id, r.name || '', r.role || '', r.submitted_at || '',
        ...Array.isArray(scores) ? scores.map(s => s ?? '') : Array(10).fill(''),
        priorityTitle,
        r.ai_generated_at || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pct_${cohort.name.replace(/[^a-z0-9]/gi, '_')}_export.csv"`);
    res.send(csv);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Export failed' });
  }
});
app.post('/api/cohorts/:id/compute-deltas', requireAuth, async (req, res) => {
  try {
    const cohort = await cohortHelpers.get(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    const deltas = await upsertDeltas(req.params.id);
    const rankedPCTs = await getRankedPCTs(req.params.id);
    res.json({ deltas, rankedPCTs });
  } catch (e) {
    console.error('Compute deltas error:', e.message);
    res.status(500).json({ error: 'Failed to compute deltas' });
  }
});

app.get('/api/cohorts/:id/ranked-pcts', async (req, res) => {
  try {
    const cohort = await cohortHelpers.get(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    if (!cohort.cohort_avg_released) return res.status(403).json({ error: 'Rankings not yet released' });
    res.json(await getRankedPCTs(req.params.id));
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Failed to get ranked PCTs' });
  }
});

app.get('/api/cohorts/:id/synthesize', async (req, res) => {
  try {
    if (!isAIAvailable()) return res.status(503).json({ error: 'AI unavailable' });
    const cohort = await cohortHelpers.get(req.params.id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    if (!cohort.cohort_avg_released) return res.status(403).json({ error: 'Not released' });
    const responses = await cohortHelpers.getResponses(req.params.id);
    const synthesis = await generateCohortSynthesis(cohort, responses);
    res.json(synthesis);
  } catch (e) {
    console.error('Synthesis error:', e.message);
    res.status(500).json({ error: 'AI synthesis failed' });
  }
});

// ── SPA fallback ─────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PCT Catalyst running at http://localhost:${PORT}`);
  console.log(`Admin: admin@pctcatalyst.com / pct-admin-2026`);
});
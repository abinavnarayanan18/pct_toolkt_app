require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const { cohortHelpers, responseHelpers, adminHelpers } = require('./lib/db');
const { isAIAvailable, generateIndividualSummary, generateCohortSynthesis } = require('./lib/ai');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pct-catalyst-dev-secret-change-in-prod';
const IS_PROD = process.env.NODE_ENV === 'production';

// Trust Railway's proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));

// Compress responses
app.use(compression());

// Request logging
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// Body parsing
app.use(express.json());

// Rate limit login endpoint
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a minute.' }
});

// Static files with cache headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: IS_PROD ? '1d' : 0,
  etag: true,
  setHeaders(res, filePath) {
    // Don't cache HTML
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

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
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const admin = adminHelpers.findByEmail(email);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, email: admin.email });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ email: req.admin.email });
});

// ── Cohort routes ────────────────────────────────────────────
app.get('/api/cohorts', (req, res) => {
  res.json(cohortHelpers.list());
});

app.post('/api/cohorts', requireAuth, (req, res) => {
  const { name, sponsor, status, target, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  res.status(201).json(cohortHelpers.create({ name, sponsor, status, target, description }));
});

app.get('/api/cohorts/:id', (req, res) => {
  const cohort = cohortHelpers.get(req.params.id);
  if (!cohort) return res.status(404).json({ error: 'Not found' });
  res.json(cohort);
});

app.patch('/api/cohorts/:id', requireAuth, (req, res) => {
  const cohort = cohortHelpers.get(req.params.id);
  if (!cohort) return res.status(404).json({ error: 'Not found' });
  res.json(cohortHelpers.update(req.params.id, req.body));
});

app.delete('/api/cohorts/:id', requireAuth, (req, res) => {
  cohortHelpers.delete(req.params.id);
  res.json({ ok: true });
});

app.get('/api/cohorts/:id/responses', requireAuth, (req, res) => {
  const cohort = cohortHelpers.get(req.params.id);
  if (!cohort) return res.status(404).json({ error: 'Not found' });
  res.json(cohortHelpers.getResponses(req.params.id));
});

app.get('/api/cohorts/:id/radar', (req, res) => {
  const cohort = cohortHelpers.get(req.params.id);
  if (!cohort) return res.status(404).json({ error: 'Not found' });
  const data = cohortHelpers.getRadarData(req.params.id);
  res.json({ released: !!cohort.cohort_avg_released, data });
});

app.patch('/api/cohorts/:id/release', requireAuth, (req, res) => {
  const cohort = cohortHelpers.toggleRelease(req.params.id);
  if (!cohort) return res.status(404).json({ error: 'Not found' });
  res.json(cohort);
});

app.post('/api/cohorts/:id/synthesize', requireAuth, async (req, res) => {
  if (!isAIAvailable()) {
    return res.status(503).json({ error: 'AI synthesis unavailable — ANTHROPIC_API_KEY not configured' });
  }
  const cohort = cohortHelpers.get(req.params.id);
  if (!cohort) return res.status(404).json({ error: 'Not found' });
  const responses = cohortHelpers.getResponses(req.params.id);
  try {
    const synthesis = await generateCohortSynthesis(cohort, responses);
    res.json(synthesis);
  } catch (e) {
    console.error('Cohort synthesis error:', e.message);
    res.status(500).json({ error: 'AI synthesis failed', detail: e.message });
  }
});

// ── Response routes ──────────────────────────────────────────
app.post('/api/cohorts/:id/responses', (req, res) => {
  const cohort = cohortHelpers.get(req.params.id);
  if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
  if (cohort.status !== 'open') return res.status(403).json({ error: 'Cohort is closed' });
  res.status(201).json(responseHelpers.create(req.params.id, req.body));
});

app.get('/api/responses/:id', (req, res) => {
  const response = responseHelpers.get(req.params.id);
  if (!response) return res.status(404).json({ error: 'Not found' });
  res.json(response);
});

app.patch('/api/responses/:id', (req, res) => {
  const response = responseHelpers.get(req.params.id);
  if (!response) return res.status(404).json({ error: 'Not found' });
  res.json(responseHelpers.update(req.params.id, req.body));
});

app.post('/api/responses/:id/submit', (req, res) => {
  const response = responseHelpers.get(req.params.id);
  if (!response) return res.status(404).json({ error: 'Not found' });
  res.json(responseHelpers.submit(req.params.id));
});

app.delete('/api/responses/:id', requireAuth, (req, res) => {
  responseHelpers.delete(req.params.id);
  res.json({ ok: true });
});

// ── AI routes ────────────────────────────────────────────────
app.get('/api/ai/status', (req, res) => {
  res.json({ available: isAIAvailable() });
});

app.post('/api/responses/:id/analyze', async (req, res) => {
  if (!isAIAvailable()) {
    return res.status(503).json({ error: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured' });
  }
  const response = responseHelpers.get(req.params.id);
  if (!response) return res.status(404).json({ error: 'Not found' });
  const cohort = cohortHelpers.get(response.cohort_id);
  try {
    const summary = await generateIndividualSummary(response, cohort ? cohort.name : 'Unknown Cohort');
    responseHelpers.storeAISummary(req.params.id, summary);
    res.json(summary);
  } catch (e) {
    console.error('AI analysis error:', e.message);
    res.status(500).json({ error: 'AI analysis failed', detail: e.message });
  }
});

// ── Admin routes ─────────────────────────────────────────────
app.get('/api/admin/summary', requireAuth, (req, res) => {
  res.json(adminHelpers.summary());
});

app.get('/api/admin/export/:cohortId', requireAuth, (req, res) => {
  const { cohort, rows } = adminHelpers.exportCSV(req.params.cohortId);
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
    const scores = JSON.parse(r.scores || '[]');
    const priority = r.priority !== null && r.priority !== undefined ? r.priority : '';
    const priorityTitle = priority !== '' ? `PCT${Number(priority) + 1}` : '';
    return [
      r.id, r.name || '', r.role || '', r.submitted_at || '',
      ...scores.map(s => s ?? ''),
      priorityTitle,
      r.ai_generated_at || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...csvRows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="pct_${cohort.name.replace(/[^a-z0-9]/gi, '_')}_export.csv"`);
  res.send(csv);
});

// SPA fallback — serve index.html for all non-API routes
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

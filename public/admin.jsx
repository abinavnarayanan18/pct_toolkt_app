// ── Admin Console ────────────────────────────────────────────

function AdminApp() {
  const [token, setToken] = React.useState(() => localStorage.getItem('pct_admin_token'));
  const [activeNav, setActiveNav] = React.useState('overview');
  const [cohorts, setCohorts] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [selectedCohort, setSelectedCohort] = React.useState(null);
  const [responses, setResponses] = React.useState([]);
  const [slideoverResponse, setSlideoverResponse] = React.useState(null);
  const [cohortModal, setCohortModal] = React.useState(null);
  const [synthResult, setSynthResult] = React.useState(null);
  const [synthLoading, setSynthLoading] = React.useState(false);
  const [aiAvailable, setAiAvailable] = React.useState(null);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  function handleLogout() {
    localStorage.removeItem('pct_admin_token');
    setToken(null);
  }

  async function loadCohorts() {
    const r = await fetch('/api/cohorts', { headers: authHeader });
    const data = await r.json();
    if (Array.isArray(data)) setCohorts(data);
  }

  async function loadStats() {
    if (!token) return;
    const r = await fetch('/api/admin/summary', { headers: authHeader });
    const data = await r.json();
    if (!data.error) setStats(data);
  }

  async function loadResponses(cohortId) {
    const r = await fetch(`/api/cohorts/${cohortId}/responses`, { headers: authHeader });
    const data = await r.json();
    if (Array.isArray(data)) setResponses(data);
  }

  React.useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(data => setAiAvailable(!!data.available));
  }, []);

  React.useEffect(() => {
    if (token) {
      loadCohorts();
      loadStats();
    }
  }, [token]);

  React.useEffect(() => {
    if (selectedCohort) loadResponses(selectedCohort.id);
  }, [selectedCohort]);

  if (!token) return <AdminLogin onLogin={t => { localStorage.setItem('pct_admin_token', t); setToken(t); }} />;

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div style={{ marginBottom: 24 }}>
          <div className="label" style={{ marginBottom: 8 }}>Navigation</div>
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'cohorts', label: '👥 Cohorts' },
            { id: 'responses', label: '📝 Responses' }
          ].map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <button className="admin-nav-item" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </div>

      {/* Main content */}
      <div className="admin-content">
        {activeNav === 'overview' && (
          <AdminOverview stats={stats} cohorts={cohorts} onRefresh={() => { loadCohorts(); loadStats(); }} />
        )}
        {activeNav === 'cohorts' && (
          <AdminCohorts
            cohorts={cohorts}
            token={token}
            onSelect={c => { setSelectedCohort(c); setActiveNav('responses'); }}
            onRefresh={loadCohorts}
            onNew={() => setCohortModal({})}
          />
        )}
        {activeNav === 'responses' && (
          <AdminResponses
            cohorts={cohorts}
            selectedCohort={selectedCohort}
            responses={responses}
            token={token}
            aiAvailable={aiAvailable}
            onSelectCohort={c => { setSelectedCohort(c); loadResponses(c.id); }}
            onOpenResponse={r => setSlideoverResponse(r)}
            onRefresh={() => selectedCohort && loadResponses(selectedCohort.id)}
            onToggleRelease={async () => {
              if (!selectedCohort) return;
              const r = await fetch(`/api/cohorts/${selectedCohort.id}/release`, {
                method: 'PATCH', headers: authHeader
              });
              const data = await r.json();
              if (!data.error) {
                setSelectedCohort(data);
                loadCohorts();
              }
            }}
            onSynthesize={async () => {
              if (!selectedCohort) return;
              setSynthLoading(true);
              setSynthResult(null);
              const r = await fetch(`/api/cohorts/${selectedCohort.id}/synthesize`, {
                method: 'POST', headers: authHeader
              });
              const data = await r.json();
              setSynthLoading(false);
              if (!data.error) setSynthResult(data);
            }}
            synthResult={synthResult}
            synthLoading={synthLoading}
          />
        )}
      </div>

      {/* Response slide-over */}
      {slideoverResponse && (
        <>
          <div className="overlay" style={{ alignItems: 'stretch', justifyContent: 'flex-end', padding: 0 }}
            onClick={() => setSlideoverResponse(null)} />
          <ResponseSlideover
            response={slideoverResponse}
            token={token}
            aiAvailable={aiAvailable}
            onClose={() => setSlideoverResponse(null)}
            onDelete={async () => {
              await fetch(`/api/responses/${slideoverResponse.id}`, { method: 'DELETE', headers: authHeader });
              setSlideoverResponse(null);
              if (selectedCohort) loadResponses(selectedCohort.id);
            }}
          />
        </>
      )}

      {/* New cohort modal */}
      {cohortModal !== null && (
        <CohortModal
          cohort={cohortModal}
          token={token}
          onClose={() => setCohortModal(null)}
          onSaved={() => { setCohortModal(null); loadCohorts(); }}
        />
      )}
    </div>
  );
}

// ── Admin Login ──────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    onLogin(data.token);
  }

  return (
    <div className="page-center" style={{ paddingTop: 80, maxWidth: 440 }}>
      <div className="card card-lg">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="brand-mark" style={{ width: 48, height: 48, margin: '0 auto 12px' }}>PCT</div>
          <h2>Admin Login</h2>
          <p className="small muted">PCT Catalyst Facilitator Console</p>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────
function AdminOverview({ stats, cohorts, onRefresh }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2>Platform Overview</h2>
        <button className="btn btn-secondary btn-sm" onClick={onRefresh}>↺ Refresh</button>
      </div>

      {stats && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-num">{stats.totalCohorts}</div>
            <div className="stat-label">Total Cohorts</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.openCohorts}</div>
            <div className="stat-label">Open Cohorts</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.totalResponses}</div>
            <div className="stat-label">Total Responses</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.submitted}</div>
            <div className="stat-label">Submitted</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.withAI}</div>
            <div className="stat-label">AI Analyses</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Recent Cohorts</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Sponsor</th>
                <th>Status</th>
                <th>Responses</th>
                <th>Submitted</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.sponsor || '—'}</td>
                  <td>
                    <span className={`badge ${c.status === 'open' ? 'badge-green' : 'badge-gray'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{c.response_count || 0}</td>
                  <td>{c.submitted_count || 0}</td>
                  <td className="small muted">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {!cohorts.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32 }}>No cohorts yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Cohorts Tab ──────────────────────────────────────────────
function AdminCohorts({ cohorts, token, onSelect, onRefresh, onNew }) {
  const authHeader = { Authorization: `Bearer ${token}` };

  async function handleDelete(c) {
    if (!confirm(`Delete cohort "${c.name}" and all its responses?`)) return;
    await fetch(`/api/cohorts/${c.id}`, { method: 'DELETE', headers: authHeader });
    onRefresh();
  }

  async function handleToggle(c) {
    await fetch(`/api/cohorts/${c.id}`, {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: c.status === 'open' ? 'closed' : 'open' })
    });
    onRefresh();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2>Cohorts</h2>
        <button className="btn btn-primary btn-sm" onClick={onNew}>+ New Cohort</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cohort</th>
                <th>Sponsor</th>
                <th>Status</th>
                <th>Target</th>
                <th>Responses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map(c => (
                <tr key={c.id}>
                  <td>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', padding: 0 }}
                      onClick={() => onSelect(c)}
                    >
                      {c.name}
                    </button>
                    {c.description && <p className="small muted" style={{ marginTop: 2 }}>{c.description.slice(0, 60)}{c.description.length > 60 ? '…' : ''}</p>}
                  </td>
                  <td>{c.sponsor || '—'}</td>
                  <td>
                    <span className={`badge ${c.status === 'open' ? 'badge-green' : 'badge-gray'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{c.target}</td>
                  <td>{c.response_count || 0} / {c.submitted_count || 0} submitted</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => onSelect(c)}>View</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(c)}>
                        {c.status === 'open' ? 'Close' : 'Open'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!cohorts.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32 }}>No cohorts yet. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Responses Tab ─────────────────────────────────────────────
function AdminResponses({ cohorts, selectedCohort, responses, token, aiAvailable, onSelectCohort, onOpenResponse, onRefresh, onToggleRelease, onSynthesize, synthResult, synthLoading }) {
  const [showSynth, setShowSynth] = React.useState(false);

  async function handleExport() {
    if (!selectedCohort) return;
    window.open(`/api/admin/export/${selectedCohort.id}?token=${token}`, '_blank');
  }

  const cohort = selectedCohort;
  const submitted = responses.filter(r => r.submitted_at);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Responses</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {cohort && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={onRefresh}>↺ Refresh</button>
              <button className="btn btn-secondary btn-sm" onClick={handleExport}>⬇ CSV</button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onToggleRelease}
                title="Toggle cohort average visibility for participants"
              >
                {cohort.cohort_avg_released ? '🔒 Hide Avg' : '📊 Release Avg'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setShowSynth(true); onSynthesize(); }}
                disabled={!aiAvailable}
                title={!aiAvailable ? 'API key not configured' : undefined}
              >
                ✦ Cohort Synthesis
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cohort selector */}
      <div className="form-group" style={{ marginBottom: 16, maxWidth: 300 }}>
        <label className="form-label">Select Cohort</label>
        <select
          className="form-select"
          value={cohort?.id || ''}
          onChange={e => {
            const c = cohorts.find(x => x.id === e.target.value);
            if (c) onSelectCohort(c);
          }}
        >
          <option value="">— Choose cohort —</option>
          {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Cohort stats */}
      {cohort && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="badge badge-gray">{responses.length} responses total</div>
          <div className="badge badge-green">{submitted.length} submitted</div>
          <div className={`badge ${cohort.status === 'open' ? 'badge-green' : 'badge-gray'}`}>
            {cohort.status}
          </div>
          {cohort.cohort_avg_released ? (
            <div className="badge badge-blue">Avg released to participants</div>
          ) : null}
        </div>
      )}

      {/* Synthesis result */}
      {showSynth && (
        <div className="card" style={{ marginBottom: 20, border: '1.5px solid var(--accent)' }}>
          <div className="card-header">
            <h3>✦ Cohort Synthesis</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowSynth(false)}>✕</button>
          </div>
          {synthLoading && <div className="loading-block"><div className="spinner" /> Generating synthesis…</div>}
          {synthResult && !synthLoading && <CohortSynthesisDisplay synthesis={synthResult} />}
        </div>
      )}

      {/* Responses table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Progress</th>
                <th>Submitted</th>
                <th>AI Analysis</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {responses.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.name || '—'}</strong></td>
                  <td>{r.role || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="score-bar" style={{ width: 60 }}>
                        <div className="score-bar-fill" style={{ width: `${(r.step / 6) * 100}%` }} />
                      </div>
                      <span className="small muted">Step {r.step}/6</span>
                    </div>
                  </td>
                  <td>
                    {r.submitted_at
                      ? <span className="badge badge-green">✓ {new Date(r.submitted_at).toLocaleDateString()}</span>
                      : <span className="badge badge-gray">In progress</span>}
                  </td>
                  <td>
                    {r.ai_summary
                      ? <span className="badge badge-green" title={r.ai_generated_at ? `Generated: ${new Date(r.ai_generated_at).toLocaleString()}` : ''}>✓ Generated</span>
                      : <span className="badge badge-gray">—</span>}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => onOpenResponse(r)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!responses.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32 }}>
                  {cohort ? 'No responses yet for this cohort.' : 'Select a cohort to view responses.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Cohort Synthesis display ──────────────────────────────────
function CohortSynthesisDisplay({ synthesis }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      {synthesis.cohortHeadline && (
        <div>
          <div className="label">Cohort Theme</div>
          <p className="headline-text" style={{ marginTop: 4 }}>"{synthesis.cohortHeadline}"</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {synthesis.collectiveStrengths && (
          <div style={{ background: 'var(--accent-tint)', borderRadius: 'var(--radius-sm)', padding: 12, borderLeft: '3px solid var(--accent)' }}>
            <div className="label" style={{ marginBottom: 6 }}>Collective Strengths</div>
            <p className="small">{synthesis.collectiveStrengths}</p>
          </div>
        )}
        {synthesis.collectiveDevelopment && (
          <div style={{ background: '#fff8f0', borderRadius: 'var(--radius-sm)', padding: 12, borderLeft: '3px solid #e07a40' }}>
            <div className="label" style={{ marginBottom: 6 }}>Collective Development</div>
            <p className="small">{synthesis.collectiveDevelopment}</p>
          </div>
        )}
      </div>

      {synthesis.priorityAlignment && (
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Priority Alignment</div>
          <p className="small">{synthesis.priorityAlignment}</p>
        </div>
      )}

      {synthesis.facilitatorRecommendations && (
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Facilitator Recommendations</div>
          {synthesis.facilitatorRecommendations.map((rec, i) => (
            <div key={i} style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{rec.focus}</p>
              <p className="small muted" style={{ marginBottom: 6 }}>{rec.rationale}</p>
              <p className="small" style={{ color: 'var(--accent)' }}>▶ {rec.activity}</p>
            </div>
          ))}
        </div>
      )}

      {synthesis.sessionDesignSuggestion && (
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
          <div className="label" style={{ marginBottom: 6 }}>Session Design Suggestion</div>
          <p className="small">{synthesis.sessionDesignSuggestion}</p>
        </div>
      )}
    </div>
  );
}

// ── Response Slide-over ───────────────────────────────────────
function ResponseSlideover({ response, token, aiAvailable, onClose, onDelete }) {
  const [aiSummary, setAiSummary] = React.useState(() => {
    try { return response.ai_summary ? JSON.parse(response.ai_summary) : null; } catch { return null; }
  });
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);
  const [aiExpanded, setAiExpanded] = React.useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  const scores = React.useMemo(() => {
    try { return JSON.parse(response.scores || '[]'); } catch { return []; }
  }, [response]);

  const ranking = React.useMemo(() => {
    try { return JSON.parse(response.ranking || '[]'); } catch { return []; }
  }, [response]);

  const activators = React.useMemo(() => {
    try { return JSON.parse(response.activators || '{}'); } catch { return {}; }
  }, [response]);

  const priority = response.priority;
  const priorityEl = priority !== null && priority !== undefined ? PCT_ELEMENTS[priority] : null;
  const topShiftIdx = ranking.length > 0 ? ranking[0] : null;
  const mbd = topShiftIdx !== null && topShiftIdx !== undefined ? (activators[topShiftIdx] || {}) : {};

  async function generateAI() {
    setAiLoading(true);
    setAiError(null);
    const r = await fetch(`/api/responses/${response.id}/analyze`, {
      method: 'POST', headers: authHeader
    });
    const data = await r.json();
    setAiLoading(false);
    if (data.error) { setAiError(data.error); return; }
    setAiSummary(data);
    setAiExpanded(true);
  }

  return (
    <div className="slideover" style={{ zIndex: 300 }}>
      <div className="slideover-header">
        <div>
          <h3>{response.name || 'Unknown'}</h3>
          <p className="small muted">{response.role || '—'} · Step {response.step}/6</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="slideover-body">
        {/* Scores */}
        {scores.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="label" style={{ marginBottom: 10 }}>PCT Pulse Scores</div>
            {PCT_ELEMENTS.map((el, i) => (
              <div key={el.n} className="score-row" style={{ marginBottom: 6 }}>
                <div className="score-label">
                  <strong>PCT {el.n}</strong> {el.title.slice(0, 28)}…
                </div>
                <div className="score-bar">
                  <div className="score-bar-fill" style={{ width: `${((scores[i] || 0) / 7) * 100}%` }} />
                </div>
                <div className="score-num">{scores[i] ?? '–'}/7</div>
              </div>
            ))}
          </div>
        )}

        {/* Priority */}
        {priorityEl && (
          <div style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 6 }}>Priority Element</div>
            <div className={`badge q-${priorityEl.quadrant.toLowerCase()}`} style={{ marginBottom: 6 }}>
              PCT {priorityEl.n} — {priorityEl.title}
            </div>
            {mbd.completeWhen && (
              <p className="small" style={{ marginTop: 8, fontStyle: 'italic' }}>
                Complete when: {mbd.completeWhen}
              </p>
            )}
          </div>
        )}

        {/* Top ranked shifts */}
        {ranking.length > 0 && priorityEl && (
          <div style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 6 }}>Top {Math.min(3, ranking.length)} Ranked Shifts</div>
            {ranking.slice(0, 3).map((shiftIdx, rank) => {
              const shift = priorityEl.shifts[shiftIdx];
              if (!shift) return null;
              return (
                <p key={shiftIdx} className="small" style={{ marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', color: 'var(--ink-4)', marginRight: 6 }}>#{rank + 1}</span>
                  {shift.label}
                </p>
              );
            })}
          </div>
        )}

        {/* AI Summary section */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="label">AI Analysis</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {aiSummary && (
                <button className="btn btn-ghost btn-sm" onClick={generateAI}>↺ Regen</button>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={generateAI}
                disabled={aiLoading || !aiAvailable}
                title={!aiAvailable ? 'API key not configured' : undefined}
              >
                {aiLoading ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Generating…</> : aiSummary ? '✓ Generated' : 'Generate'}
              </button>
            </div>
          </div>

          {response.ai_generated_at && (
            <p className="small muted" style={{ marginBottom: 10 }}>
              Generated: {new Date(response.ai_generated_at).toLocaleString()}
            </p>
          )}

          {aiError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{aiError}</div>}

          {aiSummary && (
            <div>
              <div
                className="collapsible-header"
                onClick={() => setAiExpanded(!aiExpanded)}
              >
                <span className="small" style={{ fontWeight: 500 }}>
                  "{aiSummary.headline?.slice(0, 60)}…"
                </span>
                <span className={`chevron ${aiExpanded ? 'open' : ''}`}>▶</span>
              </div>
              {aiExpanded && (
                <div style={{ marginTop: 12 }}>
                  <AISummaryDisplay summary={aiSummary} onRegenerate={generateAI} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cohort Modal ─────────────────────────────────────────────
function CohortModal({ cohort, token, onClose, onSaved }) {
  const [name, setName] = React.useState(cohort.name || '');
  const [sponsor, setSponsor] = React.useState(cohort.sponsor || '');
  const [target, setTarget] = React.useState(cohort.target || 20);
  const [description, setDescription] = React.useState(cohort.description || '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const isEdit = !!cohort.id;

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    const body = { name, sponsor, target: Number(target), description };
    const url = isEdit ? `/api/cohorts/${cohort.id}` : '/api/cohorts';
    const method = isEdit ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    onSaved(data);
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Cohort' : 'New Cohort'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Cohort Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Sponsor / Organization</label>
              <input className="form-input" value={sponsor} onChange={e => setSponsor(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Target Size</label>
              <input className="form-input" type="number" value={target} onChange={e => setTarget(e.target.value)} min={1} max={500} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Cohort'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

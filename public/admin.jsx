// ── Admin Console ────────────────────────────────────────────────────────────

function safeParse(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function AdminApp() {
  const [token,            setToken]            = React.useState(() => localStorage.getItem('pct_admin_token'));
  const [activeNav,        setActiveNav]        = React.useState('overview');
  const [cohorts,          setCohorts]          = React.useState([]);
  const [stats,            setStats]            = React.useState(null);
  const [selectedCohort,   setSelectedCohort]   = React.useState(null);
  const [responses,        setResponses]        = React.useState([]);
  const [slideoverResp,    setSlideoverResp]    = React.useState(null);
  const [cohortModal,      setCohortModal]      = React.useState(null);
  const [synthResult,      setSynthResult]      = React.useState(null);
  const [synthLoading,     setSynthLoading]     = React.useState(false);
  const [aiAvailable,      setAiAvailable]      = React.useState(null);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  function handleLogout() {
    localStorage.removeItem('pct_admin_token');
    setToken(null);
  }

  async function loadCohorts() {
    const r = await fetch('/api/cohorts', { headers: authHeader });
    const d = await r.json();
    if (Array.isArray(d)) setCohorts(d);
  }

  async function loadStats() {
    if (!token) return;
    const r = await fetch('/api/admin/summary', { headers: authHeader });
    const d = await r.json();
    if (!d.error) setStats(d);
  }

  async function loadResponses(cohortId) {
    const r = await fetch(`/api/cohorts/${cohortId}/responses`, { headers: authHeader });
    const d = await r.json();
    if (Array.isArray(d)) setResponses(d);
  }

  React.useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(d => setAiAvailable(!!d.available));
  }, []);

  React.useEffect(() => {
    if (token) { loadCohorts(); loadStats(); }
  }, [token]);

  React.useEffect(() => {
    if (selectedCohort) loadResponses(selectedCohort.id);
  }, [selectedCohort]);

  if (!token) {
    return <AdminLogin onLogin={t => { localStorage.setItem('pct_admin_token', t); setToken(t); }} />;
  }

  return (
    <div>
      {/* Top nav */}
      <div className="navbar bg-base-100 border-b border-base-300 shadow-sm sticky top-0 z-50 px-4 h-14 min-h-14">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="brand-mark">PCT</div>
          <div>
            <p className="font-bold text-sm leading-none tracking-tight">PCT Catalyst</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#94a3b8' }}>Facilitator Console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aiAvailable !== null && (
            <span className={`badge badge-sm ${aiAvailable ? 'badge-success' : 'badge-warning'}`}>
              AI {aiAvailable ? 'on' : 'off'}
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      {/* Layout */}
      <div className="admin-layout">
        {/* Sidebar */}
        <div className="bg-base-100 border-r border-base-300 p-4">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#94a3b8' }}>
            Navigation
          </p>
          {[
            { id: 'overview',  label: 'Overview',   icon: '📊' },
            { id: 'cohorts',   label: 'Cohorts',    icon: '👥' },
            { id: 'responses', label: 'Responses',  icon: '📝' },
          ].map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="p-6 bg-base-200 min-h-screen">
          {activeNav === 'overview' && (
            <AdminOverview
              stats={stats}
              cohorts={cohorts}
              onRefresh={() => { loadCohorts(); loadStats(); }}
              onGoToCohorts={() => setActiveNav('cohorts')}
            />
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
              onOpenResponse={r => setSlideoverResp(r)}
              onRefresh={() => selectedCohort && loadResponses(selectedCohort.id)}
              onToggleRelease={async () => {
                if (!selectedCohort) return;
                const r = await fetch(`/api/cohorts/${selectedCohort.id}/release`, {
                  method: 'PATCH', headers: authHeader
                });
                const d = await r.json();
                if (!d.error) { setSelectedCohort(d); loadCohorts(); }
              }}
              onSynthesize={async () => {
                if (!selectedCohort) return;
                setSynthLoading(true);
                setSynthResult(null);
                const r = await fetch(`/api/cohorts/${selectedCohort.id}/synthesize`, {
                  method: 'POST', headers: authHeader
                });
                const d = await r.json();
                setSynthLoading(false);
                if (!d.error) setSynthResult(d);
              }}
              synthResult={synthResult}
              synthLoading={synthLoading}
            />
          )}
        </div>
      </div>

      {/* Slideover overlay */}
      {slideoverResp && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSlideoverResp(null)}
          />
          <ResponseSlideover
            response={slideoverResp}
            token={token}
            aiAvailable={aiAvailable}
            onClose={() => setSlideoverResp(null)}
            onDelete={async () => {
              await fetch(`/api/responses/${slideoverResp.id}`, {
                method: 'DELETE', headers: authHeader
              });
              setSlideoverResp(null);
              if (selectedCohort) loadResponses(selectedCohort.id);
            }}
          />
        </>
      )}

      {/* Cohort modal */}
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

// ── Admin Login ───────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email,    setEmail]    = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error,    setError]    = React.useState('');
  const [loading,  setLoading]  = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    setLoading(false);
    if (d.error) { setError(d.error); return; }
    onLogin(d.token);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-lg border border-base-300">
        <div className="card-body gap-5">
          <div className="text-center">
            <div className="brand-mark mx-auto mb-3" style={{ width: 48, height: 48, fontSize: '0.75rem' }}>
              PCT
            </div>
            <h2 className="text-xl font-semibold">Admin Login</h2>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>PCT Catalyst Facilitator Console</p>
          </div>

          {error && (
            <div className="alert alert-error py-2 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required autoFocus
                placeholder="admin@pctcatalyst.com"
              />
            </div>
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text font-medium">Password</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full mt-1" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
            Default: admin@pctcatalyst.com
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function AdminOverview({ stats, cohorts, onRefresh, onGoToCohorts }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Platform Overview</h2>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Real-time snapshot of all cohorts and responses.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh}>↺ Refresh</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { num: stats.totalCohorts,   label: 'Total Cohorts'  },
            { num: stats.openCohorts,    label: 'Open Cohorts'   },
            { num: stats.totalResponses, label: 'Responses'      },
            { num: stats.submitted,      label: 'Submitted'      },
            { num: stats.withAI,         label: 'AI Analyses'    },
          ].map(s => (
            <div key={s.label} className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
              <div className="stat-value text-3xl font-mono-app" style={{ color: '#0f766e' }}>
                {s.num}
              </div>
              <div className="stat-desc text-xs font-medium mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Cohort table */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="flex items-center justify-between px-5 py-3 border-b border-base-300">
          <h3 className="font-semibold">Recent Cohorts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs">
                <th>Cohort</th>
                <th>Sponsor</th>
                <th>Status</th>
                <th>Responses</th>
                <th>Submitted</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map(c => (
                <tr key={c.id} className="hover cursor-pointer" onClick={onGoToCohorts}>
                  <td>
                    <p className="font-semibold text-sm" style={{ color: '#0f766e' }}>{c.name}</p>
                    {c.description && (
                      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                        {c.description.slice(0, 55)}{c.description.length > 55 ? '…' : ''}
                      </p>
                    )}
                  </td>
                  <td className="text-sm">{c.sponsor || '—'}</td>
                  <td>
                    <span className={`badge badge-sm ${c.status === 'open' ? 'badge-success' : 'badge-ghost'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="text-sm font-mono-app">{c.response_count || 0}</td>
                  <td className="text-sm font-mono-app">{c.submitted_count || 0}</td>
                  <td className="text-xs" style={{ color: '#94a3b8' }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!cohorts.length && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm" style={{ color: '#94a3b8' }}>
                    No cohorts yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Cohorts Tab ───────────────────────────────────────────────────────────────
function AdminCohorts({ cohorts, token, onSelect, onRefresh, onNew }) {
  const authHeader = { Authorization: `Bearer ${token}` };

  async function handleDelete(c) {
    if (!confirm(`Delete cohort "${c.name}" and all responses?`)) return;
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Cohorts</h2>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Manage assessment cohorts and their participants.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onNew}>+ New Cohort</button>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs">
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
                <tr key={c.id} className="hover">
                  <td>
                    <button
                      className="font-semibold text-sm text-left hover:underline"
                      style={{ color: '#0f766e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => onSelect(c)}
                    >
                      {c.name}
                    </button>
                    {c.description && (
                      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                        {c.description.slice(0, 50)}{c.description.length > 50 ? '…' : ''}
                      </p>
                    )}
                  </td>
                  <td className="text-sm">{c.sponsor || '—'}</td>
                  <td>
                    <span className={`badge badge-sm ${c.status === 'open' ? 'badge-success' : 'badge-ghost'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="text-sm font-mono-app">{c.target}</td>
                  <td className="text-sm">
                    <span className="font-mono-app">{c.response_count || 0}</span>
                    <span className="text-xs ml-1" style={{ color: '#94a3b8' }}>
                      / {c.submitted_count || 0} submitted
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button className="btn btn-xs btn-ghost" onClick={() => onSelect(c)}>View</button>
                      <button className="btn btn-xs btn-ghost" onClick={() => handleToggle(c)}>
                        {c.status === 'open' ? 'Close' : 'Open'}
                      </button>
                      <button className="btn btn-xs btn-error btn-ghost" onClick={() => handleDelete(c)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!cohorts.length && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm" style={{ color: '#94a3b8' }}>
                    No cohorts yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Responses Tab ─────────────────────────────────────────────────────────────
function AdminResponses({
  cohorts, selectedCohort, responses, token, aiAvailable,
  onSelectCohort, onOpenResponse, onRefresh,
  onToggleRelease, onSynthesize,
  synthResult, synthLoading
}) {
  const [showSynth, setShowSynth] = React.useState(false);

  function handleExport() {
    if (!selectedCohort) return;
    window.open(`/api/admin/export/${selectedCohort.id}?token=${token}`, '_blank');
  }

  const cohort    = selectedCohort;
  const submitted = responses.filter(r => r.submitted_at);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-semibold">Responses</h2>
          {cohort && (
            <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
              {cohort.name} · {submitted.length}/{responses.length} submitted
            </p>
          )}
        </div>

        {cohort && (
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost btn-sm" onClick={onRefresh}>↺</button>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>↧ CSV</button>
            <div className="relative group">
              <button
                className="btn btn-outline btn-sm"
                onClick={onToggleRelease}
              >
                {cohort.cohort_avg_released ? '🔒 Hide Avg' : '📊 Release Avg'}
              </button>
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-base-content text-base-100 text-xs rounded-lg p-3 z-50 hidden group-hover:block shadow-xl">
                {cohort.cohort_avg_released
                  ? 'Cohort average is visible to participants on their radar chart. Click to hide it.'
                  : 'Show the cohort average overlay on each participant\'s radar chart summary.'}
                <div className="absolute -top-1 right-4 w-2 h-2 bg-base-content rotate-45" />
              </div>
            </div>
            {aiAvailable && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setShowSynth(true); onSynthesize(); }}
              >
                ✦ Synthesis
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cohort picker */}
      <div className="form-control mb-5 max-w-xs">
        <label className="label py-0 mb-1">
          <span className="label-text text-xs font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>
            Select Cohort
          </span>
        </label>
        <select
          className="select select-bordered select-sm"
          value={cohort?.id || ''}
          onChange={e => {
            const c = cohorts.find(x => x.id === e.target.value);
            if (c) onSelectCohort(c);
          }}
        >
          <option value="">— Choose cohort —</option>
          {cohorts.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Status pills */}
      {cohort && (
        <div className="flex gap-2 flex-wrap mb-4">
          <span className="badge badge-ghost">{responses.length} total</span>
          <span className="badge badge-success">{submitted.length} submitted</span>
          <span className={`badge ${cohort.status === 'open' ? 'badge-success' : 'badge-ghost'}`}>
            {cohort.status}
          </span>
          {cohort.cohort_avg_released && (
            <span className="badge badge-info">Avg released</span>
          )}
        </div>
      )}

      {/* Synthesis panel */}
      {showSynth && (
        <div className="card bg-base-100 shadow-sm border-2 mb-5" style={{ borderColor: '#0f766e' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-base-300">
            <h3 className="font-semibold flex items-center gap-2">
              <span>✦</span> Cohort Synthesis
            </h3>
            <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setShowSynth(false)}>✕</button>
          </div>
          {synthLoading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <span className="spinner spinner-lg" />
              <p className="text-sm" style={{ color: '#64748b' }}>Generating cohort synthesis…</p>
            </div>
          )}
          {synthResult && !synthLoading && (
            <div className="p-5">
              <CohortSynthesisDisplay synthesis={synthResult} />
            </div>
          )}
        </div>
      )}

      {/* Responses table */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs">
                <th>Name</th>
                <th>Role</th>
                <th>Progress</th>
                <th>Submitted</th>
                <th>AI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {responses.map(r => (
                <tr key={r.id} className="hover">
                  <td>
                    <p className="font-semibold text-sm">{r.name || '—'}</p>
                  </td>
                  <td className="text-sm" style={{ color: '#64748b' }}>{r.role || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <progress
                        className="progress progress-primary w-16 h-1.5"
                        value={r.step}
                        max={6}
                      />
                      <span className="text-xs font-mono-app" style={{ color: '#94a3b8' }}>
                        {r.step}/6
                      </span>
                    </div>
                  </td>
                  <td>
                    {r.submitted_at
                      ? <span className="badge badge-success badge-sm">
                          ✓ {new Date(r.submitted_at).toLocaleDateString()}
                        </span>
                      : <span className="badge badge-ghost badge-sm">In progress</span>
                    }
                  </td>
                  <td>
                    {r.ai_summary
                      ? <span className="badge badge-success badge-sm">✓</span>
                      : <span className="badge badge-ghost badge-sm">—</span>
                    }
                  </td>
                  <td>
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => onOpenResponse(r)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!responses.length && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#94a3b8' }}>
                    {cohort ? 'No responses for this cohort yet.' : 'Select a cohort above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Cohort Synthesis Display ──────────────────────────────────────────────────
function CohortSynthesisDisplay({ synthesis }) {
  return (
    <div className="flex flex-col gap-4">
      {synthesis.cohortHeadline && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>
            Cohort Theme
          </p>
          <p className="font-display text-xl font-light" style={{ color: '#0f172a' }}>
            "{synthesis.cohortHeadline}"
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {synthesis.collectiveStrengths && (
          <div className="rounded-lg p-3 border-l-2"
               style={{ background: 'oklch(95% 0.04 172.9)', borderColor: '#0f766e' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>
              Collective Strengths
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>
              {synthesis.collectiveStrengths}
            </p>
          </div>
        )}
        {synthesis.collectiveDevelopment && (
          <div className="rounded-lg p-3 border-l-2"
               style={{ background: '#fff8f0', borderColor: '#ea580c' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>
              Development Areas
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>
              {synthesis.collectiveDevelopment}
            </p>
          </div>
        )}
      </div>

      {synthesis.facilitatorRecommendations && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>
            Facilitator Recommendations
          </p>
          {synthesis.facilitatorRecommendations.map((rec, i) => (
            <div key={i} className="card bg-base-100 border border-base-300 mb-2">
              <div className="card-body py-3 gap-1">
                <p className="font-semibold text-sm">{rec.focus}</p>
                <p className="text-xs" style={{ color: '#64748b' }}>{rec.rationale}</p>
                <p className="text-xs mt-1" style={{ color: '#0f766e' }}>▶ {rec.activity}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Response Slideover ────────────────────────────────────────────────────────
function ResponseSlideover({ response, token, aiAvailable, onClose, onDelete }) {
  const [aiSummary,  setAiSummary]  = React.useState(() => safeParse(response.ai_summary, null));
  const [aiLoading,  setAiLoading]  = React.useState(false);
  const [aiError,    setAiError]    = React.useState(null);
  const [aiExpanded, setAiExpanded] = React.useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  const scores     = React.useMemo(() => safeParse(response.scores,     []),  [response]);
  const ranking    = React.useMemo(() => safeParse(response.ranking,    []),  [response]);
  const activators = React.useMemo(() => safeParse(response.activators, {}),  [response]);

  const priority   = response.priority;
  const priorityEl = (priority !== null && priority !== undefined) ? PCT_ELEMENTS[priority] : null;
  const topShiftIdx = ranking.length > 0 ? ranking[0] : null;
  const mbd = (topShiftIdx !== null && topShiftIdx !== undefined)
    ? (activators[String(topShiftIdx)] || {})
    : {};

  async function generateAI() {
    setAiLoading(true); setAiError(null);
    const r = await fetch(`/api/responses/${response.id}/analyze`, {
      method: 'POST', headers: authHeader
    });
    const d = await r.json();
    setAiLoading(false);
    if (d.error) { setAiError(d.error); return; }
    setAiSummary(d);
    setAiExpanded(true);
  }

  return (
    <div className="slideover z-50">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-base-300 sticky top-0 bg-base-100 z-10">
        <div>
          <h3 className="font-semibold text-base">{response.name || 'Unknown Participant'}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            {response.role || '—'} · Step {response.step}/6
            {response.submitted_at && ` · Submitted ${new Date(response.submitted_at).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn btn-error btn-xs btn-ghost" onClick={onDelete}>Delete</button>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-5">

        {/* Scores */}
        {scores.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#64748b' }}>
              PCT Pulse Scores
            </p>
            <div className="flex flex-col gap-2">
              {PCT_ELEMENTS.map((el, i) => (
                <div key={el.n} className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono-app w-10 shrink-0"
                        style={{ color: '#0f766e' }}>
                    PCT {el.n}
                  </span>
                  <div className="score-bar">
                    <div className="score-bar-fill" style={{ width: `${((scores[i] || 0) / 7) * 100}%` }} />
                  </div>
                  <span className="font-mono-app font-bold text-xs w-8 text-right shrink-0"
                        style={{ color: '#0f766e' }}>
                    {scores[i] ?? '–'}/7
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority */}
        {priorityEl && (
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body py-3 gap-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>
                Priority Element
              </p>
              <span className={`badge badge-sm badge-${priorityEl.quadrant.toLowerCase()} w-fit`}>
                PCT {priorityEl.n} — {priorityEl.title}
              </span>
              {mbd.completeWhen && (
                <p className="text-xs italic mt-1" style={{ color: '#64748b' }}>
                  "{mbd.completeWhen}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Top shifts — with null guard */}
        {ranking.length > 0 && priorityEl && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>
              Top Ranked Shifts
            </p>
            {ranking.slice(0, 3).map((shiftIdx, rank) => {
              const shift = priorityEl.shifts && priorityEl.shifts[shiftIdx];
              if (!shift) return null;
              return (
                <div key={shiftIdx} className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-xs font-mono-app w-4 shrink-0" style={{ color: '#94a3b8' }}>
                    #{rank + 1}
                  </span>
                  <p className="text-sm" style={{ color: '#334155' }}>{shift.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Analysis */}
        <div className="border-t border-base-300 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>
              AI Analysis
            </p>
            <div className="flex gap-2">
              {aiSummary && (
                <button className="btn btn-ghost btn-xs" onClick={generateAI}>↺ Regen</button>
              )}
              <button
                className="btn btn-primary btn-xs"
                onClick={generateAI}
                disabled={aiLoading || !aiAvailable}
                title={!aiAvailable ? 'API key not configured' : undefined}
              >
                {aiLoading
                  ? <><span className="spinner" style={{ width: 10, height: 10 }} /> Generating…</>
                  : aiSummary ? '✓ Generated' : 'Generate'
                }
              </button>
            </div>
          </div>

          {response.ai_generated_at && (
            <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>
              Generated: {new Date(response.ai_generated_at).toLocaleString()}
            </p>
          )}

          {aiError && (
            <div className="alert alert-error py-2 text-xs mb-2">{aiError}</div>
          )}

          {aiSummary && (
            <div>
              <div
                className="flex items-center justify-between cursor-pointer py-2"
                onClick={() => setAiExpanded(!aiExpanded)}
              >
                <span className="text-sm font-medium" style={{ color: '#334155' }}>
                  "{(aiSummary.headline || '').slice(0, 55)}…"
                </span>
                <span className="text-xs" style={{
                  color: '#94a3b8',
                  transform: aiExpanded ? 'rotate(90deg)' : 'none',
                  display: 'inline-block',
                  transition: 'transform 140ms'
                }}>▶</span>
              </div>
              {aiExpanded && (
                <div className="mt-3">
                  <AISummaryDisplay summary={aiSummary} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cohort Modal ──────────────────────────────────────────────────────────────
function CohortModal({ cohort, token, onClose, onSaved }) {
  const [name,        setName]        = React.useState(cohort.name || '');
  const [sponsor,     setSponsor]     = React.useState(cohort.sponsor || '');
  const [target,      setTarget]      = React.useState(cohort.target || 20);
  const [description, setDescription] = React.useState(cohort.description || '');
  const [loading,     setLoading]     = React.useState(false);
  const [error,       setError]       = React.useState('');

  const isEdit = !!cohort.id;

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    const url    = isEdit ? `/api/cohorts/${cohort.id}` : '/api/cohorts';
    const method = isEdit ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, sponsor, target: Number(target), description })
    });
    const d = await r.json();
    setLoading(false);
    if (d.error) { setError(d.error); return; }
    onSaved(d);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card bg-base-100 w-full max-w-md shadow-2xl border border-base-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <h3 className="font-semibold">{isEdit ? 'Edit Cohort' : 'New Cohort'}</h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="p-5 flex flex-col gap-4">
            {error && <div className="alert alert-error py-2 text-sm">{error}</div>}

            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text font-medium">Cohort Name *</span>
              </label>
              <input
                className="input input-bordered w-full"
                value={name}
                onChange={e => setName(e.target.value)}
                required autoFocus
              />
            </div>

            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text font-medium">Sponsor / Organisation</span>
              </label>
              <input
                className="input input-bordered w-full"
                value={sponsor}
                onChange={e => setSponsor(e.target.value)}
                placeholder="Duke Executive Education"
              />
            </div>

            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text font-medium">Target Size</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="number"
                value={target}
                onChange={e => setTarget(e.target.value)}
                min={1} max={500}
              />
            </div>

            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text font-medium">Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered resize-none"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of this cohort"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end px-5 py-4 border-t border-base-300 bg-base-200 rounded-b-2xl">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Create Cohort'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
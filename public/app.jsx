// ── Root App Component + Router ──────────────────────────────

function App() {
  const [route, setRoute] = React.useState(() => parseRoute());
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [compact, setCompact] = React.useState(() => localStorage.getItem('pct_compact') === '1');

  React.useEffect(() => {
    document.documentElement.setAttribute('data-density', compact ? 'compact' : '');
    localStorage.setItem('pct_compact', compact ? '1' : '0');
  }, [compact]);

  React.useEffect(() => {
    function onPop() { setRoute(parseRoute()); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(path) {
    window.history.pushState({}, '', path);
    setRoute(parseRoute(path));
  }

  function parseRoute(path) {
    const href = path || window.location.pathname + window.location.search;
    const url = new URL(href, window.location.origin);
    const pathname = url.pathname;
    const params = Object.fromEntries(url.searchParams);

    if (pathname === '/' || pathname === '') return { page: 'home', params };
    if (pathname === '/admin') return { page: 'admin', params };
    if (pathname.startsWith('/participate/')) {
      const cohortId = pathname.replace('/participate/', '');
      return { page: 'participate', params: { cohortId } };
    }
    if (pathname === '/participate') return { page: 'participate', params: { cohortId: '' } };
    return { page: 'home', params };
  }

  const { page, params } = route;

  return (
    <>
      <nav className="topnav">
        <button
          className="topnav-brand"
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div className="brand-mark">PCT</div>
          <div>
            <div className="brand-name">PCT Catalyst</div>
            <div className="brand-sub">Leadership Assessment</div>
          </div>
        </button>
        <div className="topnav-spacer" />
        {page === 'participate' && (
          <div className="role-badge">
            <span className="role-pill">PARTICIPANT</span>
          </div>
        )}
        {page === 'admin' && (
          <div className="role-badge">
            <span className="role-pill">FACILITATOR</span>
          </div>
        )}
      </nav>

      <main>
        {page === 'home'        && <HomePage navigate={navigate} />}
        {page === 'admin'       && <AdminApp />}
        {page === 'participate' && <ParticipantApp cohortId={params.cohortId || ''} />}
      </main>

      <button
        className="tweaks-btn no-print"
        onClick={() => setTweaksOpen(!tweaksOpen)}
        title="Display settings"
      >
        ⚙
      </button>

      {tweaksOpen && (
        <div className="tweaks-panel no-print">
          <h4>Display Settings</h4>
          <div className="tweak-row">
            <span>Compact</span>
            <label className="toggle">
              <input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)} />
              <div className="toggle-track" />
            </label>
          </div>
        </div>
      )}
    </>
  );
}

// ── Home Page ─────────────────────────────────────────────────
function HomePage({ navigate }) {
  const [mode, setMode] = React.useState(null); // null | 'participant' | 'facilitator'
  const [cohorts, setCohorts] = React.useState([]);
  const [cohortCode, setCohortCode] = React.useState('');
  const [lookupError, setLookupError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/cohorts')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCohorts(data.filter(c => c.status === 'open')); });
  }, []);

  async function handleJoin(e) {
    e.preventDefault();
    const id = cohortCode.trim();
    if (!id) return;
    setLoading(true);
    setLookupError('');
    const r = await fetch(`/api/cohorts/${id}`);
    const data = await r.json();
    setLoading(false);
    if (data.error || !data.id) { setLookupError('Cohort not found. Check the ID with your facilitator.'); return; }
    if (data.status !== 'open') { setLookupError('This cohort is currently closed.'); return; }
    navigate(`/participate/${data.id}`);
  }

  return (
    <div className="page-center" style={{ paddingTop: 40 }}>
      <div className="welcome-hero" style={{ paddingTop: 24 }}>
        <h1>PCT Catalyst</h1>
        <p>
          A leadership transformation assessment built on the
          People-Centered Transformation methodology by Tony O'Driscoll, Duke University.
        </p>
      </div>

      {/* Two primary CTAs */}
      {!mode && (
        <div style={{ maxWidth: 520, margin: '32px auto 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '20px 24px', fontSize: '1.125rem', justifyContent: 'center' }}
            onClick={() => setMode('participant')}
          >
            I am a Participant →
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', padding: '20px 24px', fontSize: '1.125rem', justifyContent: 'center' }}
            onClick={() => setMode('facilitator')}
          >
            I am a Facilitator →
          </button>
        </div>
      )}

      {/* Participant panel */}
      {mode === 'participant' && (
        <div style={{ maxWidth: 520, margin: '32px auto 0' }}>
          <div className="card card-lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>← Back</button>
              <h3>Join as Participant</h3>
            </div>

            {cohorts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="label" style={{ marginBottom: 8 }}>Open Cohorts</div>
                {cohorts.slice(0, 4).map(c => (
                  <button
                    key={c.id}
                    className="btn btn-secondary w-full"
                    style={{ marginBottom: 6, justifyContent: 'flex-start' }}
                    onClick={() => navigate(`/participate/${c.id}`)}
                  >
                    {c.name}
                    {c.sponsor && <span className="muted small"> · {c.sponsor}</span>}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="label" style={{ marginBottom: 4 }}>Or enter Cohort ID</div>
              <input
                className="form-input"
                value={cohortCode}
                onChange={e => setCohortCode(e.target.value)}
                placeholder="Paste cohort ID…"
                autoFocus
              />
              {lookupError && <p className="form-error">{lookupError}</p>}
              <button type="submit" className="btn btn-primary" disabled={loading || !cohortCode.trim()}>
                {loading ? 'Looking up…' : 'Join Cohort →'}
              </button>
            </form>

            <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <button
                className="btn btn-secondary w-full"
                onClick={() => navigate('/participate')}
              >
                Start Without a Cohort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facilitator panel */}
      {mode === 'facilitator' && (
        <div style={{ maxWidth: 520, margin: '32px auto 0' }}>
          <div className="card card-lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>← Back</button>
              <h3>Facilitator Console</h3>
            </div>
            <p className="muted small" style={{ marginBottom: 20, lineHeight: 1.7 }}>
              Manage cohorts, view participant responses, generate AI analyses, and export data.
            </p>
            <button
              className="btn btn-primary w-full"
              style={{ padding: '14px 24px', fontSize: '1rem' }}
              onClick={() => navigate('/admin')}
            >
              Open Admin Console →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bootstrap ─────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));

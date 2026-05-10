// ── Root App Component + Router ──────────────────────────────

function App() {
  const [route, setRoute] = React.useState(() => parseRoute());
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(() => localStorage.getItem('pct_dark') === '1');
  const [compact, setCompact] = React.useState(() => localStorage.getItem('pct_compact') === '1');

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '');
    localStorage.setItem('pct_dark', darkMode ? '1' : '0');
  }, [darkMode]);

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
        {page === 'home' && <HomePage navigate={navigate} />}
        {page === 'admin' && <AdminApp />}
        {page === 'participate' && <ParticipantApp cohortId={params.cohortId} />}
      </main>

      {/* Tweaks button */}
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
            <span>Dark Mode</span>
            <label className="toggle">
              <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
              <div className="toggle-track" />
            </label>
          </div>
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
    <div className="page-center" style={{ paddingTop: 60 }}>
      <div className="welcome-hero">
        <h1>PCT Catalyst</h1>
        <p>
          A leadership transformation assessment tool built on the
          People-Centered Transformation methodology by Tony O'Driscoll, Duke University.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 700, margin: '0 auto' }}>
        {/* Participant panel */}
        <div className="card card-lg">
          <h3 style={{ marginBottom: 16 }}>Join as Participant</h3>

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
            />
            {lookupError && <p className="form-error">{lookupError}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading || !cohortCode.trim()}>
              {loading ? 'Looking up…' : 'Join Cohort →'}
            </button>
          </form>
        </div>

        {/* Admin panel */}
        <div className="card card-lg">
          <h3 style={{ marginBottom: 16 }}>Facilitator Console</h3>
          <p className="muted small" style={{ marginBottom: 16, lineHeight: 1.6 }}>
            Manage cohorts, view participant responses, generate AI analyses,
            and export data.
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={() => navigate('/admin')}
          >
            Open Admin Console →
          </button>
          <div style={{ marginTop: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
            <p className="small muted">Default login: admin@pctcatalyst.com</p>
          </div>
        </div>
      </div>

      {/* PCT Framework visual + element overview */}
      <div style={{ marginTop: 48, maxWidth: 700, margin: '48px auto 0' }}>
        <h3 style={{ textAlign: 'center', marginBottom: 20 }}>The PCT Framework</h3>
        <PCTFrameworkPanel />
      </div>
    </div>
  );
}

// ── Bootstrap ─────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));

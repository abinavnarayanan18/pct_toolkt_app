// ── PCT Catalyst App — Root ──────────────────────────────────────────────────

function parseRoute(path) {
  if (path.startsWith('/admin')) return { page: 'admin' };
  if (path.startsWith('/participate/')) {
    const cohortId = path.replace('/participate/', '').split('?')[0].split('#')[0];
    if (cohortId) return { page: 'participate', params: { cohortId } };
  }
  return { page: 'home' };
}

function App() {
  const [route, setRoute] = React.useState(() => parseRoute(window.location.pathname));

  function navigate(path) {
    window.history.pushState({}, '', path);
    setRoute(parseRoute(path));
  }

  React.useEffect(() => {
    function onPop() { setRoute(parseRoute(window.location.pathname)); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (route.page === 'admin') {
    return <AdminApp />;
  }

  if (route.page === 'participate') {
    return (
      <div>
        <TopNav onHome={() => navigate('/')} />
        <ParticipantApp cohortId={route.params.cohortId} />
      </div>
    );
  }

  return (
    <div>
      <TopNav onHome={() => navigate('/')} />
      <HomePage onNavigate={navigate} />
    </div>
  );
}

// ── Top Navigation ────────────────────────────────────────────────────────────
function TopNav({ onHome }) {
  return (
    <div className="navbar bg-base-100 border-b border-base-300 shadow-sm sticky top-0 z-50 px-4 h-14 min-h-14">
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={onHome}>
        <div className="brand-mark">PCT</div>
        <div>
          <p className="font-bold text-sm leading-none tracking-tight">PCT Catalyst</p>
          <p className="text-xs leading-none mt-0.5" style={{ color: '#94a3b8' }}>
            Leadership Transformation
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ onNavigate }) {
  const [cohorts,   setCohorts]   = React.useState([]);
  const [cohortId,  setCohortId]  = React.useState('');
  const [loading,   setLoading]   = React.useState(true);
  const [error,     setError]     = React.useState('');

  React.useEffect(() => {
    fetch('/api/cohorts')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setCohorts(d.filter(c => c.status === 'open'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleJoin() {
    const id = cohortId.trim();
    if (!id) { setError('Please enter or select a cohort ID.'); return; }
    onNavigate(`/participate/${id}`);
  }

  const openCohorts = cohorts.filter(c => c.status === 'open');

  return (
    <div className="min-h-screen bg-base-200">
      {/* Hero */}
      <div className="text-center py-14 px-4">
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#0f766e' }}>
          Duke University · Tony O'Driscoll
        </p>
        <h1 className="text-4xl font-display font-light mb-3" style={{ color: '#0f172a' }}>
          People-Centered Transformation
        </h1>
        <p className="text-base max-w-lg mx-auto" style={{ color: '#64748b' }}>
          Reflect on your leadership across 10 transformation elements and receive
          a personalised AI-powered development plan.
        </p>
      </div>

      {/* Main cards */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

          {/* Join card */}
          <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body gap-4">
              <h2 className="card-title text-lg">Join as Participant</h2>

              {/* Open cohorts */}
              {!loading && openCohorts.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2"
                     style={{ color: '#94a3b8' }}>
                    Open Cohorts
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {openCohorts.map(c => (
                      <button
                        key={c.id}
                        className="btn btn-outline btn-sm justify-start gap-3 h-auto py-2.5 px-3"
                        onClick={() => onNavigate(`/participate/${c.id}`)}
                      >
                        <span className="font-semibold">{c.name}</span>
                        {c.sponsor && (
                          <span className="text-xs font-normal opacity-60">· {c.sponsor}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual ID entry */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2"
                   style={{ color: '#94a3b8' }}>
                  {openCohorts.length > 0 ? 'Or Enter Cohort ID' : 'Enter Cohort ID'}
                </p>
                <div className="flex flex-col gap-2">
                  <input
                    className="input input-bordered w-full"
                    value={cohortId}
                    onChange={e => { setCohortId(e.target.value); setError(''); }}
                    placeholder="Paste cohort ID…"
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                  {error && (
                    <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
                  )}
                  <button
                    className="btn btn-primary w-full"
                    onClick={handleJoin}
                    disabled={!cohortId.trim()}
                  >
                    Join Cohort →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Facilitator card */}
          <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body gap-4">
              <h2 className="card-title text-lg">Facilitator Console</h2>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Manage cohorts, view participant responses, generate AI analyses,
                and export data.
              </p>

              <div className="flex flex-col gap-3 mt-auto">
                <button
                  className="btn btn-primary w-full"
                  onClick={() => onNavigate('/admin')}
                >
                  Open Admin Console →
                </button>
                <div className="rounded-lg px-3 py-2" style={{ background: 'oklch(94% 0.007 248)' }}>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>
                    Default login: <span className="font-mono-app" style={{ color: '#334155' }}>admin@pctcatalyst.com</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PCT Framework overview */}
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body gap-2">
            <h3 className="font-semibold text-base">The PCT Framework</h3>
            <p className="text-sm" style={{ color: '#64748b' }}>
              10 elements across 4 quadrants of leadership transformation.
            </p>
            <PCTFrameworkPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');
const appRoot = ReactDOM.createRoot(rootEl);
appRoot.render(<App />);
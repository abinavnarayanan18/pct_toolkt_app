// ── Participant Flow: Identity + 5 Steps ─────────────────────

function ParticipantApp({ cohortId: urlCohortId }) {
  const [cohort, setCohort] = React.useState(null);
  const [effectiveCohortId, setEffectiveCohortId] = React.useState(urlCohortId || null);
  const [responseId, setResponseId] = React.useState(() => {
    if (urlCohortId) return localStorage.getItem(`pct_resp_${urlCohortId}`);
    const storedRid = localStorage.getItem('pct_solo_resp');
    return storedRid || null;
  });
  const [hasPreviousSession] = React.useState(() => {
    if (urlCohortId) return !!localStorage.getItem(`pct_resp_${urlCohortId}`);
    return !!localStorage.getItem('pct_solo_resp');
  });
  const [resumeMode, setResumeMode] = React.useState(null); // null | 'continue' | 'fresh'
  const [response, setResponse] = React.useState(null);
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(!!urlCohortId);
  const [error, setError] = React.useState(null);

  // Load cohort when effectiveCohortId is known
  React.useEffect(() => {
    if (!effectiveCohortId) return;
    fetch(`/api/cohorts/${effectiveCohortId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setCohort(data);
        setLoading(false);
      })
      .catch(() => { setError('Could not load cohort'); setLoading(false); });
  }, [effectiveCohortId]);

  // Resume an existing response from localStorage (only when user confirms)
  React.useEffect(() => {
    if (!responseId || resumeMode !== 'continue') return;
    fetch(`/api/responses/${responseId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          if (urlCohortId) localStorage.removeItem(`pct_resp_${urlCohortId}`);
          else { localStorage.removeItem('pct_solo_resp'); localStorage.removeItem('pct_solo_cohort'); }
          setResponseId(null);
          return;
        }
        setResponse(data);
        // Resume from furthest reached step (min 1 since identity is already done)
        setStep(Math.max(1, data.step || 1));
        if (!effectiveCohortId && data.cohort_id) setEffectiveCohortId(data.cohort_id);
      });
  }, [responseId, resumeMode]);

  function startFresh() {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('pct_')) localStorage.removeItem(k);
    });
    setResponseId(null);
    setResponse(null);
    setCohort(null);
    setEffectiveCohortId(urlCohortId || null);
    setStep(0);
    setResumeMode('fresh');
  }

  async function startSession(identity) {
    const { anonymous, participantName, role, cohortId } = identity;
    const targetCohortId = cohortId.trim() || urlCohortId || '';

    let data;
    if (targetCohortId) {
      const r = await fetch(`/api/cohorts/${targetCohortId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: anonymous ? null : participantName, role, anonymous, participantName })
      });
      data = await r.json();
      if (data.error) { setError(data.error); return; }
      localStorage.setItem(`pct_resp_${targetCohortId}`, data.id);
      setEffectiveCohortId(targetCohortId);
    } else {
      const r = await fetch('/api/responses/solo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName, anonymous, role })
      });
      data = await r.json();
      if (data.error) { setError(data.error); return; }
      localStorage.setItem('pct_solo_resp', data.id);
      localStorage.setItem('pct_solo_cohort', data.cohortId);
      setEffectiveCohortId(data.cohortId);
    }

    setResponseId(data.id);
    setResponse(data);
    await autosave(data.id, { step: 1 });
    setStep(1);
  }

  async function autosave(id, fields) {
    const rid = id || responseId;
    if (!rid) return;
    const r = await fetch(`/api/responses/${rid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    const data = await r.json();
    if (!data.error) setResponse(data);
    return data;
  }

  async function goToStep(newStep, extraFields) {
    await autosave(responseId, { step: newStep, ...extraFields });
    setStep(newStep);
  }

  if (loading) return (
    <div className="loading-block">
      <div className="spinner spinner-lg" />
      <span>Loading…</span>
    </div>
  );

  if (error) return (
    <div className="page-center" style={{ paddingTop: 60 }}>
      <div className="alert alert-error">{error}</div>
    </div>
  );

  if (cohort && cohort.status === 'closed' && step < 5) return (
    <div className="page-center" style={{ paddingTop: 60 }}>
      <div className="alert alert-warning">This cohort is currently closed. Please contact your facilitator.</div>
    </div>
  );

  const STEPS = [
    { label: 'Identity',   n: 0 },
    { label: 'PCT Pulse',  n: 1 },
    { label: 'Priority',   n: 2 },
    { label: 'Rank Shifts',n: 3 },
    { label: 'Activators', n: 4 },
    { label: 'Summary',    n: 5 }
  ];

  return (
    <div className="app-shell">
      <FloatingScrollTop />
      {step > 0 && step < 5 && (
        <div className="page-center" style={{ paddingBottom: 0 }}>
          <div className="stepper">
            {STEPS.slice(1).map((s, i) => (
              <React.Fragment key={s.n}>
                {i > 0 && <div className={`step-connector ${step > s.n ? 'done' : ''}`} />}
                <div className={`step-item ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                  <div className="step-dot">{step > s.n ? '✓' : s.n}</div>
                  <span className="step-label">{s.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {step === 0 && (
        <Step0Identity
          urlCohortId={urlCohortId}
          onComplete={startSession}
          hasPreviousSession={hasPreviousSession && resumeMode === null}
          onContinue={() => setResumeMode('continue')}
          onStartFresh={startFresh}
        />
      )}
      {step === 1 && (
        <Step1Pulse
          response={response}
          onBack={() => setStep(0)}
          onNext={(scores) => goToStep(2, { scores: JSON.stringify(scores) })}
          autosave={(scores) => autosave(responseId, { scores: JSON.stringify(scores) })}
        />
      )}
      {step === 2 && (
        <Step2Priority
          response={response}
          onBack={() => goToStep(1)}
          onNext={(priority) => goToStep(3, { priority })}
        />
      )}
      {step === 3 && (
        <Step3Ranking
          response={response}
          onBack={() => goToStep(2)}
          onNext={(ranking) => goToStep(4, { ranking: JSON.stringify(ranking) })}
        />
      )}
      {step === 4 && (
        <Step4Activators
          response={response}
          onBack={() => goToStep(3)}
          onNext={(activators) => goToStep(5, { activators: JSON.stringify(activators) })}
          autosave={(activators) => autosave(responseId, { activators: JSON.stringify(activators) })}
        />
      )}
      {step === 5 && (
        <Step5Summary
          response={response}
          cohort={cohort}
          cohortId={effectiveCohortId}
          responseId={responseId}
        />
      )}
    </div>
  );
}

// ── Floating scroll-to-top ───────────────────────────────────
function FloatingScrollTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 300); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      className="scroll-top-btn"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
    >
      ↑
    </button>
  );
}

// ── Step 0: Identity ─────────────────────────────────────────
function Step0Identity({ urlCohortId, onComplete, hasPreviousSession, onContinue, onStartFresh }) {
  const [anonymous, setAnonymous] = React.useState(false);
  const [participantName, setParticipantName] = React.useState('');
  const [role, setRole] = React.useState('leadership');
  const [cohortId, setCohortId] = React.useState(urlCohortId || '');
  const [loading, setLoading] = React.useState(false);

  const hasName = participantName.trim().length > 0;
  const hasCohortId = cohortId.trim().length > 0;
  const canContinue = anonymous || hasName;

  let cohortHint = '';
  if (hasCohortId) cohortHint = "You're joining an existing cohort";
  else if (!anonymous && hasName) cohortHint = `A session will be created in your name`;
  else cohortHint = "You'll be part of an anonymous session";

  async function handleStart() {
    if (!canContinue || loading) return;
    setLoading(true);
    await onComplete({ anonymous, participantName: anonymous ? '' : participantName.trim(), role, cohortId: cohortId.trim() });
    setLoading(false);
  }

  return (
    <div className="page-center" style={{ paddingTop: 60, maxWidth: 560 }}>
      <div className="card card-lg">
        {hasPreviousSession && (
          <div style={{ background: 'var(--warning-bg,#fffbeb)', border: '1px solid var(--warning-border,#f59e0b)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 24 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.95rem' }}>You have a previous session.</p>
            <p className="small muted" style={{ margin: '0 0 14px' }}>Continue where you left off, or start fresh.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={onContinue}>Continue</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onStartFresh}>Start Fresh</button>
            </div>
          </div>
        )}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="brand-mark" style={{ width: 56, height: 56, fontSize: '1.25rem', margin: '0 auto 16px' }}>PCT</div>
          <h1 className="display" style={{ fontSize: '2rem', marginBottom: 8 }}>PCT Catalyst</h1>
          <p className="muted">Leadership Transformation Assessment</p>
        </div>

        {/* Anonymous / Name toggle */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">How would you like to participate?</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              className={`btn ${!anonymous ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setAnonymous(false)}
            >
              Provide My Name
            </button>
            <button
              type="button"
              className={`btn ${anonymous ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setAnonymous(true)}
            >
              Fill Anonymously
            </button>
          </div>
          {!anonymous && (
            <input
              className="form-input"
              style={{ marginTop: 10 }}
              value={participantName}
              onChange={e => setParticipantName(e.target.value)}
              placeholder="Your full name"
              autoFocus
            />
          )}
        </div>

        {/* Role selector */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">What is your role in this organization?</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              className={`btn ${role === 'leadership' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setRole('leadership')}
            >
              I am in Leadership
            </button>
            <button
              type="button"
              className={`btn ${role === 'org' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setRole('org')}
            >
              I am in the Organization
            </button>
          </div>
        </div>

        {/* Cohort ID */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Cohort ID{!urlCohortId ? ' (optional)' : ''}</label>
          <input
            className="form-input"
            value={cohortId}
            onChange={e => setCohortId(e.target.value)}
            placeholder={urlCohortId ? '' : 'Leave blank for a personal session'}
            readOnly={!!urlCohortId}
          />
          <p className="form-hint" style={{ marginTop: 6 }}>{cohortHint}</p>
        </div>

        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 20 }}>
          <p className="small muted" style={{ lineHeight: 1.6 }}>
            This assessment takes approximately 15–20 minutes. You'll rate leadership behaviors,
            select a priority area, rank transformation shifts, and define action commitments.
            Your responses are saved automatically.
          </p>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={loading || !canContinue}
          onClick={handleStart}
        >
          {loading
            ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Starting…</>
            : 'Begin Assessment →'}
        </button>
      </div>
    </div>
  );
}

// ── Step 1: PCT Pulse (10 likert) ────────────────────────────
function Step1Pulse({ response, onBack, onNext, autosave }) {
  const [scores, setScores] = React.useState(() => {
    try { return JSON.parse(response?.scores || '[]'); } catch { return []; }
  });

  const filled = Array(10).fill(null);
  for (let i = 0; i < 10; i++) filled[i] = scores[i] !== undefined ? scores[i] : null;

  const answeredCount = filled.filter(s => s !== null).length;

  function setScore(i, val) {
    const next = [...filled];
    next[i] = val;
    setScores(next);
    autosave(next);
  }

  const allAnswered = answeredCount === 10;

  return (
    <div className="page-center" style={{ paddingTop: 32, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 }}>
        <div>
          <h2>PCT Pulse Check</h2>
          <p className="muted">Rate how strongly you agree with each statement about your organization's leaders.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div className="badge badge-gray">{answeredCount}/10 answered</div>
        </div>
      </div>

      <PDFVisual concept="pulse-intro" style={{ marginBottom: 16 }} />

      {PCT_ELEMENTS.map((el, i) => (
        <PulseCard key={el.n} element={el} index={i} value={filled[i]} onChange={val => setScore(i, val)} />
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={() => onNext(filled)} disabled={!allAnswered}>
          {allAnswered ? 'Continue to Priority →' : `Answer all 10 (${10 - answeredCount} remaining)`}
        </button>
      </div>
    </div>
  );
}

function PulseCard({ element, index, value, onChange }) {
  const quadrantClass = `q-${element.quadrant.toLowerCase()}`;
  return (
    <div className={`pulse-card ${value !== null ? 'answered' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="pulse-element-num">PCT {element.n}</div>
          <div className="pulse-element-title">{element.title}</div>
        </div>
        <span className={`badge ${quadrantClass}`}>{element.quadrant}</span>
      </div>
      <p className="pulse-statement">"{element.pulse}"</p>
      <div className="likert-scale">
        {[1,2,3,4,5,6,7].map(v => (
          <button key={v} className={`likert-btn ${value === v ? 'selected' : ''}`} onClick={() => onChange(v)}>{v}</button>
        ))}
      </div>
      <div className="likert-footer">
        <span>Strongly Disagree</span>
        <span>Strongly Agree</span>
      </div>
    </div>
  );
}

// ── Heart/Head/Hands Card ────────────────────────────────────
function HeartHeadHandsCard({ element }) {
  const photoSrc = `/images/pct${element.n}.png`;
  return (
    <div style={{ border: '2px solid #C1361D', borderRadius: 8, padding: 24, marginTop: 20 }}>
      {/* Oval badge */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{
          display: 'inline-block',
          background: '#e0e0e0',
          border: '2px solid #C1361D',
          borderRadius: 50,
          padding: '8px 20px',
          fontFamily: 'Chalkduster, cursive',
          fontSize: '0.875rem',
          lineHeight: 1.4
        }}>
          {element.title}
        </span>
      </div>

      {/* Row 1: Heart/Words */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 36 }}>♡</span>
          <span style={{ fontFamily: 'Chalkduster, cursive', fontSize: '0.75rem', textAlign: 'center', lineHeight: 1.3 }}>
            <span style={{ color: '#C1361D' }}>Heart</span><span style={{ color: '#1A1A1A' }}>/Words</span>
          </span>
        </div>
        <div>
          <img
            src={photoSrc}
            alt={element.heart_attribution || `PCT ${element.n}`}
            style={{ width: '100%', maxHeight: 140, objectFit: 'cover', filter: 'grayscale(100%)', marginBottom: 8, borderRadius: 4 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <p style={{ fontFamily: 'Chalkduster, cursive', fontSize: '1.2rem', color: '#C1361D', fontStyle: 'italic', marginBottom: 6, lineHeight: 1.5 }}>
            {element.heart_quote}
          </p>
          {element.heart_attribution && (
            <p style={{ fontFamily: 'Chalkduster, cursive', fontSize: '0.85rem', color: '#1A1A1A' }}>
              — {element.heart_attribution}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Head/Test */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 36 }}>🧠</span>
          <span style={{ fontFamily: 'Chalkduster, cursive', fontSize: '0.75rem', textAlign: 'center', lineHeight: 1.3 }}>
            <span style={{ color: '#C1361D' }}>Head</span><span style={{ color: '#1A1A1A' }}>/Test</span>
          </span>
        </div>
        <div>
          <p style={{ fontFamily: 'Chalkduster, cursive', fontSize: '1rem', color: '#1A1A1A', lineHeight: 1.6 }}>
            {element.pulse}
          </p>
        </div>
      </div>

      {/* Row 3: Hands/Shifts */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 36 }}>☞</span>
          <span style={{ fontFamily: 'Chalkduster, cursive', fontSize: '0.75rem', textAlign: 'center', lineHeight: 1.3 }}>
            <span style={{ color: '#C1361D' }}>Hands</span><span style={{ color: '#1A1A1A' }}>/Shifts</span>
          </span>
        </div>
        <div>
          {element.shifts.map((shift, i) => {
            const overIdx = shift.label.indexOf(' over ');
            const xPart = overIdx !== -1 ? shift.label.substring(0, overIdx) + ' over' : shift.label;
            const yPart = overIdx !== -1 ? shift.label.substring(overIdx + 6) : '';
            return (
              <div key={i} style={{ marginBottom: i < element.shifts.length - 1 ? 14 : 0 }}>
                <span style={{ fontFamily: 'Chalkduster, cursive', color: '#C1361D', display: 'block', lineHeight: 1.4 }}>
                  {xPart}
                </span>
                <span style={{ fontFamily: 'Chalkduster, cursive', color: '#1A1A1A', display: 'block', lineHeight: 1.4 }}>
                  {yPart}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Priority element ─────────────────────────────────
function Step2Priority({ response, onBack, onNext }) {
  const [selected, setSelected] = React.useState(
    response?.priority !== null && response?.priority !== undefined ? response.priority : null
  );
  const scores = React.useMemo(() => {
    try { return JSON.parse(response?.scores || '[]'); } catch { return []; }
  }, [response]);

  // Sort indices by ascending score (lowest = highest priority)
  const sortedIndices = React.useMemo(() => {
    const indices = PCT_ELEMENTS.map((_, i) => i);
    if (!scores.length) return indices;
    return indices.sort((a, b) => {
      const sa = scores[a] != null ? scores[a] : 99;
      const sb = scores[b] != null ? scores[b] : 99;
      return sa - sb;
    });
  }, [scores]);

  return (
    <div className="page-center" style={{ paddingTop: 32, maxWidth: 820 }}>
      <div style={{ marginBottom: 24 }}>
        <h2>Choose Your Priority Element</h2>
        <p className="muted">Select the one PCT element you want to focus on. Cards are sorted by lowest score first — these are your highest-priority areas.</p>
      </div>

      <div className="priority-grid">
        {sortedIndices.map(i => {
          const el = PCT_ELEMENTS[i];
          const score = scores[i];
          return (
            <div key={el.n} className={`priority-card ${selected === i ? 'selected' : ''}`} onClick={() => setSelected(i)}>
              <div className="priority-card-num">PCT {el.n}</div>
              <div className="priority-card-title">{el.title}</div>
              {score != null && (
                <div style={{ marginBottom: 6, color: 'var(--red)', fontSize: '.8125rem', fontWeight: 700 }}>
                  You rated: {score} / 7
                </div>
              )}
              <div className="priority-card-quadrant">
                <span className={`badge q-${el.quadrant.toLowerCase()}`}>{el.quadrant}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selected !== null && (
        <HeartHeadHandsCard element={PCT_ELEMENTS[selected]} />
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={() => onNext(selected)} disabled={selected === null}>
          Continue to Rank Shifts →
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Rank Shifts (drag-and-drop) ──────────────────────
function Step3Ranking({ response, onBack, onNext }) {
  const priority = response?.priority;
  const priorityEl = priority !== null && priority !== undefined ? PCT_ELEMENTS[priority] : null;
  const shifts = priorityEl ? priorityEl.shifts : [];

  const [items, setItems] = React.useState(() => {
    try {
      const r = JSON.parse(response?.ranking || '[]');
      if (r.length === shifts.length) return r;
    } catch {}
    return shifts.map((_, i) => i);
  });

  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);

  if (!priorityEl) return (
    <div className="page-center" style={{ paddingTop: 40 }}>
      <div className="alert alert-error">No priority element selected. Please go back.</div>
      <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onBack}>← Back</button>
    </div>
  );

  function onDragStart(e, i) { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; }
  function onDragOver(e, i)  { e.preventDefault(); setOverIdx(i); }
  function onDragEnd()       { setDragIdx(null); setOverIdx(null); }

  function onDrop(e, i) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setItems(next);
    setDragIdx(null);
    setOverIdx(null);
  }

  function moveUp(i)   { if (i === 0) return; const n = [...items]; [n[i-1], n[i]] = [n[i], n[i-1]]; setItems(n); }
  function moveDown(i) { if (i === items.length - 1) return; const n = [...items]; [n[i], n[i+1]] = [n[i+1], n[i]]; setItems(n); }

  return (
    <div className="page-center" style={{ paddingTop: 32, maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h2>Rank Your Priority Shifts</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Drag to reorder — rank these {shifts.length} shifts from most important (#1) to least important (#{shifts.length})
          for your current leadership context.
        </p>
      </div>

      <HeartHeadHandsCard element={priorityEl} />

      <div className="rank-list" style={{ marginTop: 24 }}>
        {items.map((shiftIdx, rankPos) => {
          const shift = shifts[shiftIdx];
          const parts = shift.label.split(' over ');
          const over = parts[0];
          const under = parts.slice(1).join(' over ');
          return (
            <div
              key={shiftIdx}
              className={`rank-item ${dragIdx === rankPos ? 'dragging' : ''} ${overIdx === rankPos && dragIdx !== rankPos ? 'drag-over' : ''}`}
              draggable
              onDragStart={e => onDragStart(e, rankPos)}
              onDragOver={e => onDragOver(e, rankPos)}
              onDrop={e => onDrop(e, rankPos)}
              onDragEnd={onDragEnd}
            >
              <div className="rank-num">{rankPos + 1}</div>
              <span className="rank-drag-handle">⠿</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="rank-title">
                  <strong>{over}</strong>
                  <span className="muted" style={{ margin: '0 5px', fontWeight: 400 }}>over</span>
                  <span>{under}</span>
                </div>
                <p className="small muted" style={{ marginTop: 2, lineHeight: 1.4 }}>{shift.description}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button className="btn-ghost btn btn-sm" style={{ padding: '2px 6px' }} onClick={() => moveUp(rankPos)} disabled={rankPos === 0} title="Move up">↑</button>
                <button className="btn-ghost btn btn-sm" style={{ padding: '2px 6px' }} onClick={() => moveDown(rankPos)} disabled={rankPos === items.length - 1} title="Move down">↓</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={() => onNext(items)}>Continue to Activators →</button>
      </div>
    </div>
  );
}

// ── Step 4: MBD Activators ───────────────────────────────────
function Step4Activators({ response, onBack, onNext, autosave }) {
  const priority = response?.priority;
  const priorityEl = priority !== null && priority !== undefined ? PCT_ELEMENTS[priority] : null;

  const ranking = React.useMemo(() => {
    try {
      const r = JSON.parse(response?.ranking || '[]');
      return r.length > 0 ? r : (priorityEl ? priorityEl.shifts.map((_, i) => i) : []);
    } catch { return []; }
  }, [response, priorityEl]);

  const [activators, setActivators] = React.useState(() => {
    try { return JSON.parse(response?.activators || '{}'); } catch { return {}; }
  });

  function emptyMBD() {
    return { moreOf: ['', '', ''], better: ['', '', ''], differently: ['', '', ''], completeWhen: '', owner: '', due: '' };
  }

  function updateMBD(shiftIdx, field, value, idx) {
    const next = { ...activators };
    const cur = next[shiftIdx] ? { ...next[shiftIdx] } : emptyMBD();
    if (idx !== undefined) { cur[field] = [...(cur[field] || ['', '', ''])]; cur[field][idx] = value; }
    else { cur[field] = value; }
    next[shiftIdx] = cur;
    setActivators(next);
    autosave(next);
  }

  if (!priorityEl || ranking.length === 0) return (
    <div className="page-center" style={{ paddingTop: 40 }}>
      <div className="alert alert-error">Priority element or ranking not found. Please go back.</div>
      <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onBack}>← Back</button>
    </div>
  );

  const topShiftIdx = ranking[0];
  const topMBD = activators[topShiftIdx] || {};
  const isComplete = topMBD.completeWhen && topMBD.completeWhen.trim();

  return (
    <div className="page-center" style={{ paddingTop: 32, maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <h2>MBD Activators</h2>
        <div className="alert alert-success" style={{ marginTop: 12 }}>
          <strong>Priority: PCT {priorityEl.n} — {priorityEl.title}</strong>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          For each ranked shift, define what you will do MORE OF, get BETTER at, or do DIFFERENTLY.
          Your top-ranked shift requires a completion commitment before you can continue.
        </p>
      </div>

      <MBDIntroPanel />

      {ranking.map((shiftIdx, rankPos) => {
        const shift = priorityEl.shifts[shiftIdx];
        if (!shift) return null;
        const mbd = activators[shiftIdx] || emptyMBD();
        return (
          <ShiftActivatorCard
            key={shiftIdx}
            rank={rankPos + 1}
            shift={shift}
            mbd={mbd}
            isTopRanked={rankPos === 0}
            onChange={(field, value, idx) => updateMBD(shiftIdx, field, value, idx)}
          />
        );
      })}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={() => onNext(activators)} disabled={!isComplete}>
          {isComplete ? 'View My Summary →' : "Complete the top shift's commitment first"}
        </button>
      </div>
    </div>
  );
}

function ShiftActivatorCard({ rank, shift, mbd, isTopRanked, onChange }) {
  const [expanded, setExpanded] = React.useState(isTopRanked);
  const parts = shift.label.split(' over ');
  const over = parts[0];
  const under = parts.slice(1).join(' over ');

  return (
    <div className="card" style={{ marginBottom: 14, borderLeft: isTopRanked ? '3px solid var(--red)' : undefined }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontFamily: 'var(--f-head)', fontSize: '.75rem', color: 'var(--ink-4)', minWidth: 24, flexShrink: 0 }}>#{rank}</span>
        <div style={{ flex: 1 }}>
          <span className="small" style={{ fontWeight: 600 }}>
            To <span style={{ color: 'var(--red)', fontWeight: 700 }}>SHIFT</span> towards{' '}
            <span style={{ color: 'var(--red)', fontFamily: 'var(--f-head)', fontWeight: 700 }}>{over} over {under}</span>.
          </span>
          {isTopRanked && <span className="badge badge-red" style={{ marginLeft: 8, fontSize: '.6rem', verticalAlign: 'middle' }}>Primary Focus</span>}
        </div>
        <span className={`chevron ${expanded ? 'open' : ''}`} style={{ flexShrink: 0 }}>▶</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          {shift.description && <p className="small muted" style={{ marginBottom: 14 }}>{shift.description}</p>}
          <ActivatorGroup title="MORE OF" subtitle="What will you start doing more of?" values={mbd.moreOf || ['', '', '']} onChange={(val, idx) => onChange('moreOf', val, idx)} />
          <ActivatorGroup title="BETTER"  subtitle="What will you do more skillfully?"  values={mbd.better  || ['', '', '']} onChange={(val, idx) => onChange('better',  val, idx)} />
          <ActivatorGroup title="DIFFERENTLY" subtitle="What will you change or stop doing?" values={mbd.differently || ['', '', '']} onChange={(val, idx) => onChange('differently', val, idx)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">
                <span style={{ color: 'var(--red)', fontFamily: 'var(--f-head)' }}>SHIFT is COMPLETE</span> when…
                {isTopRanked && <span style={{ color: 'var(--red)', marginLeft: 4 }}>*</span>}
              </label>
              <textarea className="form-textarea" value={mbd.completeWhen || ''} onChange={e => onChange('completeWhen', e.target.value)} placeholder="Describe a specific, observable behavior or outcome that signals success" rows={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Accountability Partner</label>
                <input className="form-input" value={mbd.owner || ''} onChange={e => onChange('owner', e.target.value)} placeholder="Who will hold you accountable?" />
              </div>
              <div className="form-group">
                <label className="form-label">Target Date</label>
                <input className="form-input" type="date" value={mbd.due || ''} onChange={e => onChange('due', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivatorGroup({ title, subtitle, values, onChange }) {
  const keyMap = { 'MORE OF': 'MORE OF', 'BETTER': 'BETTER', 'DIFFERENTLY': 'DIFFERENTLY' };
  const key = keyMap[title] || title;
  return (
    <div className="activator-section">
      <div className="activator-header">
        Three things we must do <span style={{ color: 'var(--red)' }}>{key}</span>
      </div>
      <div className="activator-body">
        <p className="small muted" style={{ marginBottom: 4 }}>{subtitle}</p>
        {[0, 1, 2].map(i => (
          <div key={i} className="activator-input-row">
            <div className="activator-num">{i + 1}</div>
            <input className="form-input" value={values[i] || ''} onChange={e => onChange(e.target.value, i)} placeholder={`Activator ${i + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 5: Summary ──────────────────────────────────────────
function Step5Summary({ response, cohort, cohortId, responseId }) {
  const [submitted, setSubmitted] = React.useState(!!response?.submitted_at);
  const [aiSummary, setAiSummary] = React.useState(() => {
    try { return response?.ai_summary ? JSON.parse(response.ai_summary) : null; } catch { return null; }
  });
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);
  const [aiAvailable, setAiAvailable] = React.useState(null);

  // Radar state — cohort leadership vs org
  const [leadershipRadar, setLeadershipRadar] = React.useState(null);
  const [orgRadar, setOrgRadar] = React.useState(null);
  const [radarAudience, setRadarAudience] = React.useState('leadership_only');
  const [radarReleased, setRadarReleased] = React.useState(false);

  const scores = React.useMemo(() => {
    try { return JSON.parse(response?.scores || '[]'); } catch { return []; }
  }, [response]);

  const ranking = React.useMemo(() => {
    try { return JSON.parse(response?.ranking || '[]'); } catch { return []; }
  }, [response]);

  const activators = React.useMemo(() => {
    try { return JSON.parse(response?.activators || '{}'); } catch { return {}; }
  }, [response]);

  const priority = response?.priority;
  const priorityEl = priority !== null && priority !== undefined ? PCT_ELEMENTS[priority] : null;

  // Auto-submit
  React.useEffect(() => {
    if (!submitted) {
      fetch(`/api/responses/${responseId}/submit`, { method: 'POST' })
        .then(r => r.json())
        .then(() => setSubmitted(true));
    }
  }, []);

  // Load radar data
  React.useEffect(() => {
    if (!cohortId) return;
    fetch(`/api/cohorts/${cohortId}/radar`)
      .then(r => r.json())
      .then(data => {
        setRadarReleased(!!data.released);
        setRadarAudience(data.audience || 'leadership_only');
        if (data.released) {
          setLeadershipRadar(data.leadership);
          setOrgRadar(data.org);
        }
      });
  }, [cohortId]);

  React.useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(data => setAiAvailable(!!data.available));
  }, []);

  React.useEffect(() => {
    if (aiAvailable === true && !aiSummary && !aiLoading && submitted) triggerAI();
  }, [aiAvailable, submitted]);

  async function triggerAI() {
    setAiLoading(true);
    setAiError(null);
    try {
      const r = await fetch(`/api/responses/${responseId}/analyze`, { method: 'POST' });
      const data = await r.json();
      if (data.error) { setAiError(data.error); setAiLoading(false); return; }
      setAiSummary(data);
    } catch { setAiError('Could not generate analysis. Please try again.'); }
    setAiLoading(false);
  }

  const avg = scores.length
    ? (scores.filter(Boolean).reduce((a, b) => a + b, 0) / scores.filter(Boolean).length).toFixed(1)
    : null;

  // Personal radar always shows personal scores
  const radarScores  = scores;
  const radarOrgData = null;

  return (
    <div className="page-center" style={{ paddingTop: 32, maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--f-head)', fontWeight: 700, fontSize: '1.75rem' }}>Your PCT Summary</h1>
          <p className="muted">{response?.participant_name || response?.name} · {cohort?.name}</p>
        </div>
        <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>🖨 Print</button>
      </div>

      {/* Radar Chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>PCT Pulse Radar</h3>
          {avg && <span className="score-num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>Overall avg: {avg}/7</span>}
        </div>
        <div style={{ padding: '8px 0', minHeight: 480 }}>
          {radarScores && radarScores.length === 10 && (
            <RadarChart scores={radarScores} />
          )}
        </div>
      </div>

      {/* Element Scores */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3>Your Element Scores</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {PCT_ELEMENTS.map((el, i) => (
            <div key={el.n} className="score-row">
              <div className="score-label"><strong>PCT {el.n}</strong> {el.title}</div>
              <div className="score-bar"><div className="score-bar-fill" style={{ width: `${((scores[i] || 0) / 7) * 100}%` }} /></div>
              <div className="score-num">{scores[i] ?? '–'}/7</div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority + Activation Plan */}
      {priorityEl && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3>Priority Element & Activation Plan</h3>
            <span className={`badge q-${priorityEl.quadrant.toLowerCase()}`}>{priorityEl.quadrant}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>PCT {priorityEl.n} — {priorityEl.title}</p>
            <p className="small muted" style={{ marginBottom: 16 }}>{priorityEl.heart}</p>

            {ranking.map((shiftIdx, rankPos) => {
              const shift = priorityEl.shifts[shiftIdx];
              if (!shift) return null;
              const shiftMBD = activators[shiftIdx] || {};
              const parts = shift.label.split(' over ');
              const over = parts[0];
              const under = parts.slice(1).join(' over ');
              const isTop = rankPos === 0;
              return (
                <div key={shiftIdx} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', color: 'var(--ink-4)', minWidth: 22 }}>#{rankPos + 1}</span>
                    <span className="small" style={{ fontWeight: 600 }}>
                      <strong>{over}</strong>
                      <span className="muted" style={{ fontWeight: 400, margin: '0 4px' }}>over</span>
                      {under}
                    </span>
                    {isTop && <span className="badge badge-blue" style={{ fontSize: '.6rem' }}>Primary Focus</span>}
                  </div>
                  {isTop && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                      {['moreOf', 'better', 'differently'].map(field => (
                        <div key={field} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                          <div className="label" style={{ marginBottom: 5, fontSize: '.65rem' }}>
                            {field === 'moreOf' ? 'More Of' : field === 'better' ? 'Better' : 'Differently'}
                          </div>
                          {(shiftMBD[field] || []).filter(Boolean).map((v, i) => <p key={i} className="small" style={{ marginBottom: 2 }}>• {v}</p>)}
                          {!(shiftMBD[field] || []).filter(Boolean).length && <p className="small muted">—</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {shiftMBD.completeWhen && (
                    <div style={{ padding: 10, background: 'var(--accent-tint)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent)' }}>
                      <div className="label" style={{ marginBottom: 4, fontSize: '.65rem' }}>Complete When</div>
                      <p className="small">{shiftMBD.completeWhen}</p>
                      {(shiftMBD.owner || shiftMBD.due) && (
                        <p className="small muted" style={{ marginTop: 4 }}>
                          {shiftMBD.owner && <span>Owner: {shiftMBD.owner}</span>}
                          {shiftMBD.owner && shiftMBD.due && ' · '}
                          {shiftMBD.due && <span>Due: {shiftMBD.due}</span>}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="ai-card" style={{ marginBottom: 24 }}>
        <div className="ai-card-header">
          <div>✦</div>
          <div>
            <h3>AI Leadership Analysis</h3>
            <p style={{ fontSize: '.75rem', opacity: .8, marginTop: 2 }}>Powered by Claude · PCT Methodology</p>
          </div>
        </div>
        {aiAvailable === false && <div style={{ padding: 20 }}><p className="muted">AI analysis unavailable — contact your administrator</p></div>}
        {aiAvailable !== false && aiLoading && (
          <div className="loading-block">
            <div className="spinner spinner-lg" />
            <p>Generating your leadership analysis…</p>
            <p className="small muted">This takes about 10–20 seconds</p>
          </div>
        )}
        {aiAvailable !== false && aiError && !aiLoading && (
          <div style={{ padding: 20 }}>
            <div className="alert alert-error" style={{ marginBottom: 12 }}>{aiError}</div>
            <button className="btn btn-primary btn-sm" onClick={triggerAI}>Try Again</button>
          </div>
        )}
        {aiAvailable !== false && aiSummary && !aiLoading && (
          <AISummaryDisplay summary={aiSummary} onRegenerate={triggerAI} />
        )}
      </div>

      {/* Thematic Summary (only when cohort avg is released) */}
      {cohortId && radarReleased && <ThematicSummary cohortId={cohortId} />}

      {/* Cohort Summary — only when released */}
      {cohortId && radarReleased && leadershipRadar && (
        <div style={{ marginTop: 40, borderTop: '2px solid var(--line)', paddingTop: 32 }}>
          <h2 style={{ color: 'var(--red)', fontFamily: 'var(--f-head)', fontWeight: 700, marginBottom: 24 }}>
            Cohort Pulse · {cohort?.name}
          </h2>

          {/* Section A: Cohort Average Radar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>Cohort Average</h3>
              {radarAudience === 'mixed' && orgRadar && orgRadar.length === 10
                ? <span className="badge badge-blue">Leadership & Org averages shown</span>
                : <span className="badge badge-gray">Cohort averages shown</span>}
            </div>
            <div style={{ padding: '8px 0', minHeight: 480 }}>
              {leadershipRadar && leadershipRadar.length === 10 && (
                <RadarChart
                  scores={leadershipRadar}
                  orgScores={radarAudience === 'mixed' && orgRadar && orgRadar.length === 10 ? orgRadar : null}
                />
              )}
            </div>
          </div>

          {/* Section C: PCT Priority Rankings */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h3>PCT Priority Rankings</h3></div>
            <div style={{ padding: '8px 0' }}>
              <PCTRankingsTable cohortId={cohortId} audience={radarAudience} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PCT Priority Rankings Table ───────────────────────────────
function PCTRankingsTable({ cohortId, audience }) {
  const [rankings, setRankings] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [forbidden, setForbidden] = React.useState(false);
  const [expandedRow, setExpandedRow] = React.useState(null);
  const [mbdInputs, setMbdInputs] = React.useState({});

  React.useEffect(() => {
    fetch(`/api/cohorts/${cohortId}/ranked-pcts`)
      .then(r => {
        if (r.status === 403) { setForbidden(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (data) setRankings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cohortId]);

  function updateMbd(elementIndex, shiftPos, field, inputIdx, value) {
    setMbdInputs(prev => {
      const key = `${elementIndex}-${shiftPos}`;
      const cur = prev[key] || { moreOf: ['','',''], better: ['','',''], differently: ['','',''], completeWhen: '' };
      const updated = { ...cur };
      if (inputIdx !== undefined) {
        updated[field] = [...(cur[field] || ['','',''])];
        updated[field][inputIdx] = value;
      } else {
        updated[field] = value;
      }
      return { ...prev, [key]: updated };
    });
  }

  if (loading) return <div className="loading-block" style={{ padding: 24 }}><div className="spinner" /></div>;

  if (forbidden) return (
    <div className="alert alert-info" style={{ margin: 12, textAlign: 'center' }}>
      Rankings will appear once the facilitator releases results.
    </div>
  );

  if (!rankings || !rankings.length) return (
    <p className="muted" style={{ padding: 16, textAlign: 'center' }}>No ranking data yet.</p>
  );

  const isMixed = audience === 'mixed';

  function priorityLabel(delta) {
    if (delta === null) return { text: '—', color: '#888888' };
    if (delta < -1.0) return { text: 'Critical Blind Spot', color: '#C1361D' };
    if (delta < 0)    return { text: 'Blind Spot',          color: '#C1361D' };
    return               { text: 'Aligned',                 color: '#888888' };
  }

  return (
    <div>
      {isMixed && (
        <p className="small muted" style={{ padding: '8px 16px 0', lineHeight: 1.6 }}>
          Ranked by gap between how Organisational People and Leadership rate each PCT.
          A negative gap means Org rates it lower than Leadership — these are your blind spots.
        </p>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>PCT Element</th>
              {isMixed
                ? <th>Priority Label</th>
                : <th>Cohort Avg Score</th>}
            </tr>
          </thead>
          <tbody>
            {rankings.map(r => {
              const el = PCT_ELEMENTS[r.elementIndex];
              const isExpanded = expandedRow === r.elementIndex;
              const label = isMixed ? priorityLabel(r.delta) : null;
              return (
                <React.Fragment key={r.elementIndex}>
                  <tr onClick={() => setExpandedRow(isExpanded ? null : r.elementIndex)} style={{ cursor: 'pointer' }}>
                    <td><strong>#{r.rank}</strong></td>
                    <td>
                      <strong>PCT {el.n}</strong> — {el.title}
                      <span className="muted small" style={{ marginLeft: 6 }}>{isExpanded ? '▲' : '▼'}</span>
                    </td>
                    {isMixed ? (
                      <td style={{ color: label.color, fontWeight: 600 }}>{label.text}</td>
                    ) : (
                      <td>{r.leadershipAvg !== null ? `${r.leadershipAvg}/7` : '—'}</td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={3} style={{ padding: 0, background: 'var(--surface-2)' }}>
                        <MBDExpandedBlock
                          el={el}
                          mbdInputs={mbdInputs}
                          onUpdate={updateMbd}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MBD Expanded Block (cohort view) ─────────────────────────
function MBDExpandedBlock({ el, mbdInputs, onUpdate }) {
  return (
    <div style={{ padding: '20px 24px' }}>
      <h3 style={{ marginBottom: 4 }}>{el.title}</h3>
      <p className="small muted" style={{ marginBottom: 20 }}>{el.heart}</p>

      {el.shifts.map((shift, shiftPos) => {
        const key = `${el.n - 1}-${shiftPos}`;
        const mbd = mbdInputs[key] || {};
        const parts = shift.label.split(' over ');
        const over = parts[0];
        const under = parts.slice(1).join(' over ');

        return (
          <div key={shiftPos} style={{ marginBottom: 28, borderLeft: '3px solid var(--red)', paddingLeft: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 16, fontFamily: 'var(--f-head)' }}>
              To <span style={{ color: 'var(--red)' }}>SHIFT</span> towards{' '}
              <span style={{ color: 'var(--red)', fontFamily: 'var(--f-head)' }}>
                {over} over {under}
              </span>.
            </p>

            {[
              { field: 'moreOf',      key: 'MORE OF' },
              { field: 'better',      key: 'BETTER' },
              { field: 'differently', key: 'DIFFERENTLY' }
            ].map(({ field, key }) => (
              <div key={field} style={{ marginBottom: 16 }}>
                <div className="mbd-header" style={{ marginBottom: 8 }}>
                  Three things we must do <span className="mbd-key">{key}</span>
                </div>
                {[0, 1, 2].map(i => (
                  <input
                    key={i}
                    className="form-input"
                    style={{ marginBottom: 6 }}
                    value={(mbd[field] || ['','',''])[i] || ''}
                    onChange={e => onUpdate(el.n - 1, shiftPos, field, i, e.target.value)}
                    placeholder={`${i + 1}.`}
                  />
                ))}
              </div>
            ))}

            <div>
              <div className="mbd-header" style={{ marginBottom: 8 }}>
                <span className="mbd-key">SHIFT is COMPLETE</span> when…
              </div>
              <input
                className="form-input"
                value={mbd.completeWhen || ''}
                onChange={e => onUpdate(el.n - 1, shiftPos, 'completeWhen', undefined, e.target.value)}
                placeholder="Describe a specific, observable outcome that signals this shift is complete…"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Thematic Summary ──────────────────────────────────────────
function ThematicSummary({ cohortId }) {
  const [synthesis, setSynthesis] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [timestamp, setTimestamp] = React.useState(null);

  React.useEffect(() => {
    fetch(`/api/cohorts/${cohortId}/synthesize`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !data.error) {
          setSynthesis(data);
          setTimestamp(new Date().toLocaleString());
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cohortId]);

  if (loading) return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="loading-block">
        <div className="spinner" />
        <p className="small muted">Generating thematic summary…</p>
      </div>
    </div>
  );

  if (!synthesis) return null;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-header"><h3>Thematic Summary</h3></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: 16 }}>
        {[
          { key: 'moreOf',      label: 'MORE OF' },
          { key: 'better',      label: 'BETTER' },
          { key: 'differently', label: 'DIFFERENTLY' }
        ].map(({ key, label }) => (
          <div key={key} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
            <div className="mbd-header" style={{ marginBottom: 8 }}>{label}</div>
            <p className="small" style={{ lineHeight: 1.6 }}>{synthesis[key]}</p>
          </div>
        ))}
      </div>
      {(synthesis.leadershipThemes || synthesis.orgThemes) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px 16px' }}>
          {synthesis.leadershipThemes && (
            <div style={{ background: 'rgba(31,111,92,0.08)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
              <div className="label" style={{ marginBottom: 4 }}>Leadership Themes</div>
              <p className="small">{synthesis.leadershipThemes}</p>
            </div>
          )}
          {synthesis.orgThemes && (
            <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
              <div className="label" style={{ marginBottom: 4 }}>Organizational Themes</div>
              <p className="small">{synthesis.orgThemes}</p>
            </div>
          )}
        </div>
      )}
      <p className="small muted" style={{ textAlign: 'center', padding: '0 16px 12px' }}>
        Generated by AI · {timestamp}
      </p>
    </div>
  );
}

// ── AI Summary Display ────────────────────────────────────────
function AISummaryDisplay({ summary, onRegenerate }) {
  return (
    <div>
      <div className="ai-section">
        <div className="ai-section-title">Your Leadership Theme</div>
        <p className="headline-text">"{summary.headline}"</p>
      </div>

      {summary.quadrantProfile && (
        <div className="ai-section">
          <div className="ai-section-title">Quadrant Profile</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span className={`badge q-${(summary.quadrantProfile.dominantQuadrant || '').toLowerCase()}`} style={{ fontSize: '.875rem', padding: '4px 12px' }}>
              {summary.quadrantProfile.dominantQuadrant} Dominant
            </span>
          </div>
          <p style={{ fontSize: '.9375rem', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 10 }}>
            {summary.quadrantProfile.profileNarrative}
          </p>
          {summary.quadrantProfile.watchOut && (
            <div className="alert alert-warning">
              <strong>⚠ Watch out:</strong> {summary.quadrantProfile.watchOut}
            </div>
          )}
        </div>
      )}

      <div className="ai-section">
        <div className="strength-dev-grid">
          <div>
            <div className="ai-section-title" style={{ color: 'var(--accent)' }}>Strengths</div>
            {(summary.strengthAreas || []).map((s, i) => (
              <div key={i} className="strength-item" style={{ marginBottom: 10 }}>
                <div className="item-element">{s.element}</div>
                <div className="item-score">
                  <div className="score-bar" style={{ flex: 1 }}><div className="score-bar-fill" style={{ width: `${(s.score / 7) * 100}%` }} /></div>
                  <span className="score-num">{s.score}/7</span>
                </div>
                <p className="item-insight">{s.insight}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="ai-section-title" style={{ color: '#e07a40' }}>Development Areas</div>
            {(summary.developmentAreas || []).map((d, i) => (
              <div key={i} className="dev-item" style={{ marginBottom: 10 }}>
                <div className="item-element">{d.element}</div>
                <div className="item-score">
                  <div className="score-bar" style={{ flex: 1 }}><div className="score-bar-fill" style={{ width: `${(d.score / 7) * 100}%`, background: '#e07a40' }} /></div>
                  <span className="score-num" style={{ color: '#e07a40' }}>{d.score}/7</span>
                </div>
                <p className="item-insight">{d.insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {summary.priorityAnalysis && (
        <div className="ai-section">
          <div className="ai-section-title">Priority Element Analysis</div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>{summary.priorityAnalysis.element}</p>
          <p style={{ fontSize: '.9375rem', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 10 }}>
            {summary.priorityAnalysis.whyItMatters}
          </p>
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10 }}>
            <div className="label" style={{ marginBottom: 6 }}>Activator Quality</div>
            <p className="small">{summary.priorityAnalysis.activatorQuality}</p>
          </div>
          <div style={{ background: 'var(--accent-tint)', borderRadius: 'var(--radius-sm)', padding: 12, borderLeft: '3px solid var(--accent)' }}>
            <div className="label" style={{ marginBottom: 6 }}>Refined "Complete When"</div>
            <p className="small" style={{ fontStyle: 'italic' }}>{summary.priorityAnalysis.refinedComplete}</p>
          </div>
        </div>
      )}

      {summary.coachingQuestions && (
        <div className="ai-section">
          <div className="ai-section-title">3 Questions to Sit With</div>
          {summary.coachingQuestions.map((q, i) => (
            <div key={i} className="coaching-q" style={{ marginBottom: 8 }}>{i + 1}. {q}</div>
          ))}
        </div>
      )}

      {summary['90DayFocus'] && (
        <div className="ai-section">
          <div className="ai-section-title">Your 90-Day Focus</div>
          <div>
            {[
              { key: 'week1to2',  label: 'Weeks 1–2' },
              { key: 'week3to6',  label: 'Weeks 3–6' },
              { key: 'week7to12', label: 'Weeks 7–12' }
            ].map(({ key, label }) => (
              <div key={key} className="timeline-item">
                <div className="timeline-marker"><span className="timeline-period">{label}</span></div>
                <div className="timeline-content">{summary['90DayFocus'][key]}</div>
              </div>
            ))}
            {summary['90DayFocus'].successIndicator && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)' }}>
                <div className="label" style={{ marginBottom: 4 }}>Success at 90 Days Looks Like</div>
                <p className="small">{summary['90DayFocus'].successIndicator}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ai-section no-print">
        <button className="btn btn-ghost btn-sm" onClick={onRegenerate}>↺ Regenerate Analysis</button>
      </div>
    </div>
  );
}

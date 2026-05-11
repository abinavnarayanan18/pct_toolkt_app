// ── Participant Flow: 6 Steps ────────────────────────────────

function ParticipantApp({ cohortId }) {
  const [cohort, setCohort] = React.useState(null);
  const [responseId, setResponseId] = React.useState(() => localStorage.getItem(`pct_resp_${cohortId}`));
  const [response, setResponse] = React.useState(null);
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    fetch(`/api/cohorts/${cohortId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setCohort(data);
        setLoading(false);
      })
      .catch(() => { setError('Could not load cohort'); setLoading(false); });
  }, [cohortId]);

  React.useEffect(() => {
    if (!responseId) return;
    fetch(`/api/responses/${responseId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          localStorage.removeItem(`pct_resp_${cohortId}`);
          setResponseId(null);
          return;
        }
        setResponse(data);
        setStep(data.step || 0);
      });
  }, [responseId]);

  async function startSession(name, role) {
    const r = await fetch(`/api/cohorts/${cohortId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role })
    });
    const data = await r.json();
    if (data.error) { setError(data.error); return; }
    localStorage.setItem(`pct_resp_${cohortId}`, data.id);
    setResponseId(data.id);
    setResponse(data);
    setStep(1);
    await autosave(data.id, { step: 1, name, role });
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
    const fields = { step: newStep, ...extraFields };
    await autosave(responseId, fields);
    setStep(newStep);
  }

  if (loading) return (
    <div className="loading-block">
      <div className="spinner spinner-lg" />
      <span>Loading cohort…</span>
    </div>
  );

  if (error) return (
    <div className="page-center" style={{ paddingTop: 60 }}>
      <div className="alert alert-error">{error}</div>
    </div>
  );

  if (!cohort) return null;

  if (cohort.status === 'closed' && step < 6) return (
    <div className="page-center" style={{ paddingTop: 60 }}>
      <div className="alert alert-warning">
        This cohort is currently closed. Please contact your facilitator.
      </div>
    </div>
  );

  const STEPS = [
    { label: 'Start', n: 0 },
    { label: 'Profile', n: 1 },
    { label: 'PCT Pulse', n: 2 },
    { label: 'Priority', n: 3 },
    { label: 'Rank Shifts', n: 4 },
    { label: 'Activators', n: 5 },
    { label: 'Summary', n: 6 }
  ];

  return (
    <div className="app-shell">
      {step > 0 && step < 6 && (
        <div className="page-center" style={{ paddingBottom: 0 }}>
          <div className="stepper">
            {STEPS.slice(1).map((s, i) => (
              <React.Fragment key={s.n}>
                {i > 0 && (
                  <div className={`step-connector ${step > s.n ? 'done' : ''}`} />
                )}
                <div className={`step-item ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                  <div className="step-dot">
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className="step-label">{s.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {step === 0 && (
        <Step0Welcome cohort={cohort} onStart={startSession} />
      )}
      {step === 1 && (
        <Step1Profile
          response={response}
          onNext={(name, role) => goToStep(2, { name, role })}
        />
      )}
      {step === 2 && (
        <Step2Pulse
          response={response}
          onBack={() => goToStep(1)}
          onNext={(scores) => goToStep(3, { scores: JSON.stringify(scores) })}
          autosave={(scores) => autosave(responseId, { scores: JSON.stringify(scores) })}
        />
      )}
      {step === 3 && (
        <Step3Priority
          response={response}
          onBack={() => goToStep(2)}
          onNext={(priority) => goToStep(4, { priority })}
        />
      )}
      {step === 4 && (
        <Step4Ranking
          response={response}
          onBack={() => goToStep(3)}
          onNext={(ranking) => goToStep(5, { ranking: JSON.stringify(ranking) })}
        />
      )}
      {step === 5 && (
        <Step5Activators
          response={response}
          onBack={() => goToStep(4)}
          onNext={(activators) => goToStep(6, { activators: JSON.stringify(activators) })}
          autosave={(activators) => autosave(responseId, { activators: JSON.stringify(activators) })}
        />
      )}
      {step === 6 && (
        <Step6Summary
          response={response}
          cohort={cohort}
          responseId={responseId}
        />
      )}
    </div>
  );
}

// ── Step 0: Welcome ──────────────────────────────────────────
function Step0Welcome({ cohort, onStart }) {
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleStart(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onStart(name.trim(), role.trim());
    setLoading(false);
  }

  return (
    <div className="page-center" style={{ paddingTop: 60, maxWidth: 600 }}>
      <div className="card card-lg">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="brand-mark" style={{ width: 56, height: 56, fontSize: '1.25rem', margin: '0 auto 16px' }}>PCT</div>
          <h1 className="display" style={{ fontSize: '2rem', marginBottom: 8 }}>PCT Catalyst</h1>
          <p className="muted">Leadership Transformation Assessment</p>
          {cohort.description && (
            <p style={{ marginTop: 12, fontSize: '.9375rem', color: 'var(--ink-2)' }}>{cohort.description}</p>
          )}
        </div>

        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          <strong>Cohort:</strong> {cohort.name}
          {cohort.sponsor && <> · <strong>Sponsor:</strong> {cohort.sponsor}</>}
        </div>

        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Your Full Name *</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Jane Smith"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Your Role / Title</label>
            <input
              className="form-input"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. VP of Engineering"
            />
          </div>

          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 16, marginTop: 8 }}>
            <p className="small muted" style={{ lineHeight: 1.6 }}>
              This assessment takes approximately 15–20 minutes. You'll rate your organization's
              leadership behaviors, select a priority area, rank transformation shifts, and define
              specific action commitments. Your responses are saved automatically.
            </p>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !name.trim()}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Starting…</> : 'Begin Assessment →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Step 1: Profile confirmation ─────────────────────────────
function Step1Profile({ response, onNext }) {
  const [name, setName] = React.useState(response?.name || '');
  const [role, setRole] = React.useState(response?.role || '');

  return (
    <div className="page-center" style={{ paddingTop: 40, maxWidth: 600 }}>
      <div className="card">
        <div className="card-header">
          <h2>Confirm Your Profile</h2>
          <span className="label">Step 1 of 5</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Role / Title</label>
            <input className="form-input" value={role} onChange={e => setRole(e.target.value)} />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => onNext(name, role)}
            disabled={!name.trim()}
          >
            Continue to PCT Pulse →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: PCT Pulse (10 sliders / likert) ──────────────────
function Step2Pulse({ response, onBack, onNext, autosave }) {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2>PCT Pulse Check</h2>
          <p className="muted">Rate how strongly you agree with each statement about your organization's leaders.</p>
        </div>
        <div className="badge badge-gray">
          {answeredCount}/10 answered
        </div>
      </div>

      <PDFVisual concept="pulse-intro" style={{ marginBottom: 16 }} />

      {PCT_ELEMENTS.map((el, i) => (
        <PulseCard
          key={el.n}
          element={el}
          index={i}
          value={filled[i]}
          onChange={val => setScore(i, val)}
        />
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button
          className="btn btn-primary"
          onClick={() => onNext(filled)}
          disabled={!allAnswered}
        >
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
          <button
            key={v}
            className={`likert-btn ${value === v ? 'selected' : ''}`}
            onClick={() => onChange(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="likert-labels">
        <span>Strongly Disagree</span>
        <span>Strongly Agree</span>
      </div>
    </div>
  );
}

// ── Step 3: Priority element ─────────────────────────────────
function Step3Priority({ response, onBack, onNext }) {
  const [selected, setSelected] = React.useState(
    response?.priority !== null && response?.priority !== undefined ? response.priority : null
  );
  const scores = React.useMemo(() => {
    try { return JSON.parse(response?.scores || '[]'); } catch { return []; }
  }, [response]);

  return (
    <div className="page-center" style={{ paddingTop: 32, maxWidth: 820 }}>
      <div style={{ marginBottom: 24 }}>
        <h2>Choose Your Priority Element</h2>
        <p className="muted">Select the one PCT element you want to focus on most for your personal leadership development.</p>
      </div>

      <div className="priority-grid">
        {PCT_ELEMENTS.map((el, i) => (
          <div
            key={el.n}
            className={`priority-card ${selected === i ? 'selected' : ''}`}
            onClick={() => setSelected(i)}
          >
            <div className="priority-card-num">PCT {el.n}</div>
            <div className="priority-card-title">{el.title}</div>
            <div className="priority-card-quadrant">
              <span className={`badge q-${el.quadrant.toLowerCase()}`} style={{ marginRight: 6 }}>{el.quadrant}</span>
              {scores[i] !== null && scores[i] !== undefined && (
                <span className="small muted">Score: {scores[i]}/7</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected !== null && (
        <div className="alert alert-success" style={{ marginTop: 20 }}>
          <strong>Selected:</strong> PCT {PCT_ELEMENTS[selected].n} — {PCT_ELEMENTS[selected].title}
          <br /><em style={{ fontSize: '.875rem', marginTop: 4, display: 'block' }}>{PCT_ELEMENTS[selected].heart}</em>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button
          className="btn btn-primary"
          onClick={() => onNext(selected)}
          disabled={selected === null}
        >
          Continue to Rank Shifts →
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Rank Shifts (drag-and-drop) ──────────────────────
function Step4Ranking({ response, onBack, onNext }) {
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

  if (!priorityEl) {
    return (
      <div className="page-center" style={{ paddingTop: 40 }}>
        <div className="alert alert-error">No priority element selected. Please go back.</div>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onBack}>← Back</button>
      </div>
    );
  }

  function onDragStart(e, i) {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e, i) {
    e.preventDefault();
    setOverIdx(i);
  }

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

  function onDragEnd() {
    setDragIdx(null);
    setOverIdx(null);
  }

  function moveUp(i) {
    if (i === 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setItems(next);
  }

  function moveDown(i) {
    if (i === items.length - 1) return;
    const next = [...items];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setItems(next);
  }

  return (
    <div className="page-center" style={{ paddingTop: 32, maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h2>Rank Your Priority Shifts</h2>
        <div className="alert alert-success" style={{ marginTop: 12, marginBottom: 12 }}>
          <strong>Priority: PCT {priorityEl.n} — {priorityEl.title}</strong>
        </div>
        <p className="muted">
          Drag to reorder — rank these {shifts.length} shifts from most important (#1) to least important (#{shifts.length})
          for your current leadership context.
        </p>
      </div>

      <div className="rank-list">
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
                <button
                  className="btn-ghost btn btn-sm"
                  style={{ padding: '2px 6px' }}
                  onClick={() => moveUp(rankPos)}
                  disabled={rankPos === 0}
                  title="Move up"
                >↑</button>
                <button
                  className="btn-ghost btn btn-sm"
                  style={{ padding: '2px 6px' }}
                  onClick={() => moveDown(rankPos)}
                  disabled={rankPos === items.length - 1}
                  title="Move down"
                >↓</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={() => onNext(items)}>
          Continue to Activators →
        </button>
      </div>
    </div>
  );
}

// ── Step 5: MBD Activators ───────────────────────────────────
function Step5Activators({ response, onBack, onNext, autosave }) {
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
    if (idx !== undefined) {
      cur[field] = [...(cur[field] || ['', '', ''])];
      cur[field][idx] = value;
    } else {
      cur[field] = value;
    }
    next[shiftIdx] = cur;
    setActivators(next);
    autosave(next);
  }

  if (!priorityEl || ranking.length === 0) {
    return (
      <div className="page-center" style={{ paddingTop: 40 }}>
        <div className="alert alert-error">Priority element or ranking not found. Please go back.</div>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onBack}>← Back</button>
      </div>
    );
  }

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
        <button
          className="btn btn-primary"
          onClick={() => onNext(activators)}
          disabled={!isComplete}
        >
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
    <div className="card" style={{ marginBottom: 14, borderLeft: isTopRanked ? '3px solid var(--accent)' : undefined }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.75rem', color: 'var(--ink-4)', minWidth: 24, flexShrink: 0 }}>#{rank}</span>
        <div style={{ flex: 1 }}>
          <span className="small" style={{ fontWeight: 600 }}>
            <strong>{over}</strong>
            <span className="muted" style={{ fontWeight: 400, margin: '0 5px' }}>over</span>
            {under}
          </span>
          {isTopRanked && (
            <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: '.6rem', verticalAlign: 'middle' }}>Primary Focus</span>
          )}
        </div>
        <span className={`chevron ${expanded ? 'open' : ''}`} style={{ flexShrink: 0 }}>▶</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          {shift.description && (
            <p className="small muted" style={{ marginBottom: 14 }}>{shift.description}</p>
          )}
          <ActivatorGroup
            title="MORE OF"
            subtitle="What will you start doing more of?"
            values={mbd.moreOf || ['', '', '']}
            onChange={(val, idx) => onChange('moreOf', val, idx)}
          />
          <ActivatorGroup
            title="BETTER"
            subtitle="What will you do more skillfully?"
            values={mbd.better || ['', '', '']}
            onChange={(val, idx) => onChange('better', val, idx)}
          />
          <ActivatorGroup
            title="DIFFERENTLY"
            subtitle="What will you change or stop doing?"
            values={mbd.differently || ['', '', '']}
            onChange={(val, idx) => onChange('differently', val, idx)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">
                I will know this shift is complete when…
                {isTopRanked && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>}
              </label>
              <textarea
                className="form-textarea"
                value={mbd.completeWhen || ''}
                onChange={e => onChange('completeWhen', e.target.value)}
                placeholder="Describe a specific, observable behavior or outcome that signals success"
                rows={3}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Accountability Partner</label>
                <input
                  className="form-input"
                  value={mbd.owner || ''}
                  onChange={e => onChange('owner', e.target.value)}
                  placeholder="Who will hold you accountable?"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={mbd.due || ''}
                  onChange={e => onChange('due', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivatorGroup({ title, subtitle, values, onChange }) {
  return (
    <div className="activator-section">
      <div className="activator-header">{title}</div>
      <div className="activator-body">
        <p className="small muted" style={{ marginBottom: 4 }}>{subtitle}</p>
        {[0, 1, 2].map(i => (
          <div key={i} className="activator-input-row">
            <div className="activator-num">{i + 1}</div>
            <input
              className="form-input"
              value={values[i] || ''}
              onChange={e => onChange(e.target.value, i)}
              placeholder={`Activator ${i + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 6: Summary ──────────────────────────────────────────
function Step6Summary({ response, cohort, responseId }) {
  const [submitted, setSubmitted] = React.useState(!!response?.submitted_at);
  const [aiSummary, setAiSummary] = React.useState(() => {
    try { return response?.ai_summary ? JSON.parse(response.ai_summary) : null; } catch { return null; }
  });
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);
  const [radarData, setRadarData] = React.useState(null);
  const [aiAvailable, setAiAvailable] = React.useState(null);

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

  React.useEffect(() => {
    // Auto-submit if not yet submitted
    if (!submitted) {
      fetch(`/api/responses/${responseId}/submit`, { method: 'POST' })
        .then(r => r.json())
        .then(() => setSubmitted(true));
    }
  }, []);

  React.useEffect(() => {
    // Load cohort radar if released
    fetch(`/api/cohorts/${cohort.id}/radar`)
      .then(r => r.json())
      .then(data => {
        if (data.released && data.data) setRadarData(data.data);
      });
  }, []);

  React.useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(data => setAiAvailable(!!data.available));
  }, []);

  React.useEffect(() => {
    // Auto-trigger AI analysis only when availability is confirmed and analysis not yet done
    if (aiAvailable === true && !aiSummary && !aiLoading) {
      triggerAI();
    }
  }, [aiAvailable]);

  async function triggerAI() {
    setAiLoading(true);
    setAiError(null);
    try {
      const r = await fetch(`/api/responses/${responseId}/analyze`, { method: 'POST' });
      const data = await r.json();
      if (data.error) { setAiError(data.error); setAiLoading(false); return; }
      setAiSummary(data);
    } catch (e) {
      setAiError('Could not generate analysis. Please try again.');
    }
    setAiLoading(false);
  }

  const avg = scores.length
    ? (scores.filter(Boolean).reduce((a, b) => a + b, 0) / scores.filter(Boolean).length).toFixed(1)
    : null;

  return (
    <div className="page-center" style={{ paddingTop: 32, maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '1.75rem' }}>
            Your PCT Summary
          </h1>
          <p className="muted">{response?.name} · {cohort.name}</p>
        </div>
        <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
          🖨 Print
        </button>
      </div>

      {/* Radar Chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>PCT Pulse Radar</h3>
        </div>
        <RadarChart
          scores={scores}
          cohortScores={radarData}
          showCohort={!!radarData}
        />
      </div>

      {/* Score breakdown */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3>Element Scores</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {PCT_ELEMENTS.map((el, i) => (
            <div key={el.n} className="score-row">
              <div className="score-label">
                <strong>PCT {el.n}</strong> {el.title}
              </div>
              <div className="score-bar">
                <div className="score-bar-fill" style={{ width: `${((scores[i] || 0) / 7) * 100}%` }} />
              </div>
              <div className="score-num">{scores[i] ?? '–'}/7</div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority + per-shift MBD */}
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
                          {(shiftMBD[field] || []).filter(Boolean).map((v, i) => (
                            <p key={i} className="small" style={{ marginBottom: 2 }}>• {v}</p>
                          ))}
                          {!(shiftMBD[field] || []).filter(Boolean).length && (
                            <p className="small muted">—</p>
                          )}
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

      {/* Ranked shifts */}
      {ranking.length > 0 && priorityEl && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>Ranked Shifts</h3></div>
          <div style={{ marginTop: 8 }}>
            {ranking.map((shiftIdx, rank) => {
              const shift = priorityEl.shifts[shiftIdx];
              if (!shift) return null;
              const parts = shift.label.split(' over ');
              const over = parts[0];
              const under = parts.slice(1).join(' over ');
              return (
                <div key={shiftIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.75rem', color: 'var(--ink-4)', minWidth: 24 }}>#{rank + 1}</span>
                  <span className="small">
                    <strong>{over}</strong>
                    <span className="muted" style={{ margin: '0 4px' }}>over</span>
                    {under}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Analysis Section */}
      <div className="ai-card" style={{ marginBottom: 24 }}>
        <div className="ai-card-header">
          <div>✦</div>
          <div>
            <h3>AI Leadership Analysis</h3>
            <p style={{ fontSize: '.75rem', opacity: .8, marginTop: 2 }}>Powered by Claude · PCT Methodology</p>
          </div>
        </div>

        {aiAvailable === false && (
          <div style={{ padding: 20 }}>
            <p className="muted">AI analysis unavailable — contact your administrator</p>
          </div>
        )}

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
    </div>
  );
}

function AISummaryDisplay({ summary, onRegenerate }) {
  return (
    <div>
      {/* Headline */}
      <div className="ai-section">
        <div className="ai-section-title">Your Leadership Theme</div>
        <p className="headline-text">"{summary.headline}"</p>
      </div>

      {/* Quadrant Profile */}
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

      {/* Strengths & Development */}
      <div className="ai-section">
        <div className="strength-dev-grid">
          <div>
            <div className="ai-section-title" style={{ color: 'var(--accent)' }}>Strengths</div>
            {(summary.strengthAreas || []).map((s, i) => (
              <div key={i} className="strength-item" style={{ marginBottom: 10 }}>
                <div className="item-element">{s.element}</div>
                <div className="item-score">
                  <div className="score-bar" style={{ flex: 1 }}>
                    <div className="score-bar-fill" style={{ width: `${(s.score / 7) * 100}%` }} />
                  </div>
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
                  <div className="score-bar" style={{ flex: 1 }}>
                    <div className="score-bar-fill" style={{ width: `${(d.score / 7) * 100}%`, background: '#e07a40' }} />
                  </div>
                  <span className="score-num" style={{ color: '#e07a40' }}>{d.score}/7</span>
                </div>
                <p className="item-insight">{d.insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Analysis */}
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

      {/* Coaching Questions */}
      {summary.coachingQuestions && (
        <div className="ai-section">
          <div className="ai-section-title">3 Questions to Sit With</div>
          {summary.coachingQuestions.map((q, i) => (
            <div key={i} className="coaching-q" style={{ marginBottom: 8 }}>
              {i + 1}. {q}
            </div>
          ))}
        </div>
      )}

      {/* 90-Day Focus */}
      {summary['90DayFocus'] && (
        <div className="ai-section">
          <div className="ai-section-title">Your 90-Day Focus</div>
          <div>
            {[
              { key: 'week1to2', label: 'Weeks 1–2' },
              { key: 'week3to6', label: 'Weeks 3–6' },
              { key: 'week7to12', label: 'Weeks 7–12' }
            ].map(({ key, label }) => (
              <div key={key} className="timeline-item">
                <div className="timeline-marker">
                  <span className="timeline-period">{label}</span>
                </div>
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
        <button className="btn btn-ghost btn-sm" onClick={onRegenerate}>
          ↺ Regenerate Analysis
        </button>
      </div>
    </div>
  );
}

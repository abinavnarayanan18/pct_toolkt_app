// ── Participant Flow Screens ─────────────────────────────────────────────────

// Safe JSON parse — handles Postgres returning TEXT as string OR already-parsed
function safeParse(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ── Step 1: Welcome & Name ────────────────────────────────────────────────────
function Step1Welcome({ cohort, response, onNext }) {
  const [name, setName] = React.useState(response.name || '');
  const [role, setRole] = React.useState(response.role || '');
  const [saving, setSaving] = React.useState(false);

  async function handleNext() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch(`/api/responses/${response.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), role: role.trim(), step: 1 })
    });
    setSaving(false);
    onNext({ name: name.trim(), role: role.trim() });
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {/* PCT intro */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
             style={{ background: 'linear-gradient(135deg, #0f766e, #134e4a)' }}>
          <span className="text-white font-bold font-mono-app text-xs tracking-tight">PCT</span>
        </div>
        <h1 className="text-3xl font-display font-light mb-2">{cohort.name}</h1>
        {cohort.sponsor && (
          <p className="text-sm" style={{ color: '#64748b' }}>{cohort.sponsor}</p>
        )}
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Welcome to PCT Catalyst</h2>
            <p className="text-sm" style={{ color: '#64748b' }}>
              This assessment will help you reflect on your leadership across 10 People-Centered Transformation elements.
              It takes about 15–20 minutes.
            </p>
          </div>

          <div className="form-control gap-1">
            <label className="label py-0">
              <span className="label-text font-medium">Your name</span>
            </label>
            <input
              className="input input-bordered w-full"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </div>

          <div className="form-control gap-1">
            <label className="label py-0">
              <span className="label-text font-medium">Your role / title</span>
              <span className="label-text-alt" style={{ color: '#94a3b8' }}>optional</span>
            </label>
            <input
              className="input input-bordered w-full"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Senior Manager, Product Lead"
            />
          </div>

          <button
            className="btn btn-primary w-full mt-2"
            onClick={handleNext}
            disabled={!name.trim() || saving}
          >
            {saving ? <span className="spinner" /> : 'Begin Assessment →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: PCT Framework Introduction ──────────────────────────────────────
function Step2Framework({ cohort, onNext }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-light mb-1">The PCT Framework</h2>
        <p className="text-sm" style={{ color: '#64748b' }}>
          10 elements across 4 quadrants that define People-Centered Transformation leadership.
        </p>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-300 mb-4">
        <div className="card-body">
          <PCTFrameworkPanel />
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-300 mb-6">
        <div className="card-body">
          <ConceptCard
            quote="People-Centered Transformation is the practice of leading change by putting people at the heart of every decision, system, and narrative."
            source="Tony O'Driscoll, Duke University"
          />
        </div>
      </div>

      <button className="btn btn-primary w-full" onClick={onNext}>
        Start Pulse Survey →
      </button>
    </div>
  );
}

// ── Step 3: PCT Pulse Survey (10 Likert questions) ──────────────────────────
function Step3Pulse({ response, onNext }) {
  const [scores, setScores] = React.useState(() => {
    const s = safeParse(response.scores, []);
    return s.length === 10 ? s : Array(10).fill(null);
  });
  const [saving, setSaving] = React.useState(false);

  const answered = scores.filter(s => s !== null).length;
  const allDone  = answered === 10;

  function setScore(idx, val) {
    const next = [...scores];
    next[idx] = val;
    setScores(next);
    // Auto-save silently
    fetch(`/api/responses/${response.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: next })
    });
  }

  async function handleNext() {
    if (!allDone) return;
    setSaving(true);
    await fetch(`/api/responses/${response.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores, step: 3 })
    });
    setSaving(false);
    onNext({ scores });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-light">PCT Pulse Survey</h2>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Rate how true each statement is for your organisation's leaders.
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono-app font-bold text-lg" style={{ color: '#0f766e' }}>
            {answered}/10
          </span>
          <p className="text-xs" style={{ color: '#94a3b8' }}>answered</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <progress className="progress progress-primary w-full h-1.5" value={answered} max={10} />
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 mb-6">
        {PCT_ELEMENTS.map((el, i) => {
          const quadrantClass = `badge-${el.quadrant.toLowerCase()}`;
          return (
            <div
              key={el.n}
              className="card bg-base-100 shadow-sm border"
              style={{
                borderColor: scores[i] !== null
                  ? 'oklch(41.8% 0.093 172.9)'
                  : 'oklch(90% 0.009 248)',
                borderLeftWidth: scores[i] !== null ? '3px' : '1px',
              }}
            >
              <div className="card-body py-4 gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase mb-0.5" style={{ color: '#ef4444' }}>
                      PCT {el.n}
                    </p>
                    <h3 className="font-semibold text-base leading-snug">{el.title}</h3>
                  </div>
                  <span className={`badge badge-sm shrink-0 ${quadrantClass}`}>
                    {el.quadrant}
                  </span>
                </div>

                {el.statement && (
                  <p className="text-sm italic leading-relaxed" style={{ color: '#475569' }}>
                    "{el.statement}"
                  </p>
                )}

                {/* Likert */}
                <div>
                  <div className="likert-grid">
                    {[1,2,3,4,5,6,7].map(v => (
                      <button
                        key={v}
                        className={`likert-btn ${scores[i] === v ? 'selected' : ''}`}
                        onClick={() => setScore(i, v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1.5 px-0.5">
                    <span className="text-xs" style={{ color: '#94a3b8' }}>Strongly Disagree</span>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>Strongly Agree</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={handleNext}
        disabled={!allDone || saving}
      >
        {saving ? <span className="spinner" /> : `Continue → Select Priority Element`}
      </button>
      {!allDone && (
        <p className="text-xs text-center mt-2" style={{ color: '#94a3b8' }}>
          {10 - answered} more {10 - answered === 1 ? 'answer' : 'answers'} needed
        </p>
      )}
    </div>
  );
}

// ── Step 4: Select Priority Element ─────────────────────────────────────────
function Step4Priority({ response, onNext }) {
  const [priority, setPriority] = React.useState(
    response.priority !== null && response.priority !== undefined ? response.priority : null
  );
  const [saving, setSaving] = React.useState(false);

  const quadrantOrder = ['ASPIRATION', 'ALIGNMENT', 'AUTONOMY', 'ACCOUNTABILITY'];
  const quadrantColors = {
    ASPIRATION:     '#1e40af',
    ALIGNMENT:      '#6d28d9',
    AUTONOMY:       '#c2410c',
    ACCOUNTABILITY: '#065f46',
  };
  const quadrantClasses = {
    ASPIRATION:     'badge-aspiration',
    ALIGNMENT:      'badge-alignment',
    AUTONOMY:       'badge-autonomy',
    ACCOUNTABILITY: 'badge-accountability',
  };

  async function handleNext() {
    if (priority === null) return;
    setSaving(true);
    await fetch(`/api/responses/${response.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority, step: 4 })
    });
    setSaving(false);
    onNext({ priority });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-light mb-1">Choose Your Priority Element</h2>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Which one PCT element do you most want to focus on for your leadership growth?
        </p>
      </div>

      {quadrantOrder.map(q => {
        const els = PCT_ELEMENTS.filter(e => e.quadrant === q);
        return (
          <div key={q} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge badge-sm ${quadrantClasses[q]}`}>{q}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {els.map(el => (
                <div
                  key={el.n}
                  className={`priority-card ${priority === el.n - 1 ? 'selected' : ''}`}
                  onClick={() => setPriority(el.n - 1)}
                >
                  <p className="text-xs font-bold tracking-widest uppercase mb-1"
                     style={{ color: quadrantColors[q] }}>
                    PCT {el.n}
                  </p>
                  <p className="font-semibold text-sm leading-snug">{el.title}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button
        className="btn btn-primary w-full mt-2"
        onClick={handleNext}
        disabled={priority === null || saving}
      >
        {saving ? <span className="spinner" /> : 'Continue → Rank Shifts →'}
      </button>
    </div>
  );
}

// ── Step 5: Rank the Shifts ──────────────────────────────────────────────────
function Step5Rank({ response, onNext }) {
  const priority   = response.priority;
  const priorityEl = PCT_ELEMENTS[priority];

  const [ranking, setRanking] = React.useState(() => {
    const r = safeParse(response.ranking, []);
    return r.length > 0 ? r : priorityEl.shifts.map((_, i) => i);
  });

  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  function handleDragStart(i) { setDragIdx(i); }
  function handleDragOver(e, i) { e.preventDefault(); setOverIdx(i); }
  function handleDrop(e, targetI) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetI) return;
    const next = [...ranking];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetI, 0, moved);
    setRanking(next);
    setDragIdx(null);
    setOverIdx(null);
  }

  async function handleNext() {
    setSaving(true);
    await fetch(`/api/responses/${response.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ranking, step: 5 })
    });
    setSaving(false);
    onNext({ ranking });
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={`badge badge-sm badge-${priorityEl.quadrant.toLowerCase()}`}>
            {priorityEl.quadrant}
          </span>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ef4444' }}>
            PCT {priorityEl.n}
          </span>
        </div>
        <h2 className="text-2xl font-display font-light mb-1">Rank Your Shifts</h2>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Drag to rank the shifts for <strong>{priorityEl.title}</strong> — most important first.
        </p>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        {ranking.map((shiftIdx, rank) => {
          const shift = priorityEl.shifts[shiftIdx];
          if (!shift) return null;
          return (
            <div
              key={shiftIdx}
              draggable
              onDragStart={() => handleDragStart(rank)}
              onDragOver={e => handleDragOver(e, rank)}
              onDrop={e => handleDrop(e, rank)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              className={`rank-item ${overIdx === rank ? 'drag-over' : ''}`}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: '#fee2e2', color: '#dc2626' }}
              >
                {rank + 1}
              </span>
              <span className="text-xl shrink-0" style={{ color: '#94a3b8', cursor: 'grab' }}>⠿</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{shift.label}</p>
                {shift.description && (
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: '#64748b' }}>
                    {shift.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary w-full" onClick={handleNext} disabled={saving}>
        {saving ? <span className="spinner" /> : 'Continue → Commit to Action →'}
      </button>
    </div>
  );
}

// ── Step 5b: Activators (for top-ranked shift) ──────────────────────────────
function Step5bActivators({ response, onNext }) {
  const priority   = response.priority;
  const priorityEl = PCT_ELEMENTS[priority];
  const ranking    = safeParse(response.ranking, []);
  const topShiftIdx = ranking[0];
  const topShift   = priorityEl && topShiftIdx !== undefined
    ? priorityEl.shifts[topShiftIdx]
    : null;

  const [activators, setActivators] = React.useState(() => {
    const a = safeParse(response.activators, {});
    const key = String(topShiftIdx);
    return a[key] || { moreOf: ['', '', ''], better: '', differently: '', completeWhen: '', owner: '', due: '' };
  });
  const [saving, setSaving] = React.useState(false);

  function setField(field, value) {
    setActivators(prev => ({ ...prev, [field]: value }));
  }

  function setMoreOf(idx, value) {
    const next = [...(activators.moreOf || ['', '', ''])];
    next[idx] = value;
    setActivators(prev => ({ ...prev, moreOf: next }));
  }

  async function handleNext() {
    setSaving(true);
    const existing = safeParse(response.activators, {});
    const updated  = { ...existing, [String(topShiftIdx)]: activators };
    await fetch(`/api/responses/${response.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activators: updated, step: 5 })
    });
    setSaving(false);
    onNext({ activators: updated });
  }

  const isValid = activators.completeWhen && activators.completeWhen.trim();

  if (!topShift) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <p className="text-sm" style={{ color: '#94a3b8' }}>No shift selected. Please go back.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-light mb-1">Commit to Action</h2>
        <p className="text-sm mb-3" style={{ color: '#64748b' }}>
          Your top shift: Define what you'll do differently.
        </p>
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body py-3 px-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: '#ef4444' }}>
              Top Shift
            </p>
            <p className="font-semibold">{topShift.label}</p>
            {topShift.description && (
              <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{topShift.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* More of */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body gap-3">
            <div className="rounded-lg px-3 py-2" style={{ background: '#fee2e2' }}>
              <p className="text-sm font-bold" style={{ color: '#dc2626' }}>I will do MORE of…</p>
            </div>
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-mono-app font-bold w-5 text-center shrink-0"
                      style={{ color: '#94a3b8' }}>{i + 1}</span>
                <input
                  className="input input-bordered input-sm flex-1"
                  value={(activators.moreOf || ['', '', ''])[i]}
                  onChange={e => setMoreOf(i, e.target.value)}
                  placeholder={`Action ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Better & Differently */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body gap-3">
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text font-semibold text-sm">I will do this BETTER by…</span>
              </label>
              <textarea
                className="textarea textarea-bordered resize-none"
                rows={2}
                value={activators.better || ''}
                onChange={e => setField('better', e.target.value)}
                placeholder="Describe what 'better' looks like for you"
              />
            </div>
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text font-semibold text-sm">I will do this DIFFERENTLY by…</span>
              </label>
              <textarea
                className="textarea textarea-bordered resize-none"
                rows={2}
                value={activators.differently || ''}
                onChange={e => setField('differently', e.target.value)}
                placeholder="What will change in your approach?"
              />
            </div>
          </div>
        </div>

        {/* Complete when */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body gap-3">
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text font-semibold text-sm">
                  I'll know I've succeeded when… <span className="text-error">*</span>
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered resize-none"
                rows={2}
                value={activators.completeWhen || ''}
                onChange={e => setField('completeWhen', e.target.value)}
                placeholder="Define your success criteria"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control gap-1">
                <label className="label py-0">
                  <span className="label-text text-sm">Owner</span>
                </label>
                <input
                  className="input input-bordered input-sm"
                  value={activators.owner || ''}
                  onChange={e => setField('owner', e.target.value)}
                  placeholder="Who is accountable?"
                />
              </div>
              <div className="form-control gap-1">
                <label className="label py-0">
                  <span className="label-text text-sm">Due date</span>
                </label>
                <input
                  className="input input-bordered input-sm"
                  type="date"
                  value={activators.due || ''}
                  onChange={e => setField('due', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary w-full mt-6"
        onClick={handleNext}
        disabled={!isValid || saving}
      >
        {saving ? <span className="spinner" /> : 'Review My Summary →'}
      </button>
    </div>
  );
}

// ── Step 6: Summary & AI Analysis ───────────────────────────────────────────
function Step6Summary({ response, cohort, onRestart }) {
  const scores     = safeParse(response.scores, []);
  const ranking    = safeParse(response.ranking, []);
  const activators = safeParse(response.activators, {});
  const priority   = response.priority;
  const priorityEl = (priority !== null && priority !== undefined) ? PCT_ELEMENTS[priority] : null;

  const [submitted, setSubmitted]     = React.useState(!!response.submitted_at);
  const [radarData, setRadarData]     = React.useState(null);
  const [aiSummary, setAiSummary]     = React.useState(() => safeParse(response.ai_summary, null));
  const [aiLoading, setAiLoading]     = React.useState(false);
  const [aiAvailable, setAiAvailable] = React.useState(null);

  const avg = scores.length
    ? (scores.filter(Boolean).reduce((a, b) => a + b, 0) / scores.filter(Boolean).length).toFixed(1)
    : null;

  React.useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(d => setAiAvailable(!!d.available));
  }, []);

  // Auto-trigger AI after submission (per individual response)
  React.useEffect(() => {
    if (aiAvailable === true && submitted && !aiSummary && !aiLoading) {
      triggerAI();
    }
  }, [aiAvailable, submitted]);

  async function handleSubmit() {
    await fetch(`/api/responses/${response.id}/submit`, { method: 'POST' });
    setSubmitted(true);
    // Fetch cohort radar data
    const r = await fetch(`/api/cohorts/${cohort.id}/radar`);
    const d = await r.json();
    if (d.released && d.data) setRadarData(d.data);
  }

  async function triggerAI() {
    setAiLoading(true);
    const r = await fetch(`/api/responses/${response.id}/analyze`, { method: 'POST' });
    const d = await r.json();
    setAiLoading(false);
    if (!d.error) setAiSummary(d);
  }

  const topShiftIdx = ranking.length > 0 ? ranking[0] : null;
  const topShift    = priorityEl && topShiftIdx !== null ? priorityEl.shifts[topShiftIdx] : null;
  const topActivator = topShiftIdx !== null ? (activators[String(topShiftIdx)] || {}) : {};

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-light">Your PCT Summary</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            {response.name} · {cohort.name}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>
          🖨 Print
        </button>
      </div>

      {/* Radar card */}
      <div className="card bg-base-100 shadow-sm border border-base-300 mb-4">
        <div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">PCT Pulse Radar</h3>
            {avg && (
              <span className="font-mono-app font-bold text-sm" style={{ color: '#0f766e' }}>
                Overall avg: {avg}/7
              </span>
            )}
          </div>
          <div style={{ minHeight: 460 }}>
            <RadarChart
              scores={scores}
              cohortScores={radarData}
              showCohort={!!radarData}
            />
          </div>
        </div>
      </div>

      {/* Scores breakdown */}
      {scores.length === 10 && (
        <div className="card bg-base-100 shadow-sm border border-base-300 mb-4">
          <div className="card-body">
            <h3 className="font-semibold mb-3">Score Breakdown</h3>
            <div className="flex flex-col gap-2">
              {PCT_ELEMENTS.map((el, i) => (
                <div key={el.n} className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono-app w-12 shrink-0" style={{ color: '#0f766e' }}>
                    PCT {el.n}
                  </span>
                  <span className="text-sm flex-1 text-ellipsis overflow-hidden whitespace-nowrap"
                        style={{ color: '#334155' }}>
                    {el.title}
                  </span>
                  <div className="score-bar" style={{ width: 100, flexShrink: 0 }}>
                    <div className="score-bar-fill" style={{ width: `${((scores[i] || 0) / 7) * 100}%` }} />
                  </div>
                  <span className="font-mono-app font-bold text-sm w-8 text-right shrink-0"
                        style={{ color: '#0f766e' }}>
                    {scores[i] ?? '–'}/7
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Priority + activators */}
      {priorityEl && (
        <div className="card bg-base-100 shadow-sm border border-base-300 mb-4">
          <div className="card-body gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#64748b' }}>
                Priority Element
              </p>
              <div className="flex items-center gap-2">
                <span className={`badge badge-sm badge-${priorityEl.quadrant.toLowerCase()}`}>
                  {priorityEl.quadrant}
                </span>
                <span className="font-semibold">PCT {priorityEl.n} — {priorityEl.title}</span>
              </div>
            </div>

            {topShift && (
              <div>
                <p className="text-xs font-bold tracking-widest uppercase mb-1.5" style={{ color: '#64748b' }}>
                  Top Ranked Shift
                </p>
                <div className="rounded-lg px-3 py-2.5" style={{ background: '#fee2e2' }}>
                  <p className="font-semibold text-sm" style={{ color: '#dc2626' }}>
                    {topShift.label}
                  </p>
                </div>

                {topActivator.completeWhen && (
                  <div className="mt-2.5 pl-3 border-l-2" style={{ borderColor: '#0f766e' }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-0.5"
                       style={{ color: '#64748b' }}>
                      Success looks like:
                    </p>
                    <p className="text-sm italic" style={{ color: '#334155' }}>
                      {topActivator.completeWhen}
                    </p>
                    {topActivator.due && (
                      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                        Due: {topActivator.due}
                        {topActivator.owner ? ` · Owner: ${topActivator.owner}` : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit / AI */}
      {!submitted ? (
        <button className="btn btn-primary w-full mb-4" onClick={handleSubmit}>
          Submit My Assessment ✓
        </button>
      ) : (
        <div className="alert alert-success mb-4">
          <span>✓ Assessment submitted successfully</span>
        </div>
      )}

      {/* AI Card */}
      {submitted && (
        <div className="mb-6">
          {aiLoading && (
            <div className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body items-center gap-3 py-10">
                <span className="spinner spinner-lg" />
                <p className="text-sm" style={{ color: '#64748b' }}>
                  Generating your personalised AI analysis…
                </p>
              </div>
            </div>
          )}
          {!aiLoading && aiSummary && (
            <AISummaryDisplay summary={aiSummary} />
          )}
          {!aiLoading && !aiSummary && aiAvailable === false && (
            <div className="alert alert-warning">
              <span>AI analysis is not available — API key not configured.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Participant App (step orchestrator) ──────────────────────────────────────
function ParticipantApp({ cohortId }) {
  const [cohort,   setCohort]   = React.useState(null);
  const [response, setResponse] = React.useState(null);
  const [step,     setStep]     = React.useState(0);
  const [error,    setError]    = React.useState(null);
  const [loading,  setLoading]  = React.useState(true);

  React.useEffect(() => {
    async function init() {
      try {
        const cr = await fetch(`/api/cohorts/${cohortId}`);
        const cohortData = await cr.json();
        if (cohortData.error) { setError(cohortData.error); setLoading(false); return; }
        setCohort(cohortData);

        // Check localStorage for existing response
        const stored = localStorage.getItem(`pct_response_${cohortId}`);
        if (stored) {
          const r = await fetch(`/api/responses/${stored}`);
          const rd = await r.json();
          if (!rd.error) {
            setResponse(rd);
            setStep(rd.submitted_at ? 6 : rd.step || 0);
            setLoading(false);
            return;
          }
        }

        setLoading(false);
      } catch (e) {
        setError('Unable to load cohort. Please check your connection.');
        setLoading(false);
      }
    }
    init();
  }, [cohortId]);

  async function createResponse() {
    const r = await fetch(`/api/cohorts/${cohortId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await r.json();
    if (data.error) { setError(data.error); return; }
    localStorage.setItem(`pct_response_${cohortId}`, data.id);
    setResponse(data);
    setStep(0);
  }

  function advance(updates) {
    setResponse(prev => ({ ...prev, ...updates }));
    setStep(s => s + 1);
  }

  function advanceTo(s, updates) {
    if (updates) setResponse(prev => ({ ...prev, ...updates }));
    setStep(s);
  }

  if (loading) return (
    <div className="app-loading">
      <span className="spinner spinner-lg" />
      <span className="text-sm" style={{ color: '#94a3b8' }}>Loading…</span>
    </div>
  );

  if (error) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="alert alert-error">{error}</div>
    </div>
  );

  if (!response) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body gap-4 items-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #0f766e, #134e4a)' }}>
              <span className="text-white font-bold font-mono-app text-xs">PCT</span>
            </div>
            <h2 className="text-xl font-semibold">{cohort?.name}</h2>
            {cohort?.description && (
              <p className="text-sm text-center" style={{ color: '#64748b' }}>{cohort.description}</p>
            )}
            <button className="btn btn-primary w-full" onClick={createResponse}>
              Start Assessment →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Steps progress bar
  const STEPS = ['Welcome', 'Framework', 'Pulse', 'Priority', 'Shifts', 'Commit', 'Summary'];

  return (
    <div>
      {/* Step progress (hidden on summary) */}
      {step < 6 && (
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300 shadow-sm no-print">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <ul className="steps steps-horizontal w-full text-xs">
              {STEPS.map((s, i) => (
                <li key={s} className={`step ${i <= step ? 'step-primary' : ''}`}
                    style={{ '--step-content': `"${i + 1}"` }}>
                  <span className="hidden sm:inline">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {step === 0 && <Step1Welcome cohort={cohort} response={response} onNext={d => advance(d)} />}
      {step === 1 && <Step2Framework cohort={cohort} onNext={() => setStep(2)} />}
      {step === 2 && <Step3Pulse response={response} onNext={d => advance(d)} />}
      {step === 3 && <Step4Priority response={response} onNext={d => advance(d)} />}
      {step === 4 && <Step5Rank response={response} onNext={d => advance(d)} />}
      {step === 5 && <Step5bActivators response={response} onNext={d => advance(d)} />}
      {step >= 6 && <Step6Summary response={response} cohort={cohort} onRestart={() => {}} />}
    </div>
  );
}
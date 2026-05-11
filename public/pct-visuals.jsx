// ── PCT Visuals ──────────────────────────────────────────────────────────────

// PCT Framework 4-Quadrant Panel — fully built-in, no image dependency
function PCTFrameworkPanel({ compact }) {
  const quadrants = [
    {
      key: 'ASPIRATION',
      label: 'Aspiration',
      icon: '🎯',
      cls: 'quadrant-aspiration',
      color: '#1e40af',
      elements: PCT_ELEMENTS.filter(e => e.quadrant === 'ASPIRATION')
    },
    {
      key: 'ALIGNMENT',
      label: 'Alignment',
      icon: '🧭',
      cls: 'quadrant-alignment',
      color: '#6d28d9',
      elements: PCT_ELEMENTS.filter(e => e.quadrant === 'ALIGNMENT')
    },
    {
      key: 'AUTONOMY',
      label: 'Autonomy',
      icon: '⚡',
      cls: 'quadrant-autonomy',
      color: '#c2410c',
      elements: PCT_ELEMENTS.filter(e => e.quadrant === 'AUTONOMY')
    },
    {
      key: 'ACCOUNTABILITY',
      label: 'Accountability',
      icon: '🔗',
      cls: 'quadrant-accountability',
      color: '#065f46',
      elements: PCT_ELEMENTS.filter(e => e.quadrant === 'ACCOUNTABILITY')
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 mt-2">
      {quadrants.map(q => (
        <div key={q.key} className={`quadrant-card ${q.cls}`}>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-base">{q.icon}</span>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: q.color }}>
              {q.label}
            </span>
          </div>
          {q.elements.map(el => (
            <div key={el.n} className="flex items-baseline gap-1.5 mb-1.5">
              <span
                className="text-xs font-bold font-mono-app shrink-0"
                style={{ color: q.color, fontSize: '0.6875rem' }}
              >
                PCT {el.n}
              </span>
              <span className="text-xs leading-snug" style={{ color: '#334155' }}>
                {el.title}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Concept card — blockquote style
function ConceptCard({ quote, source, className }) {
  return (
    <div className={`border-l-4 pl-4 py-2 ${className || ''}`}
         style={{ borderColor: '#0f766e', background: 'oklch(97% 0.035 172.9)', borderRadius: '0 6px 6px 0' }}>
      {quote && (
        <p className="font-display italic text-base leading-relaxed" style={{ color: '#0f172a', fontWeight: 300 }}>
          "{quote}"
        </p>
      )}
      {source && (
        <p className="text-xs mt-2 font-semibold tracking-wider uppercase" style={{ color: '#64748b' }}>
          — {source}
        </p>
      )}
    </div>
  );
}

// AI Summary display — used in both participant and admin views
function AISummaryDisplay({ summary, onRegenerate }) {
  if (!summary) return null;

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'oklch(90% 0.009 248)' }}>
      {/* Header */}
      <div className="ai-header">
        <span className="text-lg">✦</span>
        <div>
          <p className="text-xs font-bold tracking-widest uppercase opacity-80">AI Leadership Analysis</p>
          {summary.headline && (
            <p className="font-display text-lg mt-0.5 leading-snug" style={{ fontWeight: 300 }}>
              {summary.headline}
            </p>
          )}
        </div>
      </div>

      {/* Strengths & Development */}
      {(summary.strengths || summary.developmentAreas) && (
        <div className="grid grid-cols-2 gap-4 p-4 border-b" style={{ borderColor: 'oklch(90% 0.009 248)' }}>
          {summary.strengths && summary.strengths.length > 0 && (
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>
                Strengths
              </p>
              {summary.strengths.map((s, i) => (
                <div key={i} className="mb-2 pl-3 border-l-2" style={{ borderColor: '#0f766e' }}>
                  <p className="text-xs font-semibold" style={{ color: '#475569' }}>{s.element}</p>
                  <p className="text-sm mt-0.5 leading-snug" style={{ color: '#334155' }}>{s.insight}</p>
                </div>
              ))}
            </div>
          )}
          {summary.developmentAreas && summary.developmentAreas.length > 0 && (
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>
                Growth Areas
              </p>
              {summary.developmentAreas.map((d, i) => (
                <div key={i} className="mb-2 pl-3 border-l-2" style={{ borderColor: '#ea580c' }}>
                  <p className="text-xs font-semibold" style={{ color: '#475569' }}>{d.element}</p>
                  <p className="text-sm mt-0.5 leading-snug" style={{ color: '#334155' }}>{d.insight}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Priority Insight */}
      {summary.priorityInsight && (
        <div className="p-4 border-b" style={{ borderColor: 'oklch(90% 0.009 248)' }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>
            Priority Focus
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{summary.priorityInsight}</p>
        </div>
      )}

      {/* Coaching Questions */}
      {summary.coachingQuestions && summary.coachingQuestions.length > 0 && (
        <div className="p-4 border-b" style={{ borderColor: 'oklch(90% 0.009 248)' }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>
            Reflection Questions
          </p>
          {summary.coachingQuestions.map((q, i) => (
            <div key={i} className="coaching-quote mb-2">{q}</div>
          ))}
        </div>
      )}

      {/* 90-day plan */}
      {summary.ninetyDayPlan && summary.ninetyDayPlan.length > 0 && (
        <div className="p-4">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#64748b' }}>
            90-Day Action Plan
          </p>
          {summary.ninetyDayPlan.map((item, i) => (
            <div key={i} className="flex gap-3 pb-3 border-b last:border-b-0 last:pb-0"
                 style={{ borderColor: 'oklch(90% 0.009 248)' }}>
              <span className="timeline-period">{item.period || `Week ${(i + 1) * 4}`}</span>
              <p className="text-sm leading-relaxed flex-1" style={{ color: '#334155' }}>
                {item.action || item}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
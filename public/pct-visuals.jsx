// ── PCT PDF Visual Components ─────────────────────────────────
//
// PDFVisual: renders an image from /images/<concept>.png with a
// labelled placeholder fallback if the file is not present.
//
// ConceptCard: displays a key quote or principle from the PCT PDF
// inline in the participant flow at strategic moments.

// Concept metadata — used for fallback labels and alt text
const PDF_CONCEPTS = {
  'framework':           { label: 'PCT Framework', desc: '4-Quadrant Leadership Wheel' },
  'heart-head-hands':    { label: 'Heart · Head · Hands', desc: 'The three dimensions of leadership shift' },
  'mbd':                 { label: 'MBD Activators', desc: 'More Of · Better · Differently' },
  'pulse-intro':         { label: 'PCT Pulse', desc: 'How we measure leadership practice today' },
  'shifts-intro':        { label: 'Leadership Shifts', desc: 'From current to desired behavior' },
  'quadrant-aspiration': { label: 'ASPIRATION', desc: 'PCT 1 & 2' },
  'quadrant-alignment':  { label: 'ALIGNMENT',  desc: 'PCT 3, 4 & 10' },
  'quadrant-autonomy':   { label: 'AUTONOMY',   desc: 'PCT 5 & 6' },
  'quadrant-accountability': { label: 'ACCOUNTABILITY', desc: 'PCT 7, 8 & 9' }
};

function PDFVisual({ concept, style, caption }) {
  const [status, setStatus] = React.useState('loading'); // 'loading' | 'loaded' | 'missing'
  const meta = PDF_CONCEPTS[concept] || { label: concept, desc: '' };

  // Try both .png and .jpg
  const [src, setSrc] = React.useState(`/images/${concept}.png`);

  function handleError() {
    if (src.endsWith('.png')) {
      setSrc(`/images/${concept}.jpg`);
    } else {
      setStatus('missing');
    }
  }

  return (
    <div className="pdf-visual-wrap" style={style}>
      {status !== 'missing' && (
        <img
          src={src}
          alt={meta.label}
          onLoad={() => setStatus('loaded')}
          onError={handleError}
          style={{
            display: status === 'loaded' ? 'block' : 'none',
            width: '100%',
            height: 'auto',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--line)'
          }}
        />
      )}

      {status === 'loading' && (
        <div className="pdf-visual-placeholder">
          <div className="spinner" />
        </div>
      )}

      {status === 'missing' && (
        <div className="pdf-visual-placeholder">
          <div className="pdf-placeholder-icon">📄</div>
          <div className="pdf-placeholder-label">{meta.label}</div>
          {meta.desc && <div className="pdf-placeholder-desc">{meta.desc}</div>}
          <div className="pdf-placeholder-hint">
            Add <code>/public/images/{concept}.png</code> to show this visual
          </div>
        </div>
      )}

      {caption && status === 'loaded' && (
        <p className="pdf-visual-caption">{caption}</p>
      )}
    </div>
  );
}

// ConceptCard: a pull-quote or principle from the PDF, used inline
// in the participant flow at strategic moments.
function ConceptCard({ quote, source, accent, children }) {
  const borderColor = accent || 'var(--red)';
  return (
    <div className="concept-card" style={{ borderLeftColor: borderColor }}>
      {quote && (
        <blockquote className="concept-quote">
          "{quote}"
        </blockquote>
      )}
      {source && (
        <cite className="concept-source">— {source}</cite>
      )}
      {children}
    </div>
  );
}

// PCTFrameworkPanel: shows the PCT framework image + element list,
// used on the home page and as an intro before Step 2.
function PCTFrameworkPanel({ compact }) {
  return (
    <div className={compact ? 'framework-panel-compact' : 'framework-panel'}>
      <PDFVisual
        concept="framework"
        style={{ marginBottom: 16 }}
        caption="The PCT Leadership Framework — 10 elements across 4 quadrants"
      />
      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
          {['ASPIRATION', 'ALIGNMENT', 'AUTONOMY', 'ACCOUNTABILITY'].map(q => {
            const els = PCT_ELEMENTS.filter(e => e.quadrant === q);
            return (
              <div key={q} className={`quadrant-summary q-${q.toLowerCase()}`} style={{ padding: 10, borderRadius: 'var(--radius-sm)' }}>
                <div className="label" style={{ marginBottom: 6 }}>{q}</div>
                {els.map(e => (
                  <div key={e.n} className="small" style={{ marginBottom: 2 }}>
                    <strong>PCT {e.n}</strong> {e.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// MBDIntroPanel: brief visual explanation of MBD before Step 5
function MBDIntroPanel() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      <PDFVisual concept="mbd" style={{ alignSelf: 'start' }} />
      <ConceptCard
        quote="The goal is not to think your way into a new way of acting, but to act your way into a new way of thinking."
        source="PCT Methodology"
      >
        <p className="small muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          MBD Activators turn your chosen shift into a concrete behavioral plan.
          Define what you will do MORE OF, get BETTER at, or do DIFFERENTLY —
          then commit to when you'll know it's complete.
        </p>
      </ConceptCard>
    </div>
  );
}

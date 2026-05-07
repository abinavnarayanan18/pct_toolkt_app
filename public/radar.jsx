// SVG Radar Chart — 10-axis, 7-ring, no library
function RadarChart({ scores, cohortScores, showCohort }) {
  const SIZE = 500;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const RADIUS = 160;
  const RINGS = 7;
  const AXES = 10;
  const LABEL_PAD = 90;

  // Offset so PCT1 is at top (subtract 90deg)
  function polarToXY(index, value, total, radius) {
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    const r = (value / RINGS) * radius;
    return {
      x: CX + r * Math.cos(angle),
      y: CY + r * Math.sin(angle)
    };
  }

  function axisEndXY(index) {
    const angle = (2 * Math.PI * index) / AXES - Math.PI / 2;
    return {
      x: CX + RADIUS * Math.cos(angle),
      y: CY + RADIUS * Math.sin(angle)
    };
  }

  function labelXY(index) {
    const angle = (2 * Math.PI * index) / AXES - Math.PI / 2;
    return {
      x: CX + (RADIUS + LABEL_PAD) * Math.cos(angle),
      y: CY + (RADIUS + LABEL_PAD) * Math.sin(angle),
      angle: (angle * 180 / Math.PI)
    };
  }

  // Quadrant labels at midpoints between axes
  function quadrantLabelPos(axisA, axisB) {
    const midAngle = ((2 * Math.PI * axisA) / AXES + (2 * Math.PI * axisB) / AXES) / 2 - Math.PI / 2;
    const r = RADIUS + 130;
    return { x: CX + r * Math.cos(midAngle), y: CY + r * Math.sin(midAngle) };
  }

  // ASPIRATION: PCT1(0), PCT2(1) → midpoint between 0 and 1
  // ALIGNMENT: PCT3(2), PCT4(3), PCT10(9) → midpoint...
  // AUTONOMY: PCT5(4), PCT6(5)
  // ACCOUNTABILITY: PCT7(6), PCT8(7), PCT9(8)
  const quadrantLabels = [
    { label: 'ASPIRATION', pos: quadrantLabelPos(0, 1), color: '#1565c0' },
    { label: 'AUTONOMY', pos: quadrantLabelPos(4, 5), color: '#e65100' },
    { label: 'ACCOUNTABILITY', pos: quadrantLabelPos(7, 8), color: '#1f6f5c' },
  ];
  // ALIGNMENT spans PCT3,4,10 — label between PCT3(2) and PCT4(3)
  const alignMidAngle = (
    ((2 * Math.PI * 2) / AXES) +
    ((2 * Math.PI * 3) / AXES)
  ) / 2 - Math.PI / 2;
  quadrantLabels.push({
    label: 'ALIGNMENT',
    pos: { x: CX + (RADIUS + 130) * Math.cos(alignMidAngle), y: CY + (RADIUS + 130) * Math.sin(alignMidAngle) },
    color: '#6a1b9a'
  });

  // Build filled polygon from scores
  function buildPolygon(vals) {
    if (!vals || vals.length < AXES) return '';
    return vals.map((v, i) => {
      const pt = polarToXY(i, v || 0, AXES, RADIUS);
      return `${pt.x},${pt.y}`;
    }).join(' ');
  }

  // Word-wrap text at ~16 chars
  function wrapLabel(title) {
    const words = title.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 16 && line) {
        lines.push(line.trim());
        line = w;
      } else {
        line = (line + ' ' + w).trim();
      }
    }
    if (line) lines.push(line.trim());
    return lines;
  }

  const [tooltip, setTooltip] = React.useState(null);

  const viewBox = `0 0 ${SIZE} ${SIZE}`;

  return (
    <div className="radar-wrap" style={{ position: 'relative' }}>
      <svg
        viewBox={viewBox}
        style={{ width: '100%', maxWidth: SIZE, height: 'auto', overflow: 'visible' }}
      >
        {/* Concentric rings */}
        {Array.from({ length: RINGS }, (_, r) => (
          <circle
            key={r}
            cx={CX} cy={CY}
            r={((r + 1) / RINGS) * RADIUS}
            fill="none"
            stroke="var(--line)"
            strokeWidth="1"
          />
        ))}

        {/* Ring value labels (right side) */}
        {Array.from({ length: RINGS }, (_, r) => (
          <text
            key={`rl-${r}`}
            x={CX + 4}
            y={CY - ((r + 1) / RINGS) * RADIUS + 4}
            fontSize="9"
            fill="var(--ink-4)"
            fontFamily="var(--font-mono)"
          >
            {r + 1}
          </text>
        ))}

        {/* Axes */}
        {PCT_ELEMENTS.map((el, i) => {
          const end = axisEndXY(i);
          return (
            <line
              key={i}
              x1={CX} y1={CY}
              x2={end.x} y2={end.y}
              stroke="var(--line)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Quadrant label arcs */}
        {quadrantLabels.map(({ label, pos, color }) => (
          <text
            key={label}
            x={pos.x} y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fontWeight="800"
            letterSpacing="0.06em"
            fill={color}
            fontFamily="var(--font-sans)"
            style={{ textTransform: 'uppercase' }}
          >
            {label}
          </text>
        ))}

        {/* Cohort avg polygon (dashed) */}
        {showCohort && cohortScores && cohortScores.length === AXES && (
          <polygon
            points={buildPolygon(cohortScores)}
            fill="none"
            stroke="var(--ink-4)"
            strokeWidth="1.5"
            strokeDasharray="5,3"
            opacity="0.7"
          />
        )}

        {/* Individual filled polygon */}
        {scores && scores.length === AXES && scores.some(s => s) && (
          <polygon
            points={buildPolygon(scores)}
            fill="var(--accent)"
            fillOpacity="0.15"
            stroke="var(--accent)"
            strokeWidth="2"
          />
        )}

        {/* Dots on vertices + tooltips */}
        {scores && PCT_ELEMENTS.map((el, i) => {
          const val = scores[i];
          if (!val) return null;
          const pt = polarToXY(i, val, AXES, RADIUS);
          return (
            <circle
              key={`dot-${i}`}
              cx={pt.x} cy={pt.y}
              r="5"
              fill="var(--accent)"
              stroke="#fff"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ i, val, x: pt.x, y: pt.y, name: `PCT ${el.n}` })}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* Cohort dots */}
        {showCohort && cohortScores && PCT_ELEMENTS.map((el, i) => {
          const val = cohortScores[i];
          if (!val) return null;
          const pt = polarToXY(i, val, AXES, RADIUS);
          return (
            <circle
              key={`cdot-${i}`}
              cx={pt.x} cy={pt.y}
              r="4"
              fill="var(--ink-4)"
              stroke="#fff"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Axis labels */}
        {PCT_ELEMENTS.map((el, i) => {
          const { x, y } = labelXY(i);
          const lines = [`PCT ${el.n}`, ...wrapLabel(el.title)];
          const lineH = 12;
          const totalH = lines.length * lineH;

          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y - totalH / 2}
              textAnchor="middle"
              fontFamily="var(--font-sans)"
              fontSize="9.5"
              fill="var(--ink-2)"
            >
              {lines.map((ln, li) => (
                <tspan
                  key={li}
                  x={x}
                  dy={li === 0 ? 0 : lineH}
                  fontWeight={li === 0 ? '700' : '400'}
                  fill={li === 0 ? 'var(--accent)' : 'var(--ink-2)'}
                >
                  {ln}
                </tspan>
              ))}
            </text>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 36}
              y={tooltip.y - 30}
              width={72}
              height={22}
              rx={4}
              fill="var(--ink)"
              opacity="0.85"
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 15}
              textAnchor="middle"
              fontSize="10"
              fill="#fff"
              fontFamily="var(--font-mono)"
            >
              {tooltip.name}: {tooltip.val}/7
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      {showCohort && cohortScores && (
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: '.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 3, background: 'var(--accent)', display: 'inline-block', borderRadius: 2 }} />
            You
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 3, background: 'var(--ink-4)', display: 'inline-block', borderRadius: 2, borderTop: '1.5px dashed var(--ink-4)' }} />
            Cohort Avg
          </span>
        </div>
      )}
    </div>
  );
}

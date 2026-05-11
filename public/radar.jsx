// SVG Radar Chart — 10-axis, 7-ring, no library
function RadarChart({ scores, cohortScores, showCohort }) {
  const SIZE = 500;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const RADIUS = 150;
  const RINGS = 7;
  const AXES = 10;
  const LABEL_PAD = 80;

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
    const r = RADIUS + LABEL_PAD;
    return {
      x: CX + r * Math.cos(angle),
      y: CY + r * Math.sin(angle),
    };
  }

  // Quadrant labels placed further out and at midpoint angles
  // ASPIRATION: PCT1(0), PCT2(1)
  // ALIGNMENT: PCT3(2), PCT4(3), PCT10(9)
  // AUTONOMY: PCT5(4), PCT6(5)
  // ACCOUNTABILITY: PCT7(6), PCT8(7), PCT9(8)
  function quadrantAngle(indices) {
    const angles = indices.map(i => (2 * Math.PI * i) / AXES - Math.PI / 2);
    // average angle
    let sum = 0;
    angles.forEach(a => sum += a);
    return sum / angles.length;
  }

  const QLABEL_R = RADIUS + 165;

  const quadrantDefs = [
    { label: 'ASPIRATION',     indices: [0, 1],    color: '#0d47a1' },
    { label: 'ALIGNMENT',      indices: [2, 3, 9], color: '#4a148c' },
    { label: 'AUTONOMY',       indices: [4, 5],    color: '#bf360c' },
    { label: 'ACCOUNTABILITY', indices: [6, 7, 8], color: '#1b5e20' },
  ];

  const quadrantLabels = quadrantDefs.map(q => {
    const angle = quadrantAngle(q.indices);
    return {
      label: q.label,
      color: q.color,
      x: CX + QLABEL_R * Math.cos(angle),
      y: CY + QLABEL_R * Math.sin(angle),
    };
  });

  function buildPolygon(vals) {
    if (!vals || vals.length < AXES) return '';
    return vals.map((v, i) => {
      const pt = polarToXY(i, v || 0, AXES, RADIUS);
      return `${pt.x},${pt.y}`;
    }).join(' ');
  }

  function wrapLabel(title) {
    const words = title.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 14 && line) {
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

  // SVG needs extra space for outer labels — use a larger viewBox
  const VB_PAD = 120;
  const viewBox = `${-VB_PAD} ${-VB_PAD} ${SIZE + VB_PAD * 2} ${SIZE + VB_PAD * 2}`;

  return (
    <div className="radar-wrap">
      <svg
        viewBox={viewBox}
        style={{ width: '100%', maxWidth: 600, height: 'auto', overflow: 'visible' }}
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

        {/* Ring value labels */}
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

        {/* Quadrant labels — outside the ring */}
        {quadrantLabels.map(({ label, x, y, color }) => (
          <text
            key={label}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8.5"
            fontWeight="800"
            letterSpacing="0.07em"
            fill={color}
            fontFamily="var(--font-sans)"
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

        {/* Dots + tooltips */}
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

        {/* Axis labels — PCT number + wrapped title */}
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
              fontSize="9"
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
              x={tooltip.x - 40}
              y={tooltip.y - 32}
              width={80}
              height={22}
              rx={4}
              fill="var(--ink)"
              opacity="0.85"
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 17}
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

      {/* Legend — outside SVG, below the chart */}
      {showCohort && cohortScores && (
        <div style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          marginTop: 12,
          fontSize: '.8125rem',
          color: 'var(--ink-3)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 20, height: 3,
              background: 'var(--accent)',
              display: 'inline-block',
              borderRadius: 2
            }} />
            You
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 20, height: 0,
              display: 'inline-block',
              borderTop: '2px dashed var(--ink-4)'
            }} />
            Cohort Avg
          </span>
        </div>
      )}
    </div>
  );
}
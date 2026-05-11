// ── PCT Pulse Radar — Chart.js implementation ──────────────────────────────
function RadarChart({ scores, cohortScores, showCohort }) {
  const canvasRef = React.useRef(null);
  const chartRef  = React.useRef(null);

  // Multi-line labels for Chart.js
  const labels = PCT_ELEMENTS.map(el => {
    const words = el.title.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 15 && line) {
        lines.push(line.trim());
        line = w;
      } else {
        line = (line + ' ' + w).trim();
      }
    }
    if (line) lines.push(line.trim());
    return [`PCT ${el.n}`, ...lines];
  });

  React.useEffect(() => {
    if (!canvasRef.current) return;
    if (typeof Chart === 'undefined') return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const accentColor = 'oklch(41.8% 0.093 172.9)';
    const accentHex   = '#0f766e';
    const gridColor   = 'rgba(0,0,0,0.07)';
    const tickColor   = 'rgba(0,0,0,0.25)';
    const labelColor  = '#334155';

    const datasets = [
      {
        label: 'You',
        data: scores && scores.length === 10
          ? scores.map(s => s || 0)
          : Array(10).fill(0),
        backgroundColor: 'rgba(15,118,110,0.12)',
        borderColor: accentHex,
        borderWidth: 2.5,
        pointBackgroundColor: accentHex,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ];

    if (showCohort && cohortScores && cohortScores.length === 10) {
      datasets.push({
        label: 'Cohort Avg',
        data: cohortScores.map(s => s || 0),
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(100,116,139,0.55)',
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointBackgroundColor: 'rgba(100,116,139,0.55)',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
      });
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'radar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeInOutQuart' },
        scales: {
          r: {
            min: 0,
            max: 7,
            ticks: {
              stepSize: 1,
              color: tickColor,
              backdropColor: 'transparent',
              font: { size: 10, family: "'JetBrains Mono', monospace" },
              callback: v => v === 0 ? '' : v,
            },
            grid:        { color: gridColor, lineWidth: 1 },
            angleLines:  { color: gridColor, lineWidth: 1.5 },
            pointLabels: {
              color: ctx => {
                // First line of each label (PCT N) is accent colour
                const linesForPoint = labels[ctx.index] || [];
                return accentHex;
              },
              font: ctx => ({
                size: 11,
                weight: '600',
                family: "'Inter', system-ui, sans-serif",
              }),
              padding: 14,
              callback: label => label,
            },
          }
        },
        plugins: {
          legend: {
            display: !!(showCohort && cohortScores && cohortScores.length === 10),
            position: 'bottom',
            labels: {
              color: labelColor,
              font: { size: 12, family: "'Inter', system-ui, sans-serif" },
              padding: 20,
              usePointStyle: true,
              pointStyleWidth: 20,
            }
          },
          tooltip: {
            callbacks: {
              title: ctx => {
                const idx = ctx[0].dataIndex;
                return `PCT ${idx + 1} — ${PCT_ELEMENTS[idx].title}`;
              },
              label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}/7`,
            },
            backgroundColor: 'rgba(15,23,42,0.92)',
            titleFont: { size: 12, weight: '600' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 6,
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [scores, cohortScores, showCohort]);

  const avg = scores && scores.length
    ? (scores.filter(Boolean).reduce((a, b) => a + b, 0) / scores.filter(Boolean).length).toFixed(1)
    : null;

  return (
    <div className="w-full">
      {avg && (
        <div className="flex justify-end mb-2">
          <span className="font-mono-app text-sm font-bold" style={{ color: '#0f766e' }}>
            Overall avg: {avg}/7
          </span>
        </div>
      )}
      <div className="radar-canvas-wrap" style={{ height: 460 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
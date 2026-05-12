// Radar Chart using Chart.js
function RadarChart({ scores, cohortScores, showCohort, orgScores }) {
  // Defensive: fill missing values with 0
  if (!scores || scores.length < 10) {
    console.warn('Radar: scores prop missing or incomplete', scores);
  }
  const safeScores = Array(10).fill(0).map((_, i) =>
    (scores && scores[i] != null && !isNaN(scores[i])) ? scores[i] : 0
  );

  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);
  const hasOrg = orgScores && orgScores.length === 10;

  const labels = PCT_ELEMENTS.map(el => {
    const words = el.title.split(' ');
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
    return [`PCT ${el.n}`, ...lines];
  });

  React.useEffect(() => {
    if (!canvasRef.current) return;
    if (typeof Chart === 'undefined') return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const gridColor   = 'rgba(0,0,0,0.10)';
    const tickColor   = 'rgba(0,0,0,0.30)';
    const labelColor  = '#1A1A1A';
    const redColor    = '#C1361D';
    const greyColor   = '#888888';

    const datasets = [
      {
        label: hasOrg ? 'Leadership' : 'You',
        data: safeScores,
        backgroundColor: 'rgba(193, 54, 29, 0.15)',
        borderColor: redColor,
        borderWidth: 2,
        pointBackgroundColor: redColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ];

    if (hasOrg) {
      const safeOrg = Array(10).fill(0).map((_, i) =>
        (orgScores[i] != null && !isNaN(orgScores[i])) ? orgScores[i] : 0
      );
      datasets.push({
        label: 'Organisational People',
        data: safeOrg,
        backgroundColor: 'rgba(26, 26, 26, 0.08)',
        borderColor: '#1A1A1A',
        borderWidth: 2,
        borderDash: [6, 3],
        pointBackgroundColor: '#1A1A1A',
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
        maintainAspectRatio: true,
        animation: { duration: 600, easing: 'easeInOutQuart' },
        scales: {
          r: {
            min: 0,
            max: 7,
            ticks: {
              stepSize: 1,
              color: tickColor,
              backdropColor: 'transparent',
              font: { size: 10, family: "'Chalkduster', 'Comic Sans MS', cursive" },
              callback: v => v === 0 ? '' : v,
            },
            grid: { color: gridColor, lineWidth: 1 },
            angleLines: { color: gridColor, lineWidth: 1.5 },
            pointLabels: {
              color: labelColor,
              font: {
                size: 11,
                weight: '700',
                family: "'Chalkduster', 'Comic Sans MS', cursive",
              },
              padding: 12,
              callback: function(label) { return label; }
            },
          }
        },
        plugins: {
          legend: {
            display: hasOrg,
            position: 'bottom',
            labels: {
              color: labelColor,
              font: { size: 12, family: "'Chalkduster', 'Comic Sans MS', cursive" },
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
            backgroundColor: 'rgba(26,26,26,0.92)',
            titleFont: { size: 12, weight: '700' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 6,
          }
        }
      }
    });

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [scores, orgScores]);

  const avg = safeScores.filter(Boolean).length
    ? (safeScores.filter(Boolean).reduce((a, b) => a + b, 0) / safeScores.filter(Boolean).length).toFixed(1)
    : null;

  return (
    <div style={{ width: '100%' }}>
      {avg && !hasOrg && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 8,
          fontFamily: "'Chalkduster', 'Comic Sans MS', cursive",
          fontSize: '.875rem',
          color: '#C1361D',
          fontWeight: 700
        }}>
          Overall avg: {avg}/7
        </div>
      )}
      <canvas ref={canvasRef} />
      {hasOrg && (
        <div style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          marginTop: 12,
          fontSize: '.8125rem',
          fontFamily: "'Chalkduster', 'Comic Sans MS', cursive",
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 3, background: '#C1361D', display: 'inline-block', borderRadius: 2 }} />
            Leadership
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 3, background: '#1A1A1A', display: 'inline-block', borderRadius: 2 }} />
            Organisational People
          </span>
        </div>
      )}
    </div>
  );
}

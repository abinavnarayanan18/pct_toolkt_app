// Radar Chart using Chart.js — handles label layout automatically
function RadarChart({ scores, cohortScores, showCohort, orgScores }) {
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);
  const hasOrg = orgScores && orgScores.length === 10;

  const labels = PCT_ELEMENTS.map(el => {
    // Wrap long titles across multiple lines for Chart.js
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

    // Destroy previous instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const tickColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';
    const labelColor = isDark ? '#c8cbc9' : '#3a3f3d';
    const accentColor = '#1f6f5c';
    const amberColor = '#f59e0b';

    const datasets = [
      {
        label: hasOrg ? 'Leadership' : 'You',
        data: scores && scores.length === 10 ? scores.map(s => s || 0) : Array(10).fill(0),
        backgroundColor: 'rgba(31,111,92,0.15)',
        borderColor: accentColor,
        borderWidth: 2.5,
        pointBackgroundColor: accentColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ];

    if (showCohort && cohortScores && cohortScores.length === 10 && !hasOrg) {
      datasets.push({
        label: 'Cohort Avg',
        data: cohortScores.map(s => s || 0),
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(100,100,100,0.5)',
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointBackgroundColor: 'rgba(100,100,100,0.5)',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
      });
    }

    if (hasOrg) {
      datasets.push({
        label: 'Organizational',
        data: orgScores.map(s => s || 0),
        backgroundColor: 'rgba(245,158,11,0.10)',
        borderColor: amberColor,
        borderWidth: 2,
        borderDash: [6, 3],
        pointBackgroundColor: amberColor,
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
              font: { size: 10, family: "'JetBrains Mono', monospace" },
              callback: v => v === 0 ? '' : v,
            },
            grid: {
              color: gridColor,
              lineWidth: 1,
            },
            angleLines: {
              color: gridColor,
              lineWidth: 1.5,
            },
            pointLabels: {
              color: ctx => {
                return ctx.index !== undefined ? accentColor : labelColor;
              },
              font: ctx => {
                return {
                  size: 11,
                  weight: ctx.dataIndex === 0 ? '700' : '400',
                  family: "'Inter', system-ui, sans-serif",
                };
              },
              padding: 12,
              callback: function(label) {
                return label;
              }
            },
          }
        },
        plugins: {
          legend: {
            display: (showCohort && cohortScores && cohortScores.length === 10) || hasOrg,
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
            backgroundColor: 'rgba(26,29,28,0.9)',
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
  }, [scores, cohortScores, showCohort, orgScores]);

  const avg = scores && scores.length
    ? (scores.filter(Boolean).reduce((a, b) => a + b, 0) / scores.filter(Boolean).length).toFixed(1)
    : null;

  return (
    <div style={{ width: '100%' }}>
      {avg && !hasOrg && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: '.875rem',
          color: 'var(--accent)',
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
          fontFamily: 'var(--f-head)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1f6f5c', display: 'inline-block' }} />
            Leadership
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            Organizational
          </span>
        </div>
      )}
    </div>
  );
}

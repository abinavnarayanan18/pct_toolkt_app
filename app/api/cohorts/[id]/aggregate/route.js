import { sql } from '../../../../../lib/pg.js';
import { NextResponse } from 'next/server';

// GET /api/cohorts/:id/aggregate — cohort-level stats for facilitator view
export async function GET(request, { params }) {
  const { id } = await params;

  const { rows: cohorts } = await sql`
    SELECT id, avg_released FROM cohorts WHERE id = ${id}
  `;
  if (!cohorts.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Counts
  const { rows: counts } = await sql`
    SELECT
      COUNT(*)::int                                                  AS total,
      SUM(CASE WHEN submitted_at IS NOT NULL THEN 1 ELSE 0 END)::int AS submitted
    FROM sessions WHERE cohort_id = ${id}
  `;

  // Average scores across submitted sessions with complete 10-element arrays
  const { rows: scoredRows } = await sql`
    SELECT scores FROM sessions
    WHERE cohort_id = ${id}
      AND submitted_at IS NOT NULL
      AND jsonb_array_length(scores) = 10
  `;

  let avg_scores = null;
  if (scoredRows.length) {
    const totals = Array(10).fill(0);
    let valid = 0;
    for (const row of scoredRows) {
      const arr = row.scores;
      if (arr.every(s => s !== null)) {
        for (let i = 0; i < 10; i++) totals[i] += arr[i];
        valid++;
      }
    }
    if (valid > 0) avg_scores = totals.map(t => +(t / valid).toFixed(2));
  }

  // How many participants chose each PCT element as their priority
  const { rows: priorityRows } = await sql`
    SELECT priority, COUNT(*)::int AS cnt
    FROM sessions
    WHERE cohort_id = ${id}
      AND submitted_at IS NOT NULL
      AND priority IS NOT NULL
    GROUP BY priority
    ORDER BY priority
  `;

  const priority_distribution = Object.fromEntries(
    priorityRows.map(r => [r.priority, r.cnt])
  );

  return NextResponse.json({
    released: cohorts[0].avg_released,
    response_count: counts[0].total,
    submitted_count: counts[0].submitted,
    avg_scores,
    priority_distribution,
  });
}

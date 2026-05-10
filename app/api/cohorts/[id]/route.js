import { sql } from '../../../../lib/pg.js';
import { NextResponse } from 'next/server';

// GET /api/cohorts/:id — cohort metadata + response counts
export async function GET(request, { params }) {
  const { id } = await params;

  const { rows } = await sql`
    SELECT
      c.*,
      COUNT(s.id)::int                                                  AS response_count,
      SUM(CASE WHEN s.submitted_at IS NOT NULL THEN 1 ELSE 0 END)::int AS submitted_count
    FROM cohorts c
    LEFT JOIN sessions s ON s.cohort_id = c.id
    WHERE c.id = ${id}
    GROUP BY c.id
  `;

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

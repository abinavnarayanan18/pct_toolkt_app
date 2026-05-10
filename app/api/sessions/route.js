import { sql } from '../../../lib/pg.js';
import { NextResponse } from 'next/server';

// POST /api/sessions — create a new participant session
export async function POST(request) {
  const { cohort_id, name, role } = await request.json();

  if (!cohort_id) {
    return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });
  }

  const { rows: cohorts } = await sql`
    SELECT id, status FROM cohorts WHERE id = ${cohort_id}
  `;
  if (!cohorts.length) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }
  if (cohorts[0].status !== 'open') {
    return NextResponse.json({ error: 'Cohort is closed' }, { status: 403 });
  }

  const { rows } = await sql`
    INSERT INTO sessions (cohort_id, name, role)
    VALUES (${cohort_id}, ${name ?? null}, ${role ?? null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}

import { sql, db } from '../../../../lib/pg.js';
import { NextResponse } from 'next/server';

// GET /api/sessions/:id — retrieve a session
export async function GET(request, { params }) {
  const { id } = await params;
  const { rows } = await sql`SELECT * FROM sessions WHERE id = ${id}`;
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

// PATCH /api/sessions/:id — partial update (step-by-step progress saves)
export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();

  const JSONB = new Set(['scores', 'ranking', 'activators']);
  const ALLOWED = ['name', 'role', 'scores', 'priority', 'ranking', 'activators', 'step'];

  const sets = [];
  const vals = [];
  let i = 1;

  for (const k of ALLOWED) {
    if (k in body) {
      sets.push(`${k} = $${i++}${JSONB.has(k) ? '::jsonb' : ''}`);
      vals.push(JSONB.has(k) ? JSON.stringify(body[k]) : body[k]);
    }
  }

  if (!sets.length) {
    const { rows } = await sql`SELECT * FROM sessions WHERE id = ${id}`;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  }

  sets.push(`updated_at = NOW()`);
  vals.push(id);

  const result = await db.query(
    `UPDATE sessions SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

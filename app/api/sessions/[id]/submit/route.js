import { sql } from '../../../../../lib/pg.js';
import { NextResponse } from 'next/server';

// POST /api/sessions/:id/submit — mark session as submitted
export async function POST(request, { params }) {
  const { id } = await params;

  const { rows } = await sql`
    UPDATE sessions
    SET submitted_at = NOW(), step = 6, updated_at = NOW()
    WHERE id = ${id} AND submitted_at IS NULL
    RETURNING *
  `;

  if (!rows.length) {
    // Either not found or already submitted — check which
    const { rows: existing } = await sql`SELECT id, submitted_at FROM sessions WHERE id = ${id}`;
    if (!existing.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(existing[0]); // already submitted, return as-is
  }

  return NextResponse.json(rows[0]);
}

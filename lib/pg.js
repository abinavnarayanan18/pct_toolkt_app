// Thin re-export so routes import from one place.
// @vercel/postgres reads POSTGRES_URL from the environment automatically.
export { sql, db } from '@vercel/postgres';

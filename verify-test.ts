import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './shared/schema';
import { eq } from 'drizzle-orm';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool, { schema });

async function check() {
    const result = await db.select().from(schema.students).where(eq(schema.students.name, "Antigravity Test Student"));
    console.log('Search result:', JSON.stringify(result, null, 2));
    await pool.end();
}

check().catch(console.error);

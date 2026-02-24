import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './shared/schema';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool, { schema });

async function check() {
    const students = await db.select().from(schema.students);
    console.log('Total students:', students.length);
    const grades = [...new Set(students.map(s => s.grade))];
    console.log('Distinct grades:', grades);

    const g6a = students.filter(s => s.grade === 'Grade 6 A');
    console.log('Students in Grade 6 A:', g6a.length);
    if (g6a.length > 0) {
        console.log('Sample student in G6A:', g6a[0].name);
    }

    const basic6 = students.filter(s => s.grade === 'Basic 6');
    console.log('Students in Basic 6:', basic6.length);

    await pool.end();
}

check().catch(console.error);

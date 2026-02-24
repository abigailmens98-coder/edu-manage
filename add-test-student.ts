import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './shared/schema';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool, { schema });

async function addTest() {
    const students = await db.select().from(schema.students);
    let maxId = 0;
    students.forEach(s => {
        const num = parseInt(s.studentId.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxId) maxId = num;
    });

    const nextId = `S${String(maxId + 1).padStart(3, "0")}`;

    console.log(`Adding student with ID ${nextId} to Grade 6 A...`);

    const [newStudent] = await db.insert(schema.students).values({
        studentId: nextId,
        name: "Antigravity Test Student",
        grade: "Grade 6 A",
        status: "Active",
        attendance: 0
    }).returning();

    console.log('Successfully added:', newStudent);

    await pool.end();
}

addTest().catch(console.error);

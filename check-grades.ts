
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
    console.log("Checking students and grades...");
    const students = await db.query.students.findMany();
    console.log(`Total students: ${students.length}`);

    const grades = new Set(students.map(s => s.grade));
    console.log("Distinct grades found:");
    Array.from(grades).sort().forEach(g => console.log(`- "${g}"`));

    process.exit(0);
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});

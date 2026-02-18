
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
    const username = "demo_teacher";
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Checking for existing user ${username}...`);
    const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.username, username),
    });

    let userId;

    if (existingUser) {
        console.log(`User ${username} already exists. Updating password.`);
        await db.update(schema.users)
            .set({ password: hashedPassword })
            .where(eq(schema.users.id, existingUser.id));
        userId = existingUser.id;
    } else {
        console.log(`Creating user ${username}...`);
        const [newUser] = await db.insert(schema.users).values({
            username,
            password: hashedPassword,
            role: "teacher",
        }).returning();
        userId = newUser.id;
    }

    // manage teacher record
    const existingTeacher = await db.query.teachers.findFirst({
        where: eq(schema.teachers.userId, userId),
    });

    if (!existingTeacher) {
        console.log(`Creating teacher profile...`);
        await db.insert(schema.teachers).values({
            userId: userId,
            name: "Demo Teacher",
            email: "demo@teacher.com",
            teacherId: "DEMO001",
            subject: "General",
        });
    } else {
        console.log(`Teacher profile exists.`);
    }

    console.log(`
  --------------------------------------------------
  Credentials Created/Updated:
  Username: ${username}
  Password: ${password}
  Role: teacher
  --------------------------------------------------
  `);
    process.exit(0);
}

main().catch((err) => {
    console.error("Error creating demo teacher:", err);
    process.exit(1);
});

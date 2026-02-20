import "dotenv/config";
import { storage } from "./server/storage";
import { seedDatabase } from "./server/seed";
import bcrypt from "bcryptjs";

async function diag() {
    try {
        console.log("Checking if admin exists...");
        let user = await storage.getUserByUsername("admin");

        if (!user) {
            console.log("Admin not found, seeding...");
            await seedDatabase();
            user = await storage.getUserByUsername("admin");
        }

        if (user) {
            console.log("✅ Admin user found");
            const valid = await bcrypt.compare("admin123", user.password);
            console.log(`Password "admin123" valid: ${valid}`);
        } else {
            console.log("❌ Admin user STILL NOT found after seeding");
        }

        const teachers = await storage.getTeachers();
        console.log(`Found ${teachers.length} teachers`);
        for (const t of teachers) {
            const u = await storage.getUser(t.userId);
            console.log(`Teacher: ${t.name}, Username: ${u?.username}`);
        }
    } catch (err: any) {
        console.error("Error during diagnostics:", err.message);
    }
    process.exit(0);
}

diag();

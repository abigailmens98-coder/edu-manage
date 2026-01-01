import { storage } from "./storage";
import bcrypt from "bcrypt";

export async function seedDatabase() {
  try {
    console.log("🌱 Setting up database...");

    // Only create admin user - no demo data
    const existingAdmin = await storage.getUserByUsername("admin");
    if (!existingAdmin) {
      const adminPassword = await bcrypt.hash("admin123", 10);
      await storage.createUser({
        username: "admin",
        password: adminPassword,
        role: "admin",
        secretWord: "governance",
      });
      console.log("✅ Admin user created (username: admin, password: admin123)");
    } else {
      console.log("✅ Admin user already exists");
    }

    // Create default subjects if none exist
    const subjects = await storage.getSubjects();
    if (subjects.length === 0) {
      await storage.createSubject({
        subjectId: "SUB001",
        name: "English Language",
        code: "ENG101",
        classLevels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });

      await storage.createSubject({
        subjectId: "SUB002",
        name: "Mathematics",
        code: "MAT101",
        classLevels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });

      await storage.createSubject({
        subjectId: "SUB003",
        name: "Science",
        code: "SCI101",
        classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });

      await storage.createSubject({
        subjectId: "SUB004",
        name: "Social Studies",
        code: "SOC101",
        classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });

      await storage.createSubject({
        subjectId: "SUB005",
        name: "French",
        code: "FRE101",
        classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });

      await storage.createSubject({
        subjectId: "SUB006",
        name: "Religious and Moral Education",
        code: "RME101",
        classLevels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });

      await storage.createSubject({
        subjectId: "SUB007",
        name: "Creative Arts",
        code: "CRA101",
        classLevels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });

      await storage.createSubject({
        subjectId: "SUB008",
        name: "Ghanaian Language (Twi)",
        code: "TWI101",
        classLevels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });

      await storage.createSubject({
        subjectId: "SUB009",
        name: "Information and Communication Technology",
        code: "ICT101",
        classLevels: ["Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });

      console.log("✅ Default subjects created");
    }

    // Create default academic year if none exists
    const years = await storage.getAcademicYears();
    if (years.length === 0) {
      const academicYear = await storage.createAcademicYear({
        year: "2024/2025",
        status: "Active",
        totalDays: 190,
      });

      await storage.createAcademicTerm({
        name: "Term 1",
        description: "First academic term",
        status: "Active",
        academicYearId: academicYear.id,
      });

      await storage.createAcademicTerm({
        name: "Term 2",
        description: "Second academic term",
        status: "Inactive",
        academicYearId: academicYear.id,
      });

      await storage.createAcademicTerm({
        name: "Term 3",
        description: "Third academic term",
        status: "Inactive",
        academicYearId: academicYear.id,
      });

      console.log("✅ Academic year and terms created");
    }

    console.log("🎉 Database setup completed!");
  } catch (error) {
    console.error("❌ Error setting up database:", error);
  }
}

import { storage } from "./storage";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  try {
    console.log("🌱 Setting up database...");

    // 1. Ensure Admin User
    console.log("🔍 Checking for admin user...");
    const existingAdmin = await storage.getUserByUsername("admin");

    const adminPassword = await bcrypt.hash("admin123", 10);

    if (!existingAdmin) {
      console.log("✨ Admin user not found. Creating new admin user...");
      await storage.createUser({
        username: "admin",
        password: adminPassword,
        role: "admin",
        secretWord: "governance",
      });
      console.log("✅ Admin user created (username: admin, password: admin123)");
    } else {
      console.log(`✅ Admin user found (ID: ${existingAdmin.id}). Overwriting password...`);
      // Use the storage directly to avoid exec retry overhead if it's already switched
      await storage.updateUserPassword(existingAdmin.id, adminPassword);
      console.log(`✅ Admin password overwrite complete.`);
    }

    // 2. Ensure Default Teacher User (teacher_001)
    const teacherPassword = await bcrypt.hash("teacher123", 10);
    const existingTeacher1 = await storage.getUserByUsername("teacher_001");
    if (!existingTeacher1) {
      const teacherUser = await storage.createUser({
        username: "teacher_001",
        password: teacherPassword,
        role: "teacher",
        secretWord: "teaching",
      });

      await storage.createTeacher({
        userId: teacherUser.id,
        teacherId: "T001",
        name: "Default Teacher",
        subject: "General",
        email: "teacher@example.com",
        assignedClass: "Basic 1",
      });

      console.log("✅ Teacher user created (username: teacher_001, password: teacher123)");
    } else {
      await storage.updateUserPassword(existingTeacher1.id, teacherPassword);
      console.log("✅ Teacher user teacher_001 password reset to teacher123");
    }

    // 3. Ensure Sarah Teacher User (sarah@academia.edu)
    const existingSarah = await storage.getUserByUsername("sarah@academia.edu");
    if (!existingSarah) {
      const sarahPassword = await bcrypt.hash("teacher123", 10);
      const sarahUser = await storage.createUser({
        username: "sarah@academia.edu",
        password: sarahPassword,
        role: "teacher",
        secretWord: "teaching",
      });

      await storage.createTeacher({
        userId: sarahUser.id,
        teacherId: "T002",
        name: "Sarah Academia",
        subject: "Science",
        email: "sarah@academia.edu",
        assignedClass: "Basic 2",
      });

      console.log("✅ Sarah teacher user created (username: sarah@academia.edu, password: teacher123)");
    } else {
      const sarahPassword = await bcrypt.hash("teacher123", 10);
      await storage.updateUserPassword(existingSarah.id, sarahPassword);
      console.log("✅ Sarah teacher user password reset to teacher123");
    }


    // 4. Create default subjects if none exist
    const subjects = await storage.getSubjects();
    if (subjects.length === 0) {
      const defaultSubjects = [
        { name: "English Language", code: "ENG101", levels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
        { name: "Mathematics", code: "MAT101", levels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
        { name: "Science", code: "SCI101", levels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
        { name: "Social Studies", code: "SOC101", levels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
        { name: "French", code: "FRE101", levels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
        { name: "Religious and Moral Education", code: "RME101", levels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
        { name: "Creative Arts", code: "CRA101", levels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
        { name: "Ghanaian Language (Twi)", code: "TWI101", levels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
        { name: "Information and Communication Technology", code: "ICT101", levels: ["Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
      ];

      for (let i = 0; i < defaultSubjects.length; i++) {
        const s = defaultSubjects[i];
        await storage.createSubject({
          subjectId: `SUB${(i + 1).toString().padStart(3, '0')}`,
          name: s.name,
          code: s.code,
          classLevels: s.levels,
        });
      }
      console.log("✅ Default subjects created");
    }

    // 5. Create default academic year if none exists
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

    // 5.5. Reset ALL teacher passwords to teacher123 (to ensure legacy teachers can also login)
    const allTeachers = await storage.getTeachers();
    const defaultTeacherPassword = await bcrypt.hash("teacher123", 10);
    for (const teacher of allTeachers) {
      try {
        await storage.updateUserPassword(teacher.userId, defaultTeacherPassword);
      } catch (e) {
        // Ignore if user doesn't exist
      }
    }
    console.log(`✅ Reset passwords for ${allTeachers.length} teacher(s) to teacher123`);

    console.log("🎉 Database setup completed!");
  } catch (error) {
    console.error("❌ Error setting up database:", error);
  }
}

import { storage } from "./storage";
import bcrypt from "bcrypt";

export async function seedDatabase() {
  try {
    console.log("🌱 Seeding database...");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      username: "admin",
      password: adminPassword,
      role: "admin",
      secretWord: "governance",
    });
    console.log("✅ Admin user created (username: admin, password: admin123)");

    // Create demo teacher users
    const teacherPassword = await bcrypt.hash("teacher123", 10);
    
    const teacher1User = await storage.createUser({
      username: "teacher_001",
      password: teacherPassword,
      role: "teacher",
      secretWord: "ghana",
    });

    const teacher2User = await storage.createUser({
      username: "teacher_002",
      password: teacherPassword,
      role: "teacher",
      secretWord: "excellence",
    });

    // Create teacher records
    await storage.createTeacher({
      userId: teacher1User.id,
      teacherId: "T001",
      name: "Dr. Sarah Conner",
      subject: "Physics",
      email: "sarah@academia.edu",
      assignedClass: "Basic 9",
    });

    await storage.createTeacher({
      userId: teacher2User.id,
      teacherId: "T002",
      name: "Prof. Alan Grant",
      subject: "Biology",
      email: "alan@academia.edu",
      assignedClass: "Basic 7",
    });

    console.log("✅ Demo teachers created");

    // Create demo students
    await storage.createStudent({
      studentId: "S001",
      name: "Alice Johnson",
      grade: "Basic 9",
      email: "alice@student.academia.edu",
      status: "Active",
      attendance: 175,
    });

    await storage.createStudent({
      studentId: "S002",
      name: "Bob Smith",
      grade: "Basic 8",
      email: "bob@student.academia.edu",
      status: "Active",
      attendance: 168,
    });

    await storage.createStudent({
      studentId: "S003",
      name: "Charlie Brown",
      grade: "Basic 7",
      email: "charlie@student.academia.edu",
      status: "Active",
      attendance: 155,
    });

    console.log("✅ Demo students created");

    // Create demo subjects
    await storage.createSubject({
      subjectId: "SUB001",
      name: "English Language",
      code: "ENG101",
      classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
    });

    await storage.createSubject({
      subjectId: "SUB002",
      name: "Mathematics",
      code: "MAT101",
      classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
    });

    await storage.createSubject({
      subjectId: "SUB003",
      name: "Science",
      code: "SCI101",
      classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
    });

    console.log("✅ Demo subjects created");

    // Create academic year
    const academicYear = await storage.createAcademicYear({
      year: "2024/2025",
      status: "Active",
      totalDays: 190,
    });

    console.log("✅ Academic year created");

    // Create terms
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

    console.log("✅ Academic terms created");
    console.log("🎉 Database seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

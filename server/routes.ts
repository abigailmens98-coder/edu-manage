import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, isDatabaseAvailable } from "./storage";
import bcrypt from "bcryptjs";
import { insertStudentSchema, insertTeacherSchema, insertSubjectSchema, insertAcademicYearSchema, insertAcademicTermSchema, insertScoreSchema, insertTeacherAssignmentSchema, insertStudentTermDetailsSchema } from "@shared/schema";
import { seedDatabase } from "./seed";
import "./types"; // Import session type declarations

// Check if database needs seeding
let isSeeded = false;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      database: isDatabaseAvailable ? "connected" : "not configured",
      isSeeded,
      timestamp: new Date().toISOString()
    });
  });

  // Debug endpoint (Temporary)
  app.get("/api/debug/auth-check", async (req, res) => {
    try {
      const admin = await storage.getUserByUsername("admin");
      const teachers = await storage.getTeachers();
      const users = await Promise.all(teachers.map(async t => {
        const u = await storage.getUser(t.userId);
        return { username: u?.username, role: u?.role };
      }));

      res.json({
        adminFound: !!admin,
        adminId: admin?.id,
        adminRole: admin?.role,
        teacherCount: teachers.length,
        users,
        isSeeded,
        databaseType: isDatabaseAvailable ? "PostgreSQL" : "In-Memory"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Seed database on first run with error handling
  // Seed database on first run
  if (!isSeeded) {
    try {
      await seedDatabase();
      isSeeded = true;
    } catch (error) {
      console.error('❌ Failed to seed database:', error);
      isSeeded = true;
    }
  }

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username.toLowerCase());

      if (!user) {
        console.log(`❌ Login failure: User NOT FOUND - "${username}"`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log(`🔍 Login attempt: User "${user.username}" (ID: ${user.id}, Role: ${user.role})`);
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        console.log(`❌ Login failure: Incorrect password for user "${username}"`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log(`✅ Login success: "${username}"`);
      // Set session
      req.session.userId = user.id;
      req.session.role = user.role;

      // Get teacher info if user is a teacher
      let teacherInfo = null;
      if (user.role === "teacher") {
        const teachers = await storage.getTeachers();
        teacherInfo = teachers.find(t => t.userId === user.id);
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        teacher: teacherInfo
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // For teachers, also fetch their teacher record
      let teacherInfo = null;
      if (user.role === "teacher") {
        const teachers = await storage.getTeachers();
        teacherInfo = teachers.find(t => t.userId === user.id);
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        teacher: teacherInfo
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Admin cleanup endpoint - removes demo data
  app.post("/api/admin/cleanup-demo-data", async (req, res) => {
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const result = await storage.cleanupDemoData();
      res.json({
        message: "Demo data cleaned up successfully",
        ...result
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup demo data" });
    }
  });

  // Admin Password Reset
  app.post("/api/admin/teachers/:id/reset-password", async (req, res) => {
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const teacherId = req.params.id;
      const { password } = req.body;

      if (!password || password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }

      const teacher = await storage.getTeacher(teacherId);
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(teacher.userId, hashedPassword);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Students API
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // Get unique class levels from students
  app.get("/api/students/class-levels", async (req, res) => {
    try {
      const students = await storage.getStudents();
      const classLevels = Array.from(new Set(students.map(s => s.grade).filter(Boolean)));
      // Sort class levels naturally
      classLevels.sort((a, b) => {
        const orderA = a.startsWith("KG") ? 0 : 1;
        const orderB = b.startsWith("KG") ? 0 : 1;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b, undefined, { numeric: true });
      });
      res.json(classLevels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch class levels" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const validated = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validated);
      res.status(201).json(student);
    } catch (error) {
      res.status(400).json({ error: "Invalid student data" });
    }
  });

  app.patch("/api/students/:id", async (req, res) => {
    try {
      const student = await storage.updateStudent(req.params.id, req.body);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(400).json({ error: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      await storage.deleteStudent(req.params.id);
      res.json({ message: "Student deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  // Delete all students in a class level (admin only)
  app.delete("/api/students/class/:classLevel", async (req, res) => {
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const classLevel = decodeURIComponent(req.params.classLevel);
      const students = await storage.getStudents();
      const classStudents = students.filter(s => s.grade === classLevel);

      let deletedCount = 0;
      for (const student of classStudents) {
        await storage.deleteStudent(student.id);
        deletedCount++;
      }

      res.json({ message: `Deleted ${deletedCount} students from ${classLevel}`, count: deletedCount });
    } catch (error) {
      console.error("Delete class error:", error);
      res.status(500).json({ error: "Failed to delete class" });
    }
  });

  // Student Term Details API
  app.get("/api/students/:studentId/term-details", async (req, res) => {
    try {
      const { termId } = req.query;
      if (!termId) {
        return res.status(400).json({ error: "Term ID is required" });
      }

      const details = await storage.getStudentTermDetails(req.params.studentId, termId as string);
      res.json(details || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student details" });
    }
  });

  app.post("/api/students/:studentId/term-details", async (req, res) => {
    try {
      // Verify teacher or admin
      if (!req.session.userId || (req.session.role !== "admin" && req.session.role !== "teacher")) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const validated = insertStudentTermDetailsSchema.parse(req.body);

      // If teacher, verify they are assigned to this student's class (optional strictly, but good practice)
      // For now, relying on the fact that they can only access the UI for their class

      const details = await storage.createOrUpdateStudentTermDetails(validated);
      res.json(details);
    } catch (error) {
      console.error("Save details error:", error);
      res.status(400).json({ error: "Invalid details data" });
    }
  });

  // Teachers API
  app.get("/api/teachers", async (req, res) => {
    try {
      const teachers = await storage.getTeachers();
      // Enrich teachers with usernames from users table
      const teachersWithUsernames = await Promise.all(
        teachers.map(async (teacher) => {
          const user = await storage.getUser(teacher.userId);
          return {
            ...teacher,
            username: user?.username || "",
          };
        })
      );
      res.json(teachersWithUsernames);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teachers" });
    }
  });

  app.post("/api/teachers", async (req, res) => {
    try {
      const { name, subject, email, assignedClass, username, password, secretWord } = req.body;

      // Create user account - use a default password if not provided
      const passwordToUse = password || "teacher123";
      const hashedPassword = await bcrypt.hash(passwordToUse, 10);
      const user = await storage.createUser({
        username: username || `teacher_${Date.now()}`,
        password: hashedPassword,
        role: "teacher",
        secretWord: secretWord || "",
      });

      // Generate teacher ID
      const teachers = await storage.getTeachers();
      const teacherId = `T${String(teachers.length + 1).padStart(3, "0")}`;

      // Create teacher record
      const teacher = await storage.createTeacher({
        userId: user.id,
        teacherId,
        name: name || "New Teacher",
        subject: subject || "General",
        email: email || "",
        assignedClass: assignedClass || "",
      });

      res.status(201).json(teacher);
    } catch (error: any) {
      console.error("Create teacher error:", error);
      // Return specific error messages based on the actual error
      let errorMessage = "Failed to create teacher";
      if (error?.code === "23505") {
        // PostgreSQL unique constraint violation
        if (error?.detail?.includes("username")) {
          errorMessage = "Username already exists. Please choose a different username.";
        } else if (error?.detail?.includes("email")) {
          errorMessage = "Email already exists.";
        } else {
          errorMessage = "A record with this information already exists.";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      res.status(400).json({ error: errorMessage });
    }
  });

  app.patch("/api/teachers/:id", async (req, res) => {
    try {
      const teacher = await storage.updateTeacher(req.params.id, req.body);
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }
      res.json(teacher);
    } catch (error) {
      res.status(400).json({ error: "Failed to update teacher" });
    }
  });

  app.delete("/api/teachers/:id", async (req, res) => {
    try {
      await storage.deleteTeacher(req.params.id);
      res.json({ message: "Teacher deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete teacher" });
    }
  });

  // Teacher Assignments API
  app.get("/api/teacher-assignments", async (req, res) => {
    try {
      const { teacherId } = req.query;
      if (teacherId) {
        const assignments = await storage.getTeacherAssignmentsByTeacher(teacherId as string);
        res.json(assignments);
      } else {
        const assignments = await storage.getTeacherAssignments();
        res.json(assignments);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teacher assignments" });
    }
  });

  app.post("/api/teacher-assignments", async (req, res) => {
    try {
      const validated = insertTeacherAssignmentSchema.parse(req.body);
      const assignment = await storage.createTeacherAssignment(validated);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ error: "Invalid assignment data" });
    }
  });

  app.post("/api/teacher-assignments/bulk", async (req, res) => {
    try {
      const { teacherId, assignments } = req.body;

      // Delete existing assignments for this teacher
      await storage.deleteTeacherAssignmentsByTeacher(teacherId);

      // Create new assignments
      const created = [];
      for (const assignment of assignments) {
        const newAssignment = await storage.createTeacherAssignment({
          teacherId,
          subjectId: assignment.subjectId,
          classLevel: assignment.classLevel,
          isClassTeacher: assignment.isClassTeacher || false,
        });
        created.push(newAssignment);
      }

      res.status(201).json(created);
    } catch (error) {
      console.error("Bulk assignment error:", error);
      res.status(400).json({ error: "Failed to create assignments" });
    }
  });

  app.delete("/api/teacher-assignments/:id", async (req, res) => {
    try {
      await storage.deleteTeacherAssignment(req.params.id);
      res.json({ message: "Assignment deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Teacher-scoped student and score endpoints
  app.get("/api/teachers/:id/students", async (req, res) => {
    try {
      const teacherId = req.params.id;
      const { classLevel } = req.query;

      // Verify the logged-in user owns this teacher record
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const teacher = await storage.getTeacher(teacherId);
      if (!teacher || teacher.userId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to access this teacher's data" });
      }

      // Get teacher's assignments
      const assignments = await storage.getTeacherAssignmentsByTeacher(teacherId);

      if (assignments.length === 0) {
        // Fallback: get teacher's assigned class from teacher record
        if (teacher?.assignedClass) {
          const students = await storage.getStudents();
          const filtered = students.filter(s => s.grade === teacher.assignedClass);
          return res.json(filtered);
        }
        return res.json([]);
      }

      // Get unique class levels from assignments
      const allowedClasses = Array.from(new Set(assignments.map(a => a.classLevel)));

      // Filter by specific class if provided
      if (classLevel && !allowedClasses.includes(classLevel as string)) {
        return res.status(403).json({ error: "Not authorized for this class" });
      }

      const students = await storage.getStudents();
      const targetClasses = classLevel ? [classLevel as string] : allowedClasses;
      const filtered = students.filter(s => targetClasses.includes(s.grade));

      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  app.get("/api/teachers/:id/scores", async (req, res) => {
    try {
      const teacherId = req.params.id;
      const { termId, classLevel, subjectId } = req.query;

      // Verify authentication
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const teacher = await storage.getTeacher(teacherId);
      if (!teacher || teacher.userId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (!termId || !classLevel || !subjectId) {
        return res.status(400).json({ error: "termId, classLevel, and subjectId are required" });
      }

      // Verify teacher has access to this class/subject
      const assignments = await storage.getTeacherAssignmentsByTeacher(teacherId);

      const hasAccess = assignments.some(
        a => a.classLevel === classLevel && a.subjectId === subjectId
      );

      if (!hasAccess && assignments.length > 0) {
        return res.status(403).json({ error: "Not authorized for this class/subject" });
      }

      // Get students in the authorized class only
      const students = await storage.getStudents();
      const classStudents = students.filter(s => s.grade === classLevel);

      // Get scores for this term, filtered to authorized students and subject
      const allScores = await storage.getScoresByTerm(termId as string);
      const studentIds = classStudents.map(s => s.id);
      const relevantScores = allScores.filter(score =>
        studentIds.includes(score.studentId) && score.subjectId === subjectId
      );

      res.json(relevantScores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scores" });
    }
  });

  app.post("/api/teachers/:id/scores", async (req, res) => {
    try {
      const teacherId = req.params.id;
      const { studentId, subjectId, termId, classScore, examScore } = req.body;

      // Verify authentication
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const teacher = await storage.getTeacher(teacherId);
      if (!teacher || teacher.userId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Verify teacher authorization for this class/subject
      const assignments = await storage.getTeacherAssignmentsByTeacher(teacherId);
      const student = await storage.getStudent(studentId);

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Check if teacher is assigned to this student's class and subject
      const hasAccess = assignments.some(
        a => a.classLevel === student.grade && a.subjectId === subjectId
      );

      if (!hasAccess && assignments.length > 0) {
        return res.status(403).json({ error: "Not authorized to grade this student/subject" });
      }

      // Check if score already exists
      const existingScores = await storage.getScoresByTerm(termId);
      const existing = existingScores.find(
        s => s.studentId === studentId && s.subjectId === subjectId
      );

      const scoreData = {
        studentId,
        subjectId,
        termId,
        classScore: classScore || 0,
        examScore: examScore || 0,
        totalScore: (classScore || 0) + (examScore || 0),
      };

      let result;
      if (existing) {
        result = await storage.updateScore(existing.id, scoreData);
      } else {
        result = await storage.createScore(scoreData);
      }

      res.json(result);
    } catch (error) {
      console.error("Save score error:", error);
      res.status(500).json({ error: "Failed to save score" });
    }
  });

  // Subjects API
  app.get("/api/subjects", async (req, res) => {
    try {
      const subjects = await storage.getSubjects();
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  });

  app.post("/api/subjects", async (req, res) => {
    try {
      const validated = insertSubjectSchema.parse(req.body);
      const subject = await storage.createSubject(validated);
      res.status(201).json(subject);
    } catch (error) {
      res.status(400).json({ error: "Invalid subject data" });
    }
  });

  app.patch("/api/subjects/:id", async (req, res) => {
    try {
      const subject = await storage.updateSubject(req.params.id, req.body);
      if (!subject) {
        return res.status(404).json({ error: "Subject not found" });
      }
      res.json(subject);
    } catch (error) {
      res.status(400).json({ error: "Failed to update subject" });
    }
  });

  app.delete("/api/subjects/:id", async (req, res) => {
    try {
      await storage.deleteSubject(req.params.id);
      res.json({ message: "Subject deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete subject" });
    }
  });

  // Academic Years API
  app.get("/api/academic-years", async (req, res) => {
    try {
      const years = await storage.getAcademicYears();
      res.json(years);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch academic years" });
    }
  });

  app.get("/api/academic-years/active", async (req, res) => {
    try {
      const year = await storage.getActiveAcademicYear();
      res.json(year || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active academic year" });
    }
  });

  app.post("/api/academic-years", async (req, res) => {
    try {
      const validated = insertAcademicYearSchema.parse(req.body);
      const year = await storage.createAcademicYear(validated);
      res.status(201).json(year);
    } catch (error) {
      res.status(400).json({ error: "Invalid academic year data" });
    }
  });

  app.patch("/api/academic-years/:id", async (req, res) => {
    try {
      const year = await storage.updateAcademicYear(req.params.id, req.body);
      if (!year) {
        return res.status(404).json({ error: "Academic year not found" });
      }
      res.json(year);
    } catch (error) {
      res.status(400).json({ error: "Failed to update academic year" });
    }
  });

  app.post("/api/academic-years/:id/set-active", async (req, res) => {
    try {
      const year = await storage.setActiveAcademicYear(req.params.id);
      if (!year) {
        return res.status(404).json({ error: "Academic year not found" });
      }
      res.json(year);
    } catch (error) {
      res.status(400).json({ error: "Failed to set active academic year" });
    }
  });

  app.delete("/api/academic-years/:id", async (req, res) => {
    try {
      await storage.deleteAcademicYear(req.params.id);
      res.json({ message: "Academic year deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete academic year" });
    }
  });

  // Academic Terms API
  app.get("/api/academic-terms", async (req, res) => {
    try {
      const { yearId } = req.query;
      let terms;
      if (yearId) {
        terms = await storage.getAcademicTermsByYear(yearId as string);
      } else {
        terms = await storage.getAcademicTerms();
      }
      res.json(terms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch academic terms" });
    }
  });

  app.get("/api/academic-terms/active", async (req, res) => {
    try {
      const term = await storage.getActiveAcademicTerm();
      res.json(term || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active academic term" });
    }
  });

  app.post("/api/academic-terms", async (req, res) => {
    try {
      const validated = insertAcademicTermSchema.parse(req.body);
      const term = await storage.createAcademicTerm(validated);
      res.status(201).json(term);
    } catch (error) {
      res.status(400).json({ error: "Invalid academic term data" });
    }
  });

  app.patch("/api/academic-terms/:id", async (req, res) => {
    try {
      const term = await storage.updateAcademicTerm(req.params.id, req.body);
      if (!term) {
        return res.status(404).json({ error: "Academic term not found" });
      }
      res.json(term);
    } catch (error) {
      res.status(400).json({ error: "Failed to update academic term" });
    }
  });

  app.post("/api/academic-terms/:id/set-active", async (req, res) => {
    try {
      const term = await storage.setActiveAcademicTerm(req.params.id);
      if (!term) {
        return res.status(404).json({ error: "Academic term not found" });
      }
      res.json(term);
    } catch (error) {
      res.status(400).json({ error: "Failed to set active academic term" });
    }
  });

  app.delete("/api/academic-terms/:id", async (req, res) => {
    try {
      await storage.deleteAcademicTerm(req.params.id);
      res.json({ message: "Academic term deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete academic term" });
    }
  });

  // Scores API
  app.get("/api/scores", async (req, res) => {
    try {
      const { studentId, termId } = req.query;

      let scores;
      if (studentId) {
        scores = await storage.getScoresByStudent(studentId as string);
      } else if (termId) {
        scores = await storage.getScoresByTerm(termId as string);
      } else {
        scores = await storage.getScores();
      }

      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scores" });
    }
  });

  app.post("/api/scores", async (req, res) => {
    try {
      const validated = insertScoreSchema.parse(req.body);

      // Calculate total and grade
      const classScore = validated.classScore || 0;
      const examScore = validated.examScore || 0;
      const total = classScore + examScore;
      const scoreData = {
        ...validated,
        classScore,
        examScore,
        totalScore: total,
        enteredBy: req.session.userId,
      };

      const score = await storage.createScore(scoreData);
      res.status(201).json(score);
    } catch (error) {
      console.error("Create score error:", error);
      res.status(400).json({ error: "Invalid score data" });
    }
  });

  app.patch("/api/scores/:id", async (req, res) => {
    try {
      // Recalculate total if scores changed
      const updates = { ...req.body };
      if (updates.classScore !== undefined || updates.examScore !== undefined) {
        const existing = await storage.getScore(req.params.id);
        if (existing) {
          const classScore = updates.classScore ?? existing.classScore;
          const examScore = updates.examScore ?? existing.examScore;
          updates.totalScore = classScore + examScore;
        }
      }

      const score = await storage.updateScore(req.params.id, updates);
      if (!score) {
        return res.status(404).json({ error: "Score not found" });
      }
      res.json(score);
    } catch (error) {
      res.status(400).json({ error: "Failed to update score" });
    }
  });

  // Dashboard Statistics API
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const { termId } = req.query;

      const [students, teachers, subjects, scores, terms] = await Promise.all([
        storage.getStudents(),
        storage.getTeachers(),
        storage.getSubjects(),
        termId ? storage.getScoresByTerm(termId as string) : storage.getScores(),
        storage.getAcademicTerms(),
      ]);

      const activeTerm = terms.find(t => t.status === "Active");
      const activeStudents = students.filter(s => s.status === "Active");

      // Calculate average score across all scores
      const scoresWithValues = scores.filter(s => s.totalScore && s.totalScore > 0);
      const averageScore = scoresWithValues.length > 0
        ? Math.round(scoresWithValues.reduce((sum, s) => sum + (s.totalScore || 0), 0) / scoresWithValues.length)
        : 0;

      // Calculate pass rate (score >= 50 is passing)
      const passCount = scoresWithValues.filter(s => (s.totalScore || 0) >= 50).length;
      const passRate = scoresWithValues.length > 0
        ? Math.round((passCount / scoresWithValues.length) * 100)
        : 0;

      // Calculate attendance rate
      const attendanceRate = students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + (s.attendance || 0), 0) / students.length)
        : 0;

      // Score distribution by grade level
      const scoresByGrade: Record<string, { total: number; count: number }> = {};
      for (const score of scoresWithValues) {
        const student = students.find(s => s.id === score.studentId);
        if (student) {
          const grade = student.grade || "Unknown";
          if (!scoresByGrade[grade]) {
            scoresByGrade[grade] = { total: 0, count: 0 };
          }
          scoresByGrade[grade].total += score.totalScore || 0;
          scoresByGrade[grade].count += 1;
        }
      }

      const gradePerformance = Object.entries(scoresByGrade).map(([grade, data]) => ({
        grade,
        average: Math.round(data.total / data.count),
        count: data.count,
      })).sort((a, b) => {
        const order = ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"];
        return order.indexOf(a.grade) - order.indexOf(b.grade);
      });

      // Subject performance
      const scoresBySubject: Record<string, { total: number; count: number; name: string }> = {};
      for (const score of scoresWithValues) {
        const subject = subjects.find(s => s.id === score.subjectId);
        if (subject) {
          if (!scoresBySubject[score.subjectId]) {
            scoresBySubject[score.subjectId] = { total: 0, count: 0, name: subject.name };
          }
          scoresBySubject[score.subjectId].total += score.totalScore || 0;
          scoresBySubject[score.subjectId].count += 1;
        }
      }

      const subjectPerformance = Object.entries(scoresBySubject).map(([id, data]) => ({
        subjectId: id,
        name: data.name,
        average: Math.round(data.total / data.count),
        count: data.count,
      })).sort((a, b) => b.average - a.average);

      // Top performers
      const studentScores: Record<string, { total: number; count: number; name: string; grade: string }> = {};
      for (const score of scoresWithValues) {
        const student = students.find(s => s.id === score.studentId);
        if (student) {
          if (!studentScores[score.studentId]) {
            studentScores[score.studentId] = { total: 0, count: 0, name: student.name, grade: student.grade || "" };
          }
          studentScores[score.studentId].total += score.totalScore || 0;
          studentScores[score.studentId].count += 1;
        }
      }

      const topPerformers = Object.entries(studentScores)
        .map(([id, data]) => ({
          studentId: id,
          name: data.name,
          grade: data.grade,
          average: Math.round(data.total / data.count),
          totalSubjects: data.count,
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 10);

      res.json({
        overview: {
          totalStudents: students.length,
          activeStudents: activeStudents.length,
          totalTeachers: teachers.length,
          totalSubjects: subjects.length,
          averageScore,
          passRate,
          attendanceRate,
          totalScoresEntered: scoresWithValues.length,
          currentTerm: activeTerm?.name || "Not set",
        },
        gradePerformance,
        subjectPerformance,
        topPerformers,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Teacher Broadsheet Scores
  app.get("/api/teachers/:id/broadsheet-scores", async (req, res) => {
    try {
      const teacherId = req.params.id;
      const { termId, classLevel } = req.query;

      // Verify authentication
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const teacher = await storage.getTeacher(teacherId);
      if (!teacher || teacher.userId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (!termId || !classLevel) {
        return res.status(400).json({ error: "termId and classLevel are required" });
      }

      // Verify teacher has access to this class
      const assignments = await storage.getTeacherAssignmentsByTeacher(teacherId);
      const hasAccess = assignments.some(a => a.classLevel === classLevel);
      if (!hasAccess && assignments.length > 0) {
        return res.status(403).json({ error: "Not authorized for this class" });
      }

      // Get students in the class
      const students = await storage.getStudents();
      const classStudents = students.filter(s => s.grade === classLevel);
      const studentIds = classStudents.map(s => s.id);

      // Get all scores for this term, filtered to class students
      const allScores = await storage.getScoresByTerm(termId as string);
      const relevantScores = allScores.filter(score =>
        studentIds.includes(score.studentId)
      );

      res.json(relevantScores);
    } catch (error) {
      console.error("Broadsheet scores error:", error);
      res.status(500).json({ error: "Failed to fetch broadsheet scores" });
    }
  });

  // Grading Scale Routes
  app.get("/api/grading-scales", async (req, res) => {
    try {
      // Ensure initial scales exist
      await storage.initializeGradingScales();
      const scales = await storage.getGradingScales();
      res.json(scales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch grading scales" });
    }
  });

  app.post("/api/grading-scales", async (req, res) => {
    try {
      const scale = await storage.createGradingScale(req.body);
      res.status(201).json(scale);
    } catch (error) {
      res.status(500).json({ error: "Failed to create grading scale" });
    }
  });

  app.patch("/api/grading-scales/:id", async (req, res) => {
    try {
      const scale = await storage.updateGradingScale(req.params.id, req.body);
      res.json(scale);
    } catch (error) {
      res.status(500).json({ error: "Failed to update grading scale" });
    }
  });

  app.delete("/api/grading-scales/:id", async (req, res) => {
    try {
      await storage.deleteGradingScale(req.params.id);
      res.json({ message: "Grading scale deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete grading scale" });
    }
  });

  // Assessment Config Routes
  app.get("/api/assessment-configs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const configs = await storage.getAssessmentConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Failed to fetch assessment configs:", error);
      res.status(500).json({ error: "Failed to fetch assessment configs" });
    }
  });

  app.patch("/api/assessment-configs/:id", async (req, res) => {
    try {
      if (!req.session.userId || req.session.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const updated = await storage.updateAssessmentConfig(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Config not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to update assessment config:", error);
      res.status(500).json({ error: "Failed to update assessment config" });
    }
  });

  return httpServer;
}

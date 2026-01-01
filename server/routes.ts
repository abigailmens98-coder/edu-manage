import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, isDatabaseAvailable } from "./storage";
import bcrypt from "bcrypt";
import { insertStudentSchema, insertTeacherSchema, insertSubjectSchema, insertAcademicYearSchema, insertAcademicTermSchema, insertScoreSchema, insertTeacherAssignmentSchema } from "@shared/schema";
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
      timestamp: new Date().toISOString()
    });
  });

  // Seed database on first run with error handling
  if (!isSeeded && isDatabaseAvailable) {
    try {
      const user = await storage.getUserByUsername("admin");
      if (!user) {
        await seedDatabase();
      }
      isSeeded = true;
    } catch (error) {
      console.error('❌ Failed to seed database:', error);
      // Continue without seeding - app will still work but admin won't exist
      isSeeded = true;
    }
  } else if (!isDatabaseAvailable) {
    console.warn('⚠️  Database not available - skipping seed');
    isSeeded = true;
  }

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

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

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        } 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
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

  // Teachers API
  app.get("/api/teachers", async (req, res) => {
    try {
      const teachers = await storage.getTeachers();
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teachers" });
    }
  });

  app.post("/api/teachers", async (req, res) => {
    try {
      const { name, subject, email, assignedClass, username, password, secretWord } = req.body;
      
      // Create user account
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: "teacher",
        secretWord,
      });

      // Generate teacher ID
      const teachers = await storage.getTeachers();
      const teacherId = `T${String(teachers.length + 1).padStart(3, "0")}`;

      // Create teacher record
      const teacher = await storage.createTeacher({
        userId: user.id,
        teacherId,
        name,
        subject: subject || "General",
        email,
        assignedClass,
      });

      res.status(201).json(teacher);
    } catch (error) {
      console.error("Create teacher error:", error);
      res.status(400).json({ error: "Failed to create teacher" });
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

  return httpServer;
}

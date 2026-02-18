import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import { randomUUID } from "crypto";
import * as schema from "@shared/schema";
import type {
  User,
  InsertUser,
  Student,
  InsertStudent,
  Teacher,
  InsertTeacher,
  Subject,
  InsertSubject,
  AcademicYear,
  InsertAcademicYear,
  AcademicTerm,
  InsertAcademicTerm,
  Score,
  InsertScore,
  TeacherAssignment,
  InsertTeacherAssignment,
} from "@shared/schema";

// Create database pool with error handling
let pool: pg.Pool | null = null;
let db: any = null;

const isDatabaseAvailable = !!process.env.DATABASE_URL;

if (isDatabaseAvailable) {
  try {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    db = drizzle(pool, { schema });

    // Test connection
    pool.query('SELECT NOW()', (err) => {
      if (err) {
        console.error('❌ Database connection error:', err.message);
      } else {
        console.log('✅ Database connected successfully');
      }
    });
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
} else {
  console.warn('⚠️  DATABASE_URL not set - using in-memory storage');
  console.warn('⚠️  Data will not persist between restarts');
}

export { pool, isDatabaseAvailable };

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Student operations
  getStudents(): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<boolean>;

  // Teacher operations
  getTeachers(): Promise<Teacher[]>;
  getTeacher(id: string): Promise<Teacher | undefined>;
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  updateTeacher(id: string, teacher: Partial<InsertTeacher>): Promise<Teacher | undefined>;
  deleteTeacher(id: string): Promise<boolean>;

  // Subject operations
  getSubjects(): Promise<Subject[]>;
  getSubject(id: string): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: string, subject: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: string): Promise<boolean>;

  // Academic Year operations
  getAcademicYears(): Promise<AcademicYear[]>;
  getAcademicYear(id: string): Promise<AcademicYear | undefined>;
  getActiveAcademicYear(): Promise<AcademicYear | undefined>;
  createAcademicYear(year: InsertAcademicYear): Promise<AcademicYear>;
  updateAcademicYear(id: string, year: Partial<InsertAcademicYear>): Promise<AcademicYear | undefined>;
  setActiveAcademicYear(id: string): Promise<AcademicYear | undefined>;
  deleteAcademicYear(id: string): Promise<boolean>;

  // Academic Term operations
  getAcademicTerms(): Promise<AcademicTerm[]>;
  getAcademicTermsByYear(yearId: string): Promise<AcademicTerm[]>;
  getAcademicTerm(id: string): Promise<AcademicTerm | undefined>;
  getActiveAcademicTerm(): Promise<AcademicTerm | undefined>;
  createAcademicTerm(term: InsertAcademicTerm): Promise<AcademicTerm>;
  updateAcademicTerm(id: string, term: Partial<InsertAcademicTerm>): Promise<AcademicTerm | undefined>;
  setActiveAcademicTerm(id: string): Promise<AcademicTerm | undefined>;
  deleteAcademicTerm(id: string): Promise<boolean>;

  // Score operations
  getScores(): Promise<Score[]>;
  getScoresByStudent(studentId: string): Promise<Score[]>;
  getScoresByTerm(termId: string): Promise<Score[]>;
  getScore(id: string): Promise<Score | undefined>;
  createScore(score: InsertScore): Promise<Score>;
  updateScore(id: string, score: Partial<InsertScore>): Promise<Score | undefined>;
  deleteScore(id: string): Promise<boolean>;

  // Teacher Assignment operations
  getTeacherAssignments(): Promise<TeacherAssignment[]>;
  getTeacherAssignmentsByTeacher(teacherId: string): Promise<TeacherAssignment[]>;
  createTeacherAssignment(assignment: InsertTeacherAssignment): Promise<TeacherAssignment>;
  deleteTeacherAssignment(id: string): Promise<boolean>;
  deleteTeacherAssignmentsByTeacher(teacherId: string): Promise<boolean>;

  // Admin operations
  cleanupDemoData(): Promise<{ teachersDeleted: number; studentsDeleted: number; usersDeleted: number }>;
  deleteUserByUsername(username: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  // Student operations
  async getStudents(): Promise<Student[]> {
    return await db.select().from(schema.students);
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id));
    return student;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db.insert(schema.students).values(insertStudent).returning();
    return student;
  }

  async updateStudent(id: string, studentUpdate: Partial<InsertStudent>): Promise<Student | undefined> {
    const [student] = await db
      .update(schema.students)
      .set(studentUpdate)
      .where(eq(schema.students.id, id))
      .returning();
    return student;
  }

  async deleteStudent(id: string): Promise<boolean> {
    await db.delete(schema.students).where(eq(schema.students.id, id));
    return true;
  }

  // Teacher operations
  async getTeachers(): Promise<Teacher[]> {
    return await db.select().from(schema.teachers);
  }

  async getTeacher(id: string): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(schema.teachers).where(eq(schema.teachers.id, id));
    return teacher;
  }

  async createTeacher(insertTeacher: InsertTeacher): Promise<Teacher> {
    const [teacher] = await db.insert(schema.teachers).values(insertTeacher).returning();
    return teacher;
  }

  async updateTeacher(id: string, teacherUpdate: Partial<InsertTeacher>): Promise<Teacher | undefined> {
    const [teacher] = await db
      .update(schema.teachers)
      .set(teacherUpdate)
      .where(eq(schema.teachers.id, id))
      .returning();
    return teacher;
  }

  async deleteTeacher(id: string): Promise<boolean> {
    await db.delete(schema.teachers).where(eq(schema.teachers.id, id));
    return true;
  }

  // Subject operations
  async getSubjects(): Promise<Subject[]> {
    return await db.select().from(schema.subjects);
  }

  async getSubject(id: string): Promise<Subject | undefined> {
    const [subject] = await db.select().from(schema.subjects).where(eq(schema.subjects.id, id));
    return subject;
  }

  async createSubject(insertSubject: InsertSubject): Promise<Subject> {
    const [subject] = await db.insert(schema.subjects).values(insertSubject).returning();
    return subject;
  }

  async updateSubject(id: string, subjectUpdate: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [subject] = await db
      .update(schema.subjects)
      .set(subjectUpdate)
      .where(eq(schema.subjects.id, id))
      .returning();
    return subject;
  }

  async deleteSubject(id: string): Promise<boolean> {
    await db.delete(schema.subjects).where(eq(schema.subjects.id, id));
    return true;
  }

  // Academic Year operations
  async getAcademicYears(): Promise<AcademicYear[]> {
    return await db.select().from(schema.academicYears);
  }

  async getAcademicYear(id: string): Promise<AcademicYear | undefined> {
    const [year] = await db.select().from(schema.academicYears).where(eq(schema.academicYears.id, id));
    return year;
  }

  async getActiveAcademicYear(): Promise<AcademicYear | undefined> {
    const [year] = await db.select().from(schema.academicYears).where(eq(schema.academicYears.status, "Active"));
    return year;
  }

  async createAcademicYear(insertYear: InsertAcademicYear): Promise<AcademicYear> {
    const [year] = await db.insert(schema.academicYears).values(insertYear).returning();
    return year;
  }

  async updateAcademicYear(id: string, yearUpdate: Partial<InsertAcademicYear>): Promise<AcademicYear | undefined> {
    const [year] = await db
      .update(schema.academicYears)
      .set(yearUpdate)
      .where(eq(schema.academicYears.id, id))
      .returning();
    return year;
  }

  async setActiveAcademicYear(id: string): Promise<AcademicYear | undefined> {
    await db.update(schema.academicYears).set({ status: "Inactive" });
    const [year] = await db
      .update(schema.academicYears)
      .set({ status: "Active" })
      .where(eq(schema.academicYears.id, id))
      .returning();
    return year;
  }

  async deleteAcademicYear(id: string): Promise<boolean> {
    await db.delete(schema.academicYears).where(eq(schema.academicYears.id, id));
    return true;
  }

  // Academic Term operations
  async getAcademicTerms(): Promise<AcademicTerm[]> {
    return await db.select().from(schema.academicTerms);
  }

  async getAcademicTermsByYear(yearId: string): Promise<AcademicTerm[]> {
    return await db.select().from(schema.academicTerms).where(eq(schema.academicTerms.academicYearId, yearId));
  }

  async getAcademicTerm(id: string): Promise<AcademicTerm | undefined> {
    const [term] = await db.select().from(schema.academicTerms).where(eq(schema.academicTerms.id, id));
    return term;
  }

  async getActiveAcademicTerm(): Promise<AcademicTerm | undefined> {
    const [term] = await db.select().from(schema.academicTerms).where(eq(schema.academicTerms.status, "Active"));
    return term;
  }

  async createAcademicTerm(insertTerm: InsertAcademicTerm): Promise<AcademicTerm> {
    const [term] = await db.insert(schema.academicTerms).values(insertTerm).returning();
    return term;
  }

  async updateAcademicTerm(id: string, termUpdate: Partial<InsertAcademicTerm>): Promise<AcademicTerm | undefined> {
    const [term] = await db
      .update(schema.academicTerms)
      .set(termUpdate)
      .where(eq(schema.academicTerms.id, id))
      .returning();
    return term;
  }

  async setActiveAcademicTerm(id: string): Promise<AcademicTerm | undefined> {
    await db.update(schema.academicTerms).set({ status: "Inactive" });
    const [term] = await db
      .update(schema.academicTerms)
      .set({ status: "Active" })
      .where(eq(schema.academicTerms.id, id))
      .returning();
    return term;
  }

  async deleteAcademicTerm(id: string): Promise<boolean> {
    await db.delete(schema.academicTerms).where(eq(schema.academicTerms.id, id));
    return true;
  }

  // Score operations
  async getScores(): Promise<Score[]> {
    return await db.select().from(schema.scores);
  }

  async getScoresByStudent(studentId: string): Promise<Score[]> {
    return await db.select().from(schema.scores).where(eq(schema.scores.studentId, studentId));
  }

  async getScoresByTerm(termId: string): Promise<Score[]> {
    return await db.select().from(schema.scores).where(eq(schema.scores.termId, termId));
  }

  async getScore(id: string): Promise<Score | undefined> {
    const [score] = await db.select().from(schema.scores).where(eq(schema.scores.id, id));
    return score;
  }

  async createScore(insertScore: InsertScore): Promise<Score> {
    const [score] = await db.insert(schema.scores).values(insertScore).returning();
    return score;
  }

  async updateScore(id: string, scoreUpdate: Partial<InsertScore>): Promise<Score | undefined> {
    const [score] = await db
      .update(schema.scores)
      .set({ ...scoreUpdate, updatedAt: new Date() })
      .where(eq(schema.scores.id, id))
      .returning();
    return score;
  }

  async deleteScore(id: string): Promise<boolean> {
    await db.delete(schema.scores).where(eq(schema.scores.id, id));
    return true;
  }

  // Teacher Assignment operations
  async getTeacherAssignments(): Promise<TeacherAssignment[]> {
    return await db.select().from(schema.teacherAssignments);
  }

  async getTeacherAssignmentsByTeacher(teacherId: string): Promise<TeacherAssignment[]> {
    return await db.select().from(schema.teacherAssignments).where(eq(schema.teacherAssignments.teacherId, teacherId));
  }

  async createTeacherAssignment(insertAssignment: InsertTeacherAssignment): Promise<TeacherAssignment> {
    const [assignment] = await db.insert(schema.teacherAssignments).values(insertAssignment).returning();
    return assignment;
  }

  async deleteTeacherAssignment(id: string): Promise<boolean> {
    await db.delete(schema.teacherAssignments).where(eq(schema.teacherAssignments.id, id));
    return true;
  }

  async deleteTeacherAssignmentsByTeacher(teacherId: string): Promise<boolean> {
    await db.delete(schema.teacherAssignments).where(eq(schema.teacherAssignments.teacherId, teacherId));
    return true;
  }

  // Admin operations
  async deleteUserByUsername(username: string): Promise<boolean> {
    await db.delete(schema.users).where(eq(schema.users.username, username));
    return true;
  }

  async cleanupDemoData(): Promise<{ teachersDeleted: number; studentsDeleted: number; usersDeleted: number }> {
    let teachersDeleted = 0;
    let studentsDeleted = 0;
    let usersDeleted = 0;

    // Known demo usernames
    const demoUsernames = ["teacher_001", "teacher_002"];
    const demoStudentIds = ["S001", "S002", "S003"];

    // Delete demo teachers and their users
    for (const username of demoUsernames) {
      const user = await this.getUserByUsername(username);
      if (user) {
        // Find and delete the teacher record
        const teachers = await this.getTeachers();
        const teacher = teachers.find(t => t.userId === user.id);
        if (teacher) {
          // Delete assignments first
          await this.deleteTeacherAssignmentsByTeacher(teacher.id);
          await this.deleteTeacher(teacher.id);
          teachersDeleted++;
        }
        // Delete the user account
        await this.deleteUserByUsername(username);
        usersDeleted++;
      }
    }

    // Delete demo students
    const students = await this.getStudents();
    for (const student of students) {
      if (demoStudentIds.includes(student.studentId)) {
        await this.deleteStudent(student.id);
        studentsDeleted++;
      }
    }

    return { teachersDeleted, studentsDeleted, usersDeleted };
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private students: Map<string, Student>;
  private teachers: Map<string, Teacher>;
  private subjects: Map<string, Subject>;
  private academicYears: Map<string, AcademicYear>;
  private academicTerms: Map<string, AcademicTerm>;
  private scores: Map<string, Score>;
  private teacherAssignments: Map<string, TeacherAssignment>;

  constructor() {
    this.users = new Map();
    this.students = new Map();
    this.teachers = new Map();
    this.subjects = new Map();
    this.academicYears = new Map();
    this.academicTerms = new Map();
    this.scores = new Map();
    this.teacherAssignments = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      role: insertUser.role || "teacher",
      secretWord: insertUser.secretWord || null
    };
    this.users.set(id, user);
    return user;
  }

  // Student operations
  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async getStudent(id: string): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = randomUUID();
    const student: Student = {
      ...insertStudent,
      id,
      createdAt: new Date(),
      attendance: insertStudent.attendance || 0,
      email: insertStudent.email || null,
      status: insertStudent.status || "Active"
    };
    this.students.set(id, student);
    return student;
  }

  async updateStudent(id: string, studentUpdate: Partial<InsertStudent>): Promise<Student | undefined> {
    const student = this.students.get(id);
    if (!student) return undefined;
    const updatedStudent: Student = { ...student, ...studentUpdate };
    // Ensure required fields are not overwritten with undefined
    if (studentUpdate.status !== undefined) updatedStudent.status = studentUpdate.status;
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async deleteStudent(id: string): Promise<boolean> {
    return this.students.delete(id);
  }

  // Teacher operations
  async getTeachers(): Promise<Teacher[]> {
    return Array.from(this.teachers.values());
  }

  async getTeacher(id: string): Promise<Teacher | undefined> {
    return this.teachers.get(id);
  }

  async createTeacher(insertTeacher: InsertTeacher): Promise<Teacher> {
    const id = randomUUID();
    const teacher: Teacher = { ...insertTeacher, id, createdAt: new Date(), subject: insertTeacher.subject || null, email: insertTeacher.email || null, assignedClass: insertTeacher.assignedClass || null };
    this.teachers.set(id, teacher);
    return teacher;
  }

  async updateTeacher(id: string, teacherUpdate: Partial<InsertTeacher>): Promise<Teacher | undefined> {
    const teacher = this.teachers.get(id);
    if (!teacher) return undefined;
    const updatedTeacher: Teacher = { ...teacher, ...teacherUpdate };
    this.teachers.set(id, updatedTeacher);
    return updatedTeacher;
  }

  async deleteTeacher(id: string): Promise<boolean> {
    return this.teachers.delete(id);
  }

  // Subject operations
  async getSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }

  async getSubject(id: string): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }

  async createSubject(insertSubject: InsertSubject): Promise<Subject> {
    const id = randomUUID();
    const subject: Subject = { ...insertSubject, id, createdAt: new Date(), classLevels: insertSubject.classLevels || null };
    this.subjects.set(id, subject);
    return subject;
  }

  async updateSubject(id: string, subjectUpdate: Partial<InsertSubject>): Promise<Subject | undefined> {
    const subject = this.subjects.get(id);
    if (!subject) return undefined;
    const updatedSubject: Subject = { ...subject, ...subjectUpdate };
    this.subjects.set(id, updatedSubject);
    return updatedSubject;
  }

  async deleteSubject(id: string): Promise<boolean> {
    return this.subjects.delete(id);
  }

  // Academic Year operations
  async getAcademicYears(): Promise<AcademicYear[]> {
    return Array.from(this.academicYears.values());
  }

  async getAcademicYear(id: string): Promise<AcademicYear | undefined> {
    return this.academicYears.get(id);
  }

  async getActiveAcademicYear(): Promise<AcademicYear | undefined> {
    return Array.from(this.academicYears.values()).find(
      (year) => year.status === "Active",
    );
  }

  async createAcademicYear(insertYear: InsertAcademicYear): Promise<AcademicYear> {
    const id = randomUUID();
    const year: AcademicYear = {
      ...insertYear,
      id,
      createdAt: new Date(),
      status: insertYear.status || "Inactive",
      totalDays: insertYear.totalDays || 190
    };
    this.academicYears.set(id, year);
    return year;
  }

  async updateAcademicYear(id: string, yearUpdate: Partial<InsertAcademicYear>): Promise<AcademicYear | undefined> {
    const year = this.academicYears.get(id);
    if (!year) return undefined;
    const updatedYear: AcademicYear = { ...year, ...yearUpdate };
    this.academicYears.set(id, updatedYear);
    return updatedYear;
  }

  async setActiveAcademicYear(id: string): Promise<AcademicYear | undefined> {
    const year = this.academicYears.get(id);
    if (!year) return undefined;

    // Deactivate all others
    for (const y of this.academicYears.values()) {
      if (y.status === "Active") {
        this.academicYears.set(y.id, { ...y, status: "Inactive" });
      }
    }

    const updatedYear: AcademicYear = { ...year, status: "Active" };
    this.academicYears.set(id, updatedYear);
    return updatedYear;
  }

  async deleteAcademicYear(id: string): Promise<boolean> {
    return this.academicYears.delete(id);
  }

  // Academic Term operations
  async getAcademicTerms(): Promise<AcademicTerm[]> {
    return Array.from(this.academicTerms.values());
  }

  async getAcademicTermsByYear(yearId: string): Promise<AcademicTerm[]> {
    return Array.from(this.academicTerms.values()).filter(
      (term) => term.academicYearId === yearId,
    );
  }

  async getAcademicTerm(id: string): Promise<AcademicTerm | undefined> {
    return this.academicTerms.get(id);
  }

  async getActiveAcademicTerm(): Promise<AcademicTerm | undefined> {
    return Array.from(this.academicTerms.values()).find(
      (term) => term.status === "Active",
    );
  }

  async createAcademicTerm(insertTerm: InsertAcademicTerm): Promise<AcademicTerm> {
    const id = randomUUID();
    const term: AcademicTerm = {
      ...insertTerm,
      id,
      createdAt: new Date(),
      description: insertTerm.description || null,
      status: insertTerm.status || "Inactive",
      totalAttendanceDays: insertTerm.totalAttendanceDays || 60,
      academicYearId: insertTerm.academicYearId || null
    };
    this.academicTerms.set(id, term);
    return term;
  }

  async updateAcademicTerm(id: string, termUpdate: Partial<InsertAcademicTerm>): Promise<AcademicTerm | undefined> {
    const term = this.academicTerms.get(id);
    if (!term) return undefined;
    const updatedTerm: AcademicTerm = { ...term, ...termUpdate };
    this.academicTerms.set(id, updatedTerm);
    return updatedTerm;
  }

  async setActiveAcademicTerm(id: string): Promise<AcademicTerm | undefined> {
    const term = this.academicTerms.get(id);
    if (!term) return undefined;

    // Deactivate all others
    for (const t of this.academicTerms.values()) {
      if (t.status === "Active") {
        this.academicTerms.set(t.id, { ...t, status: "Inactive" });
      }
    }

    const updatedTerm: AcademicTerm = { ...term, status: "Active" };
    this.academicTerms.set(id, updatedTerm);
    return updatedTerm;
  }

  async deleteAcademicTerm(id: string): Promise<boolean> {
    return this.academicTerms.delete(id);
  }

  // Score operations
  async getScores(): Promise<Score[]> {
    return Array.from(this.scores.values());
  }

  async getScoresByStudent(studentId: string): Promise<Score[]> {
    return Array.from(this.scores.values()).filter(
      (score) => score.studentId === studentId,
    );
  }

  async getScoresByTerm(termId: string): Promise<Score[]> {
    return Array.from(this.scores.values()).filter(
      (score) => score.termId === termId,
    );
  }

  async getScore(id: string): Promise<Score | undefined> {
    return this.scores.get(id);
  }

  async createScore(insertScore: InsertScore): Promise<Score> {
    const id = randomUUID();
    const now = new Date();
    const score: Score = {
      ...insertScore,
      id,
      createdAt: now,
      updatedAt: now,
      classScore: insertScore.classScore || 0,
      examScore: insertScore.examScore || 0,
      totalScore: insertScore.totalScore || 0,
      grade: insertScore.grade || null,
      remarks: insertScore.remarks || null,
      enteredBy: insertScore.enteredBy || null
    };
    this.scores.set(id, score);
    return score;
  }

  async updateScore(id: string, scoreUpdate: Partial<InsertScore>): Promise<Score | undefined> {
    const score = this.scores.get(id);
    if (!score) return undefined;
    const updatedScore: Score = { ...score, ...scoreUpdate, updatedAt: new Date() };
    this.scores.set(id, updatedScore);
    return updatedScore;
  }

  async deleteScore(id: string): Promise<boolean> {
    return this.scores.delete(id);
  }

  // Teacher Assignment operations
  async getTeacherAssignments(): Promise<TeacherAssignment[]> {
    return Array.from(this.teacherAssignments.values());
  }

  async getTeacherAssignmentsByTeacher(teacherId: string): Promise<TeacherAssignment[]> {
    return Array.from(this.teacherAssignments.values()).filter(
      (assignment) => assignment.teacherId === teacherId,
    );
  }

  async createTeacherAssignment(insertAssignment: InsertTeacherAssignment): Promise<TeacherAssignment> {
    const id = randomUUID();
    const assignment: TeacherAssignment = {
      ...insertAssignment,
      id,
      createdAt: new Date(),
      isClassTeacher: insertAssignment.isClassTeacher || false
    };
    this.teacherAssignments.set(id, assignment);
    return assignment;
  }

  async deleteTeacherAssignment(id: string): Promise<boolean> {
    return this.teacherAssignments.delete(id);
  }

  async deleteTeacherAssignmentsByTeacher(teacherId: string): Promise<boolean> {
    const assignments = await this.getTeacherAssignmentsByTeacher(teacherId);
    for (const assignment of assignments) {
      this.teacherAssignments.delete(assignment.id);
    }
    return true;
  }

  // Admin operations
  async deleteUserByUsername(username: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    if (!user) return false;
    return this.users.delete(user.id);
  }

  async cleanupDemoData(): Promise<{ teachersDeleted: number; studentsDeleted: number; usersDeleted: number }> {
    let teachersDeleted = 0;
    let studentsDeleted = 0;
    let usersDeleted = 0;

    // Known demo usernames
    const demoUsernames = ["teacher_001", "teacher_002"];
    const demoStudentIds = ["S001", "S002", "S003"];

    // Delete demo teachers and their users
    for (const username of demoUsernames) {
      const user = await this.getUserByUsername(username);
      if (user) {
        // Find and delete the teacher record
        const teachers = await this.getTeachers();
        const teacher = teachers.find(t => t.userId === user.id);
        if (teacher) {
          // Delete assignments first
          await this.deleteTeacherAssignmentsByTeacher(teacher.id);
          await this.deleteTeacher(teacher.id);
          teachersDeleted++;
        }
        // Delete the user account
        await this.deleteUserByUsername(username);
        usersDeleted++;
      }
    }

    // Delete demo students
    const students = await this.getStudents();
    for (const student of students) {
      if (demoStudentIds.includes(student.studentId)) {
        await this.deleteStudent(student.id);
        studentsDeleted++;
      }
    }

    return { teachersDeleted, studentsDeleted, usersDeleted };
  }
}

export const storage = isDatabaseAvailable ? new DatabaseStorage() : new MemStorage();

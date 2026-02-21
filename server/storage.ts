import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
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

  StudentTermDetails,
  InsertStudentTermDetails,
  GradingScale,
  InsertGradingScale,
  AssessmentConfig,
  InsertAssessmentConfig,
} from "@shared/schema";
import { and } from "drizzle-orm";

// Create database pool with error handling
let pool: pg.Pool | null = null;
let db: any = null;
let databaseSuccessfullyConnected = false;

const rawUrl = process.env.DATABASE_URL || "";

// Strip unsupported parameters that cause connection failures
// channel_binding=require is not supported by node-postgres and silently breaks connections
let cleanedUrl = rawUrl;
if (cleanedUrl.includes("channel_binding")) {
  cleanedUrl = cleanedUrl
    .replace(/[&?]channel_binding=[^&]*/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
  console.log("⚠️  Stripped unsupported 'channel_binding' parameter from DATABASE_URL");
}

const isDatabaseAvailable = !!rawUrl &&
  process.env.FORCE_IN_MEMORY !== "true" &&
  !rawUrl.includes("ENOTFOUND") &&
  !rawUrl.includes("@base") &&
  !rawUrl.startsWith("psql") &&
  !rawUrl.startsWith("'") &&
  rawUrl.includes("://");

if (isDatabaseAvailable) {
  try {
    pool = new pg.Pool({
      connectionString: cleanedUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    db = drizzle(pool, { schema });
  } catch (error) {
    console.error('❌ Failed to initialize database pool:', error);
  }

} else {
  console.warn('⚠️  DATABASE_URL not set or invalid - using in-memory storage');
}

export { pool, isDatabaseAvailable, databaseSuccessfullyConnected };

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

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

  // Grading Scale operations
  getGradingScales(): Promise<GradingScale[]>;
  getGradingScale(id: string): Promise<GradingScale | undefined>;
  createGradingScale(scale: InsertGradingScale): Promise<GradingScale>;
  updateGradingScale(id: string, scale: Partial<InsertGradingScale>): Promise<GradingScale | undefined>;
  deleteGradingScale(id: string): Promise<boolean>;
  initializeGradingScales(): Promise<void>;
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

  // Student Term Details operations
  getStudentTermDetails(studentId: string, termId: string): Promise<StudentTermDetails | undefined>;
  createOrUpdateStudentTermDetails(details: InsertStudentTermDetails): Promise<StudentTermDetails>;

  // User Password Management
  updateUserPassword(userId: string, newPassword: string): Promise<boolean>;

  // Admin operations
  cleanupDemoData(): Promise<{ teachersDeleted: number; studentsDeleted: number; usersDeleted: number }>;
  deleteUserByUsername(username: string): Promise<boolean>;

  // Assessment Config operations
  getAssessmentConfigs(): Promise<AssessmentConfig[]>;
  updateAssessmentConfig(id: string, config: Partial<InsertAssessmentConfig>): Promise<AssessmentConfig | undefined>;
  seedAssessmentConfigs(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.username}) = lower(${username})`);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(schema.users)
      .set(userUpdate)
      .where(eq(schema.users.id, id))
      .returning();
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

  // Grading Scale operations
  async getGradingScales(): Promise<GradingScale[]> {
    return await db.select().from(schema.gradingScales);
  }

  async getGradingScale(id: string): Promise<GradingScale | undefined> {
    const [scale] = await db.select().from(schema.gradingScales).where(eq(schema.gradingScales.id, id));
    return scale;
  }

  async createGradingScale(scale: InsertGradingScale): Promise<GradingScale> {
    const [newScale] = await db.insert(schema.gradingScales).values(scale).returning();
    return newScale;
  }

  async updateGradingScale(id: string, scale: Partial<InsertGradingScale>): Promise<GradingScale | undefined> {
    const [updated] = await db
      .update(schema.gradingScales)
      .set(scale)
      .where(eq(schema.gradingScales.id, id))
      .returning();
    return updated;
  }

  async deleteGradingScale(id: string): Promise<boolean> {
    const [deleted] = await db.delete(schema.gradingScales).where(eq(schema.gradingScales.id, id)).returning();
    return !!deleted;
  }

  // Assessment Config operations
  async getAssessmentConfigs(): Promise<AssessmentConfig[]> {
    return await db.select().from(schema.assessmentConfigs);
  }

  async updateAssessmentConfig(id: string, config: Partial<InsertAssessmentConfig>): Promise<AssessmentConfig | undefined> {
    const [updated] = await db
      .update(schema.assessmentConfigs)
      .set(config)
      .where(eq(schema.assessmentConfigs.id, id))
      .returning();
    return updated;
  }

  async seedAssessmentConfigs(): Promise<void> {
    const existing = await this.getAssessmentConfigs();
    if (existing.length === 0) {
      await db.insert(schema.assessmentConfigs).values([
        {
          classGroup: "Basic 1-6 (Lower/Upper Primary)",
          minClassLevel: 1,
          maxClassLevel: 6,
          classScoreWeight: 50,
          examScoreWeight: 50,
        },
        {
          classGroup: "Basic 7-9 (JHS)",
          minClassLevel: 7,
          maxClassLevel: 9,
          classScoreWeight: 40,
          examScoreWeight: 60,
        },
      ]);
      console.log("Seeded default assessment configurations");
    }
  }

  async initializeGradingScales(): Promise<void> {
    const count = await db.select({ count: sql<number>`count(*)` }).from(schema.gradingScales);
    if (Number(count[0].count) === 0) {
      // Basic 7-9 (JHS) - GES
      const jhsScales = [
        { type: "jhs", minScore: 80, maxScore: 100, grade: "A+", description: "Excellent" },
        { type: "jhs", minScore: 75, maxScore: 79, grade: "A", description: "Very Good" },
        { type: "jhs", minScore: 70, maxScore: 74, grade: "B+", description: "Good" },
        { type: "jhs", minScore: 65, maxScore: 69, grade: "B", description: "Good" },
        { type: "jhs", minScore: 60, maxScore: 64, grade: "C+", description: "Satisfactory" },
        { type: "jhs", minScore: 55, maxScore: 59, grade: "C", description: "Satisfactory" },
        { type: "jhs", minScore: 50, maxScore: 54, grade: "D+", description: "Pass" },
        { type: "jhs", minScore: 45, maxScore: 49, grade: "D", description: "Pass" },
        { type: "jhs", minScore: 40, maxScore: 44, grade: "E", description: "Weak Pass" },
        { type: "jhs", minScore: 0, maxScore: 39, grade: "F", description: "Fail" },
      ];

      // Basic 1-6
      const primaryScales = [
        { type: "primary", minScore: 80, maxScore: 100, grade: "A", description: "Advance" },
        { type: "primary", minScore: 75, maxScore: 79, grade: "P", description: "Proficient" },
        { type: "primary", minScore: 70, maxScore: 74, grade: "AP", description: "Approaching Proficient" },
        { type: "primary", minScore: 65, maxScore: 69, grade: "D", description: "Developing" },
        { type: "primary", minScore: 0, maxScore: 64, grade: "B", description: "Beginning" },
      ];

      for (const s of [...jhsScales, ...primaryScales]) {
        await this.createGradingScale(s);
      }
    }
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
  // Student Term Details operations
  async getStudentTermDetails(studentId: string, termId: string): Promise<StudentTermDetails | undefined> {
    const [details] = await db
      .select()
      .from(schema.studentTermDetails)
      .where(
        and(
          eq(schema.studentTermDetails.studentId, studentId),
          eq(schema.studentTermDetails.termId, termId)
        )
      );
    return details;
  }

  async createOrUpdateStudentTermDetails(insertDetails: InsertStudentTermDetails): Promise<StudentTermDetails> {
    const existing = await this.getStudentTermDetails(insertDetails.studentId, insertDetails.termId);

    if (existing) {
      const [updated] = await db
        .update(schema.studentTermDetails)
        .set({ ...insertDetails, updatedAt: new Date() })
        .where(eq(schema.studentTermDetails.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(schema.studentTermDetails)
        .values(insertDetails)
        .returning();
      return created;
    }
  }

  // Assessment Config operations
  async getAssessmentConfigs(): Promise<AssessmentConfig[]> {
    return await db.select().from(schema.assessmentConfigs);
  }

  async updateAssessmentConfig(id: string, config: Partial<InsertAssessmentConfig>): Promise<AssessmentConfig | undefined> {
    const [updated] = await db
      .update(schema.assessmentConfigs)
      .set({ ...config })
      .where(eq(schema.assessmentConfigs.id, id))
      .returning();
    return updated;
  }

  async seedAssessmentConfigs(): Promise<void> {
    const existing = await this.getAssessmentConfigs();
    if (existing.length > 0) return;

    const defaults: InsertAssessmentConfig[] = [
      {
        classGroup: "Basic 1-6 (Lower/Upper Primary)",
        minClassLevel: 1,
        maxClassLevel: 6,
        classScoreWeight: 50,
        examScoreWeight: 50,
      },
      {
        classGroup: "Basic 7-9 (JHS)",
        minClassLevel: 7,
        maxClassLevel: 9,
        classScoreWeight: 40,
        examScoreWeight: 60,
      },
    ];

    for (const config of defaults) {
      await db.insert(schema.assessmentConfigs).values(config);
    }
  }

  // User Password Management
  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    await db
      .update(schema.users)
      .set({ password: newPassword })
      .where(eq(schema.users.id, userId));
    return true;
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private students: Map<string, Student>;
  private teachers: Map<string, Teacher>;
  private subjects: Map<string, Subject>;
  private academicYears: Map<string, AcademicYear>;
  private academicTerms: Map<string, AcademicTerm>;
  private gradingScales: Map<string, GradingScale>;
  private scores: Map<string, Score>;
  private teacherAssignments: Map<string, TeacherAssignment>;
  private studentTermDetails: Map<string, StudentTermDetails>;
  private assessmentConfigs: Map<string, AssessmentConfig>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.students = new Map();
    this.teachers = new Map();
    this.subjects = new Map();
    this.academicYears = new Map();
    this.academicTerms = new Map();
    this.gradingScales = new Map();
    this.assessmentConfigs = new Map();
    this.scores = new Map();
    this.teacherAssignments = new Map();
    this.studentTermDetails = new Map();
    this.currentId = 1;

    // Seed default assessment configs
    if (this.assessmentConfigs.size === 0) {
      this.seedAssessmentConfigs();
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      role: insertUser.role || "teacher",
      secretWord: insertUser.secretWord || null,
      email: insertUser.email || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...userUpdate };
    this.users.set(id, updated);
    return updated;
  }

  // Student operations
  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  // Grading Scale operations
  async getGradingScales(): Promise<GradingScale[]> {
    return Array.from(this.gradingScales.values());
  }

  async getGradingScale(id: string): Promise<GradingScale | undefined> {
    return this.gradingScales.get(id);
  }

  async createGradingScale(insertScale: InsertGradingScale): Promise<GradingScale> {
    const id = (this.currentId++).toString();
    const scale: GradingScale = { ...insertScale, id, createdAt: new Date() };
    this.gradingScales.set(id, scale);
    return scale;
  }

  async updateGradingScale(id: string, updateScale: Partial<InsertGradingScale>): Promise<GradingScale | undefined> {
    const scale = this.gradingScales.get(id);
    if (!scale) return undefined;
    const updated = { ...scale, ...updateScale };
    this.gradingScales.set(id, updated);
    return updated;
  }

  async deleteGradingScale(id: string): Promise<boolean> {
    return this.gradingScales.delete(id);
  }

  async initializeGradingScales(): Promise<void> {
    // Only initialize if empty
    if (this.gradingScales.size === 0) {
      // Basic 7-9 (JHS) - GES
      const jhsScales = [
        { type: "jhs", minScore: 80, maxScore: 100, grade: "A+", description: "Excellent" },
        { type: "jhs", minScore: 75, maxScore: 79, grade: "A", description: "Very Good" },
        { type: "jhs", minScore: 70, maxScore: 74, grade: "B+", description: "Good" },
        { type: "jhs", minScore: 65, maxScore: 69, grade: "B", description: "Good" },
        { type: "jhs", minScore: 60, maxScore: 64, grade: "C+", description: "Satisfactory" },
        { type: "jhs", minScore: 55, maxScore: 59, grade: "C", description: "Satisfactory" },
        { type: "jhs", minScore: 50, maxScore: 54, grade: "D+", description: "Pass" },
        { type: "jhs", minScore: 45, maxScore: 49, grade: "D", description: "Pass" },
        { type: "jhs", minScore: 40, maxScore: 44, grade: "E", description: "Weak Pass" },
        { type: "jhs", minScore: 0, maxScore: 39, grade: "F", description: "Fail" },
      ];

      // Basic 1-6
      const primaryScales = [
        { type: "primary", minScore: 80, maxScore: 100, grade: "A", description: "Advance" },
        { type: "primary", minScore: 75, maxScore: 79, grade: "P", description: "Proficient" },
        { type: "primary", minScore: 70, maxScore: 74, grade: "AP", description: "Approaching Proficient" },
        { type: "primary", minScore: 65, maxScore: 69, grade: "D", description: "Developing" },
        { type: "primary", minScore: 0, maxScore: 64, grade: "B", description: "Beginning" },
      ];

      [...jhsScales, ...primaryScales].forEach(s => {
        this.createGradingScale(s);
      });
    }
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
    for (const y of Array.from(this.academicYears.values())) {
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
    return Array.from(this.academicTerms.values()).filter(t => t.academicYearId === yearId);
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
    for (const t of Array.from(this.academicTerms.values())) {
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

  // Student Term Details operations
  async getStudentTermDetails(studentId: string, termId: string): Promise<StudentTermDetails | undefined> {
    return Array.from(this.studentTermDetails.values()).find(
      (d) => d.studentId === studentId && d.termId === termId
    );
  }

  async createOrUpdateStudentTermDetails(insertDetails: InsertStudentTermDetails): Promise<StudentTermDetails> {
    const existing = await this.getStudentTermDetails(insertDetails.studentId, insertDetails.termId);

    if (existing) {
      const updated: StudentTermDetails = {
        ...existing,
        ...insertDetails,
        updatedAt: new Date()
      };
      this.studentTermDetails.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const created: StudentTermDetails = {
        ...insertDetails,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        attendance: insertDetails.attendance || 0,
        attendanceTotal: insertDetails.attendanceTotal || 0,
        attitude: insertDetails.attitude || null,
        conduct: insertDetails.conduct || null,
        interest: insertDetails.interest || null,
        classTeacherRemark: insertDetails.classTeacherRemark || null,
        headTeacherRemark: insertDetails.headTeacherRemark || null,
        formMaster: insertDetails.formMaster || null,
        promotedTo: insertDetails.promotedTo || null,
        arrears: insertDetails.arrears || null,
        otherFees: insertDetails.otherFees || null,
        totalBill: insertDetails.totalBill || null,
        nextTermBegins: insertDetails.nextTermBegins || null,
      };
      this.studentTermDetails.set(id, created);
      return created;
    }
  }

  // User Password Management
  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    this.users.set(userId, { ...user, password: newPassword });
    return true;
  }

  // Assessment Config operations
  async getAssessmentConfigs(): Promise<AssessmentConfig[]> {
    return Array.from(this.assessmentConfigs.values());
  }

  async updateAssessmentConfig(id: string, config: Partial<InsertAssessmentConfig>): Promise<AssessmentConfig | undefined> {
    const existing = this.assessmentConfigs.get(id);
    if (!existing) return undefined;

    const updated: AssessmentConfig = { ...existing, ...config };
    this.assessmentConfigs.set(id, updated);
    return updated;
  }

  async seedAssessmentConfigs(): Promise<void> {
    if (this.assessmentConfigs.size > 0) return;

    const defaults: InsertAssessmentConfig[] = [
      {
        classGroup: "Basic 1-6 (Lower/Upper Primary)",
        minClassLevel: 1,
        maxClassLevel: 6,
        classScoreWeight: 50,
        examScoreWeight: 50,
      },
      {
        classGroup: "Basic 7-9 (JHS)",
        minClassLevel: 7,
        maxClassLevel: 9,
        classScoreWeight: 40,
        examScoreWeight: 60,
      },
    ];

    defaults.forEach(c => {
      const id = randomUUID();
      this.assessmentConfigs.set(id, {
        ...c,
        id,
        createdAt: new Date(),
        classScoreWeight: c.classScoreWeight ?? 40,
        examScoreWeight: c.examScoreWeight ?? 60
      });
    });
    console.log("Seeded default assessment configurations (Memory)");
  }
}

// Determine which storage to use. 
// We use a simple object wrapper to allow swapping the implementation at runtime.
class StorageManager implements IStorage {
  private dbStorage: DatabaseStorage | null = null;
  private memStorage: MemStorage;
  private isFallback = false;
  private seeder: (() => Promise<void>) | null = null;
  private isSeeded = false;
  private lastFailingError: string | null = null;

  constructor() {
    this.memStorage = new MemStorage();
    if (isDatabaseAvailable && pool) {
      this.dbStorage = new DatabaseStorage();
      this.testConnection();
    } else {
      this.isFallback = true;
    }
  }

  private async testConnection() {
    if (!pool) return;
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');
      databaseSuccessfullyConnected = true;
      this.isFallback = false;
      this.lastFailingError = null;
    } catch (err: any) {
      this.handleFailure(err);
    }
  }

  async tryReconnect(): Promise<{ success: boolean; error?: string }> {
    if (!pool) return { success: false, error: "No database pool available" };
    try {
      await pool.query('SELECT NOW()');
      console.log('🔄 Database reconnection successful');

      // CRITICAL: Initialize DatabaseStorage if it wasn't created at startup
      if (!this.dbStorage) {
        this.dbStorage = new DatabaseStorage();
      }

      this.isFallback = false;
      databaseSuccessfullyConnected = true;
      this.lastFailingError = null;
      return { success: true };
    } catch (err: any) {
      console.error('❌ Database reconnection failed:', err.message);
      this.lastFailingError = err.message;
      return { success: false, error: err.message };
    }
  }


  private async handleFailure(err: any) {
    if (this.isFallback) return;

    console.error('❌ Database operation failed:', err.message);
    this.lastFailingError = err.message;
    console.warn('🔄 Falling back to in-memory storage immediately.');
    this.isFallback = true;
    databaseSuccessfullyConnected = false;

    if (this.isSeeded && this.seeder) {
      console.log('🌱 Re-seeding memory storage after fallback...');
      try {
        await this.seeder();
        console.log('✅ Re-seeding complete.');
      } catch (seedErr: any) {
        console.error('❌ Failed to re-seed after fallback:', seedErr.message);
      }
    }

    if (err.message.includes('password authentication failed')) {
      console.error('🛑 DATABASE AUTHENTICATION ERROR: Please check your password in the Render dashboard!');
    } else if (err.message.includes('ENOTFOUND')) {
      console.error('🛑 HOSTNAME ERROR: Your DATABASE_URL hostname is invalid or incomplete. Please check for copy-paste errors!');
    }
  }

  setSeeder(seeder: () => Promise<void>) {
    this.seeder = seeder;
  }

  setSeeded(val: boolean) {
    this.isSeeded = val;
  }

  // Wrapper to catch errors and fallback immediately
  private async exec<T>(fn: (storage: IStorage) => Promise<T>): Promise<T> {
    // If in fallback, try to reconnect ONCE more if we have a pool
    if (this.isFallback && pool && !this.lastFailingError?.includes('password')) {
      console.log("🔄 Storage in fallback but pool exists. Attempting proactive recovery...");
      await this.tryReconnect();
    }

    if (!this.isFallback && this.dbStorage) {
      try {
        return await fn(this.dbStorage);
      } catch (err) {
        await this.handleFailure(err);
        return await fn(this.memStorage);
      }
    }
    return await fn(this.memStorage);
  }


  getStorageStatus() {
    return {
      isFallback: this.isFallback,
      isDatabaseAvailable,
      databaseSuccessfullyConnected,
      lastError: this.lastFailingError,
      isSeeded: this.isSeeded
    };
  }

  // Delegate all methods with the exec wrapper
  getUser(id: string) { return this.exec((s) => s.getUser(id)); }
  getUserByUsername(username: string) { return this.exec((s) => s.getUserByUsername(username)); }
  createUser(user: any) { return this.exec((s) => s.createUser(user)); }
  updateUser(id: string, user: any) { return this.exec((s) => s.updateUser(id, user)); }
  getStudents() { return this.exec((s) => s.getStudents()); }
  getStudent(id: string) { return this.exec((s) => s.getStudent(id)); }
  createStudent(student: any) { return this.exec((s) => s.createStudent(student)); }
  updateStudent(id: string, student: any) { return this.exec((s) => s.updateStudent(id, student)); }
  deleteStudent(id: string) { return this.exec((s) => s.deleteStudent(id)); }
  getTeachers() { return this.exec((s) => s.getTeachers()); }
  getTeacher(id: string) { return this.exec((s) => s.getTeacher(id)); }
  createTeacher(teacher: any) { return this.exec((s) => s.createTeacher(teacher)); }
  updateTeacher(id: string, teacher: any) { return this.exec((s) => s.updateTeacher(id, teacher)); }
  deleteTeacher(id: string) { return this.exec((s) => s.deleteTeacher(id)); }
  getSubjects() { return this.exec((s) => s.getSubjects()); }
  getSubject(id: string) { return this.exec((s) => s.getSubject(id)); }
  createSubject(subject: any) { return this.exec((s) => s.createSubject(subject)); }
  updateSubject(id: string, subject: any) { return this.exec((s) => s.updateSubject(id, subject)); }
  deleteSubject(id: string) { return this.exec((s) => s.deleteSubject(id)); }
  getAcademicYears() { return this.exec((s) => s.getAcademicYears()); }
  getAcademicYear(id: string) { return this.exec((s) => s.getAcademicYear(id)); }
  getActiveAcademicYear() { return this.exec((s) => s.getActiveAcademicYear()); }
  createAcademicYear(year: any) { return this.exec((s) => s.createAcademicYear(year)); }
  updateAcademicYear(id: string, year: any) { return this.exec((s) => s.updateAcademicYear(id, year)); }
  setActiveAcademicYear(id: string) { return this.exec((s) => s.setActiveAcademicYear(id)); }
  deleteAcademicYear(id: string) { return this.exec((s) => s.deleteAcademicYear(id)); }
  getAcademicTerms() { return this.exec((s) => s.getAcademicTerms()); }
  getAcademicTermsByYear(id: string) { return this.exec((s) => s.getAcademicTermsByYear(id)); }
  getAcademicTerm(id: string) { return this.exec((s) => s.getAcademicTerm(id)); }
  getActiveAcademicTerm() { return this.exec((s) => s.getActiveAcademicTerm()); }
  createAcademicTerm(term: any) { return this.exec((s) => s.createAcademicTerm(term)); }
  updateAcademicTerm(id: string, term: any) { return this.exec((s) => s.updateAcademicTerm(id, term)); }
  setActiveAcademicTerm(id: string) { return this.exec((s) => s.setActiveAcademicTerm(id)); }
  deleteAcademicTerm(id: string) { return this.exec((s) => s.deleteAcademicTerm(id)); }
  getGradingScales() { return this.exec((s) => s.getGradingScales()); }
  getGradingScale(id: string) { return this.exec((s) => s.getGradingScale(id)); }
  createGradingScale(scale: any) { return this.exec((s) => s.createGradingScale(scale)); }
  updateGradingScale(id: string, scale: any) { return this.exec((s) => s.updateGradingScale(id, scale)); }
  deleteGradingScale(id: string) { return this.exec((s) => s.deleteGradingScale(id)); }
  initializeGradingScales() { return this.exec((s) => s.initializeGradingScales()); }
  getScores() { return this.exec((s) => s.getScores()); }
  getScoresByStudent(id: string) { return this.exec((s) => s.getScoresByStudent(id)); }
  getScoresByTerm(id: string) { return this.exec((s) => s.getScoresByTerm(id)); }
  getScore(id: string) { return this.exec((s) => s.getScore(id)); }
  createScore(score: any) { return this.exec((s) => s.createScore(score)); }
  updateScore(id: string, score: any) { return this.exec((s) => s.updateScore(id, score)); }
  deleteScore(id: string) { return this.exec((s) => s.deleteScore(id)); }
  getTeacherAssignments() { return this.exec((s) => s.getTeacherAssignments()); }
  getTeacherAssignmentsByTeacher(id: string) { return this.exec((s) => s.getTeacherAssignmentsByTeacher(id)); }
  createTeacherAssignment(assign: any) { return this.exec((s) => s.createTeacherAssignment(assign)); }
  deleteTeacherAssignment(id: string) { return this.exec((s) => s.deleteTeacherAssignment(id)); }
  deleteTeacherAssignmentsByTeacher(id: string) { return this.exec((s) => s.deleteTeacherAssignmentsByTeacher(id)); }
  getStudentTermDetails(sid: string, tid: string) { return this.exec((s) => s.getStudentTermDetails(sid, tid)); }
  createOrUpdateStudentTermDetails(details: any) { return this.exec((s) => s.createOrUpdateStudentTermDetails(details)); }
  updateUserPassword(uid: string, pass: string) { return this.exec((s) => s.updateUserPassword(uid, pass)); }

  // Assessment Config operations
  getAssessmentConfigs() { return this.exec((s) => s.getAssessmentConfigs()); }
  updateAssessmentConfig(id: string, config: any) { return this.exec((s) => s.updateAssessmentConfig(id, config)); }
  seedAssessmentConfigs() { return this.exec((s) => s.seedAssessmentConfigs()); }

  cleanupDemoData() { return this.exec((s) => s.cleanupDemoData()); }
  deleteUserByUsername(u: string) { return this.exec((s) => s.deleteUserByUsername(u)); }
}

export const storage = new StorageManager();

import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import pg from "pg";
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
} from "@shared/schema";

// Create database pool with error handling
let pool: pg.Pool;
let db: any;

try {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  db = drizzle(pool, { schema });
  
  // Test connection
  pool.query('SELECT NOW()', (err) => {
    if (err) {
      console.error('Database connection error:', err.message);
    } else {
      console.log('✅ Database connected successfully');
    }
  });
} catch (error) {
  console.error('Failed to initialize database:', error);
  throw error;
}

export { pool };

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
  createAcademicYear(year: InsertAcademicYear): Promise<AcademicYear>;
  updateAcademicYear(id: string, year: Partial<InsertAcademicYear>): Promise<AcademicYear | undefined>;
  deleteAcademicYear(id: string): Promise<boolean>;

  // Academic Term operations
  getAcademicTerms(): Promise<AcademicTerm[]>;
  getAcademicTerm(id: string): Promise<AcademicTerm | undefined>;
  createAcademicTerm(term: InsertAcademicTerm): Promise<AcademicTerm>;
  updateAcademicTerm(id: string, term: Partial<InsertAcademicTerm>): Promise<AcademicTerm | undefined>;
  deleteAcademicTerm(id: string): Promise<boolean>;

  // Score operations
  getScores(): Promise<Score[]>;
  getScoresByStudent(studentId: string): Promise<Score[]>;
  getScoresByTerm(termId: string): Promise<Score[]>;
  getScore(id: string): Promise<Score | undefined>;
  createScore(score: InsertScore): Promise<Score>;
  updateScore(id: string, score: Partial<InsertScore>): Promise<Score | undefined>;
  deleteScore(id: string): Promise<boolean>;
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
    const result = await db.delete(schema.students).where(eq(schema.students.id, id));
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
    const result = await db.delete(schema.teachers).where(eq(schema.teachers.id, id));
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
    const result = await db.delete(schema.subjects).where(eq(schema.subjects.id, id));
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

  async deleteAcademicYear(id: string): Promise<boolean> {
    const result = await db.delete(schema.academicYears).where(eq(schema.academicYears.id, id));
    return true;
  }

  // Academic Term operations
  async getAcademicTerms(): Promise<AcademicTerm[]> {
    return await db.select().from(schema.academicTerms);
  }

  async getAcademicTerm(id: string): Promise<AcademicTerm | undefined> {
    const [term] = await db.select().from(schema.academicTerms).where(eq(schema.academicTerms.id, id));
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

  async deleteAcademicTerm(id: string): Promise<boolean> {
    const result = await db.delete(schema.academicTerms).where(eq(schema.academicTerms.id, id));
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
    const result = await db.delete(schema.scores).where(eq(schema.scores.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();

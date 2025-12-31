import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with roles (admin or teacher)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("teacher"), // "admin" or "teacher"
  secretWord: text("secret_word"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Academic Years
export const academicYears = pgTable("academic_years", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  year: text("year").notNull().unique(), // e.g., "2024/2025"
  status: text("status").notNull().default("Inactive"), // "Active", "Completed", "Inactive"
  totalDays: integer("total_days").notNull().default(190),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAcademicYearSchema = createInsertSchema(academicYears).omit({
  id: true,
  createdAt: true,
});
export type InsertAcademicYear = z.infer<typeof insertAcademicYearSchema>;
export type AcademicYear = typeof academicYears.$inferSelect;

// Academic Terms
export const academicTerms = pgTable("academic_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Term 1", "Term 2", "Term 3"
  description: text("description"),
  status: text("status").notNull().default("Inactive"), // "Active" or "Inactive"
  academicYearId: varchar("academic_year_id").references(() => academicYears.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAcademicTermSchema = createInsertSchema(academicTerms).omit({
  id: true,
  createdAt: true,
});
export type InsertAcademicTerm = z.infer<typeof insertAcademicTermSchema>;
export type AcademicTerm = typeof academicTerms.$inferSelect;

// Students
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: text("student_id").notNull().unique(), // e.g., "S001"
  name: text("name").notNull(),
  grade: text("grade").notNull(), // e.g., "Basic 1", "KG 2"
  email: text("email"),
  status: text("status").notNull().default("Active"), // "Active", "Inactive", "Warning"
  attendance: integer("attendance").default(0), // Whole number of days present
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// Teachers (linked to users)
export const teachers = pgTable("teachers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  teacherId: text("teacher_id").notNull().unique(), // e.g., "T001"
  name: text("name").notNull(),
  subject: text("subject"),
  email: text("email"),
  assignedClass: text("assigned_class"), // e.g., "Basic 1"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeacherSchema = createInsertSchema(teachers).omit({
  id: true,
  createdAt: true,
});
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachers.$inferSelect;

// Subjects
export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subjectId: text("subject_id").notNull().unique(), // e.g., "SUB001"
  name: text("name").notNull(),
  code: text("code").notNull(),
  classLevels: text("class_levels").array(), // Array of class levels this subject applies to
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
});
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

// Scores
export const scores = pgTable("scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  subjectId: varchar("subject_id").references(() => subjects.id).notNull(),
  termId: varchar("term_id").references(() => academicTerms.id).notNull(),
  classScore: integer("class_score").default(0), // Out of 30 or 50
  examScore: integer("exam_score").default(0), // Out of 70 or 50
  totalScore: integer("total_score").default(0), // Computed
  grade: text("grade"), // Computed based on total
  remarks: text("remarks"), // Teacher remarks
  enteredBy: varchar("entered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertScoreSchema = createInsertSchema(scores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scores.$inferSelect;

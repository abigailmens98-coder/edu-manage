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
  academicYearId: varchar("academic_year_id").references(() => academicYears.id, { onDelete: "cascade" }),
  totalAttendanceDays: integer("total_attendance_days").notNull().default(60), // Total school days for this term
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

// Teacher Assignments (which subjects/classes a teacher can teach)
export const teacherAssignments = pgTable("teacher_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").references(() => teachers.id, { onDelete: "cascade" }).notNull(),
  subjectId: varchar("subject_id").references(() => subjects.id, { onDelete: "cascade" }).notNull(),
  classLevel: text("class_level").notNull(), // e.g., "Basic 8"
  isClassTeacher: boolean("is_class_teacher").default(false), // Whether this teacher is the class teacher for this level
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeacherAssignmentSchema = createInsertSchema(teacherAssignments).omit({
  id: true,
  createdAt: true,
});
export type InsertTeacherAssignment = z.infer<typeof insertTeacherAssignmentSchema>;
export type TeacherAssignment = typeof teacherAssignments.$inferSelect;

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

// Student Term Details (Remarks, Attendance, etc.)
export const studentTermDetails = pgTable("student_term_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  termId: varchar("term_id").references(() => academicTerms.id).notNull(),
  attendance: integer("attendance").default(0),
  attendanceTotal: integer("attendance_total").default(0),
  attitude: text("attitude"),
  conduct: text("conduct"),
  interest: text("interest"),
  classTeacherRemark: text("class_teacher_remark"),
  headTeacherRemark: text("head_teacher_remark"),
  formMaster: text("form_master"),
  promotedTo: text("promoted_to"),
  arrears: text("arrears"), // Storing as text/string for simplicity
  otherFees: text("other_fees"),
  totalBill: text("total_bill"),
  nextTermBegins: text("next_term_begins"), // Date string
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStudentTermDetailsSchema = createInsertSchema(studentTermDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudentTermDetails = z.infer<typeof insertStudentTermDetailsSchema>;
export type StudentTermDetails = typeof studentTermDetails.$inferSelect;

// Grading Scales
export const gradingScales = pgTable("grading_scales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'primary' (1-6) or 'jhs' (7-9)
  grade: text("grade").notNull(), // 'A', 'B+', etc.
  minScore: integer("min_score").notNull(),
  maxScore: integer("max_score").notNull(),
  description: text("description").notNull(), // 'Excellent', 'Very Good'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGradingScaleSchema = createInsertSchema(gradingScales).omit({
  id: true,
  createdAt: true,
});
export type InsertGradingScale = z.infer<typeof insertGradingScaleSchema>;
export type GradingScale = typeof gradingScales.$inferSelect;

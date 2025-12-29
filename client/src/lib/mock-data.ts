export const MOCK_STUDENTS = [
  { id: "S001", name: "Alice Johnson", grade: "10th", email: "alice@student.academia.edu", status: "Active", attendance: "98%" },
  { id: "S002", name: "Bob Smith", grade: "11th", email: "bob@student.academia.edu", status: "Active", attendance: "92%" },
  { id: "S003", name: "Charlie Brown", grade: "9th", email: "charlie@student.academia.edu", status: "Inactive", attendance: "85%" },
  { id: "S004", name: "Diana Prince", grade: "12th", email: "diana@student.academia.edu", status: "Active", attendance: "100%" },
  { id: "S005", name: "Evan Wright", grade: "10th", email: "evan@student.academia.edu", status: "Warning", attendance: "78%" },
];

export const MOCK_TEACHERS = [
  { id: "T001", name: "Dr. Sarah Conner", subject: "Physics", email: "sarah@academia.edu", classes: 4 },
  { id: "T002", name: "Prof. Alan Grant", subject: "Biology", email: "alan@academia.edu", classes: 3 },
  { id: "T003", name: "Ms. Ellen Ripley", subject: "Mathematics", email: "ellen@academia.edu", classes: 5 },
  { id: "T004", name: "Mr. John Keating", subject: "Literature", email: "john@academia.edu", classes: 4 },
];

export const MOCK_SUBJECTS = [
  { id: "SUB001", name: "Advanced Physics", code: "PHY301", teacher: "Dr. Sarah Conner", students: 24 },
  { id: "SUB002", name: "World History", code: "HIS101", teacher: "Mr. John Keating", students: 30 },
  { id: "SUB003", name: "Calculus I", code: "MAT201", teacher: "Ms. Ellen Ripley", students: 18 },
  { id: "SUB004", name: "Biology Lab", code: "BIO202", teacher: "Prof. Alan Grant", students: 22 },
];

export const ACADEMIC_TERMS = [
  { id: "TERM1", name: "Term 1", description: "First academic term", status: "Active" },
  { id: "TERM2", name: "Term 2", description: "Second academic term", status: "Inactive" },
  { id: "TERM3", name: "Term 3", description: "Third academic term", status: "Inactive" },
];

// GES Ghana Grading Scale
export const GES_GRADING_SCALE = [
  { range: [80, 100], grade: "A+", description: "Excellent" },
  { range: [75, 79], grade: "A", description: "Very Good" },
  { range: [70, 74], grade: "B+", description: "Good" },
  { range: [65, 69], grade: "B", description: "Good" },
  { range: [60, 64], grade: "C+", description: "Satisfactory" },
  { range: [55, 59], grade: "C", description: "Satisfactory" },
  { range: [50, 54], grade: "D+", description: "Pass" },
  { range: [45, 49], grade: "D", description: "Pass" },
  { range: [40, 44], grade: "E", description: "Weak Pass" },
  { range: [0, 39], grade: "F", description: "Fail" },
];

export function getGESGrade(score: number): { grade: string; description: string } {
  const entry = GES_GRADING_SCALE.find(g => score >= g.range[0] && score <= g.range[1]);
  return entry ? { grade: entry.grade, description: entry.description } : { grade: "F", description: "Fail" };
}

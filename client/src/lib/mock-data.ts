export const MOCK_STUDENTS = [
  { id: "S001", name: "Alice Johnson", grade: "Basic 9", email: "alice@student.academia.edu", status: "Active", attendance: "98%" },
  { id: "S002", name: "Bob Smith", grade: "Basic 8", email: "bob@student.academia.edu", status: "Active", attendance: "92%" },
  { id: "S003", name: "Charlie Brown", grade: "Basic 7", email: "charlie@student.academia.edu", status: "Inactive", attendance: "85%" },
  { id: "S004", name: "Diana Prince", grade: "Basic 6", email: "diana@student.academia.edu", status: "Active", attendance: "100%" },
  { id: "S005", name: "Evan Wright", grade: "Basic 5", email: "evan@student.academia.edu", status: "Warning", attendance: "78%" },
  { id: "S006", name: "Amara Mensah", grade: "KG 2", email: "amara@student.academia.edu", status: "Active", attendance: "96%" },
  { id: "S007", name: "Kwame Asante", grade: "KG 1", email: "kwame@student.academia.edu", status: "Active", attendance: "88%" },
];

export const MOCK_TEACHERS = [
  { id: "T001", name: "Dr. Sarah Conner", subject: "Physics", email: "sarah@academia.edu", classes: 4 },
  { id: "T002", name: "Prof. Alan Grant", subject: "Biology", email: "alan@academia.edu", classes: 3 },
  { id: "T003", name: "Ms. Ellen Ripley", subject: "Mathematics", email: "ellen@academia.edu", classes: 5 },
  { id: "T004", name: "Mr. John Keating", subject: "Literature", email: "john@academia.edu", classes: 4 },
];

export const MOCK_SUBJECTS = [
  // Subjects for KG 1-2 (Kindergarten)
  { id: "SUB001", name: "Creative Arts & Design", code: "CAD101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2"] },
  { id: "SUB002", name: "Literacy", code: "LIT101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2"] },
  { id: "SUB003", name: "Numeracy", code: "NUM101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2"] },
  { id: "SUB004", name: "Our World and Our People", code: "OWO101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"] },
  { id: "SUB005", name: "Writing", code: "WRI101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2"] },
  
  // Subjects for Basic 1-6 (Primary & Lower Junior)
  { id: "SUB006", name: "Computing", code: "COM101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"] },
  { id: "SUB007", name: "English Language", code: "ENG101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
  { id: "SUB008", name: "Fante", code: "FAN101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
  { id: "SUB009", name: "French", code: "FRE101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
  { id: "SUB010", name: "History of Ghana", code: "HOG101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"] },
  { id: "SUB011", name: "Mathematics", code: "MAT101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
  { id: "SUB012", name: "Physical Health Education", code: "PHE101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
  { id: "SUB013", name: "Religious & Moral Education", code: "RME101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
  { id: "SUB014", name: "Science", code: "SCI101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
  
  // Subjects for Basic 7-9 (Upper Junior Secondary)
  { id: "SUB015", name: "Career Technology", code: "CAR101", teacher: "Unassigned", students: 0, classLevels: ["Basic 7", "Basic 8", "Basic 9"] },
  { id: "SUB016", name: "Social Studies", code: "SOC101", teacher: "Unassigned", students: 0, classLevels: ["Basic 7", "Basic 8", "Basic 9"] },
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

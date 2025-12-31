// LocalStorage utility for persisting app data

export interface StoredData {
  students: any[];
  teachers: any[];
  subjects: any[];
  terms: any[];
  years: any[];
}

const STORAGE_KEY = "ubs_school_data";

// Initialize default data
const defaultData: StoredData = {
  students: [
    { id: "S001", name: "Alice Johnson", grade: "Basic 9", email: "alice@student.academia.edu", status: "Active", attendance: "98%" },
    { id: "S002", name: "Bob Smith", grade: "Basic 8", email: "bob@student.academia.edu", status: "Active", attendance: "92%" },
    { id: "S003", name: "Charlie Brown", grade: "Basic 7", email: "charlie@student.academia.edu", status: "Inactive", attendance: "85%" },
    { id: "S004", name: "Diana Prince", grade: "Basic 6", email: "diana@student.academia.edu", status: "Active", attendance: "100%" },
    { id: "S005", name: "Evan Wright", grade: "Basic 5", email: "evan@student.academia.edu", status: "Warning", attendance: "78%" },
    { id: "S006", name: "Amara Mensah", grade: "KG 2", email: "amara@student.academia.edu", status: "Active", attendance: "96%" },
    { id: "S007", name: "Kwame Asante", grade: "KG 1", email: "kwame@student.academia.edu", status: "Active", attendance: "88%" },
  ],
  teachers: [
    { id: "T001", name: "Dr. Sarah Conner", subject: "Physics", email: "sarah@academia.edu", username: "teacher_001", password: "teacher123", secretWord: "ghana", classes: 4 },
    { id: "T002", name: "Prof. Alan Grant", subject: "Biology", email: "alan@academia.edu", username: "teacher_002", password: "teacher123", secretWord: "excellence", classes: 3 },
    { id: "T003", name: "Ms. Ellen Ripley", subject: "Mathematics", email: "ellen@academia.edu", username: "teacher_003", password: "teacher123", secretWord: "knowledge", classes: 5 },
    { id: "T004", name: "Mr. John Keating", subject: "Literature", email: "john@academia.edu", username: "teacher_004", password: "teacher123", secretWord: "truth", classes: 4 },
  ],
  subjects: [
    { id: "SUB001", name: "Creative Arts & Design", code: "CAD101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2"] },
    { id: "SUB002", name: "Literacy", code: "LIT101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2"] },
    { id: "SUB003", name: "Numeracy", code: "NUM101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2"] },
    { id: "SUB004", name: "Our World and Our People", code: "OWO101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"] },
    { id: "SUB005", name: "Writing", code: "WRI101", teacher: "Unassigned", students: 0, classLevels: ["KG 1", "KG 2"] },
    { id: "SUB006", name: "Computing", code: "COM101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"] },
    { id: "SUB007", name: "English Language", code: "ENG101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
    { id: "SUB008", name: "Fante", code: "FAN101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
    { id: "SUB009", name: "French", code: "FRE101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
    { id: "SUB010", name: "History of Ghana", code: "HOG101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"] },
    { id: "SUB011", name: "Mathematics", code: "MAT101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
    { id: "SUB012", name: "Physical Health Education", code: "PHE101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
    { id: "SUB013", name: "Religious & Moral Education", code: "RME101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
    { id: "SUB014", name: "Science", code: "SCI101", teacher: "Unassigned", students: 0, classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"] },
    { id: "SUB015", name: "Career Technology", code: "CAR101", teacher: "Unassigned", students: 0, classLevels: ["Basic 7", "Basic 8", "Basic 9"] },
    { id: "SUB016", name: "Social Studies", code: "SOC101", teacher: "Unassigned", students: 0, classLevels: ["Basic 7", "Basic 8", "Basic 9"] },
  ],
  terms: [
    { id: "TERM1", name: "Term 1", description: "First academic term", status: "Active" },
    { id: "TERM2", name: "Term 2", description: "Second academic term", status: "Inactive" },
    { id: "TERM3", name: "Term 3", description: "Third academic term", status: "Inactive" },
  ],
  years: [
    { id: "AY2024", year: "2023/2024", status: "Completed" },
    { id: "AY2025", year: "2024/2025", status: "Active" },
    { id: "AY2026", year: "2025/2026", status: "Inactive" },
  ],
};

// Get all stored data
export function getStoredData(): StoredData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading from storage:", error);
  }
  return defaultData;
}

// Save all data
export function saveStoredData(data: StoredData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to storage:", error);
  }
}

// Get specific data type
export function getStoredStudents() {
  return getStoredData().students;
}

export function getStoredTeachers() {
  return getStoredData().teachers;
}

export function getStoredSubjects() {
  return getStoredData().subjects;
}

export function getStoredTerms() {
  return getStoredData().terms;
}

export function getStoredYears() {
  return getStoredData().years;
}

// Update functions
export function updateStudents(students: any[]) {
  const data = getStoredData();
  data.students = students;
  saveStoredData(data);
}

export function updateTeachers(teachers: any[]) {
  const data = getStoredData();
  data.teachers = teachers;
  saveStoredData(data);
}

export function updateSubjects(subjects: any[]) {
  const data = getStoredData();
  data.subjects = subjects;
  saveStoredData(data);
}

export function updateTerms(terms: any[]) {
  const data = getStoredData();
  data.terms = terms;
  saveStoredData(data);
}

export function updateYears(years: any[]) {
  const data = getStoredData();
  data.years = years;
  saveStoredData(data);
}

// Reset to defaults
export function resetToDefaults() {
  saveStoredData(defaultData);
}

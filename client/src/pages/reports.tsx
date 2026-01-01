import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, Users, GraduationCap, FileDown, User, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { studentsApi, subjectsApi, academicYearsApi, academicTermsApi, scoresApi, teacherAssignmentsApi, teachersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { BASIC_1_6_GRADING_SCALE, GES_GRADING_SCALE } from "@/lib/mock-data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const GRADES = [
  "KG 1", "KG 2", 
  "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6",
  "Basic 7", "Basic 8", "Basic 9"
];

const NUMERIC_GRADE_SCALE = [
  { min: 80, max: 100, grade: 1, remark: "Excellent" },
  { min: 70, max: 79, grade: 2, remark: "Very Good" },
  { min: 60, max: 69, grade: 3, remark: "Good" },
  { min: 50, max: 59, grade: 4, remark: "Credit" },
  { min: 40, max: 49, grade: 5, remark: "Pass" },
  { min: 30, max: 39, grade: 6, remark: "Weak Pass" },
  { min: 20, max: 29, grade: 7, remark: "Weak" },
  { min: 10, max: 19, grade: 8, remark: "Very Weak" },
  { min: 0, max: 9, grade: 9, remark: "Fail" },
];

interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classLevel: string;
  isClassTeacher: boolean;
}

export default function Reports() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [showStudentReport, setShowStudentReport] = useState<any | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { role, userId } = useAuth();
  
  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsData, subjectsData, yearsData, termsData] = await Promise.all([
        studentsApi.getAll(),
        subjectsApi.getAll(),
        academicYearsApi.getAll(),
        academicTermsApi.getAll(),
      ]);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setAcademicYears(yearsData);
      setTerms(termsData);
      
      const activeYear = yearsData.find((y: any) => y.status === "Active");
      if (activeYear) {
        setSelectedYear(activeYear.id);
      }
      
      if (isTeacher && userId) {
        const teachers = await teachersApi.getAll();
        const teacher = teachers.find((t: any) => t.userId === userId);
        if (teacher) {
          setTeacherId(teacher.id);
          const assignments = await teacherAssignmentsApi.getByTeacher(teacher.id);
          setTeacherAssignments(assignments);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTerm) {
      loadScores();
    }
  }, [selectedTerm]);

  const loadScores = async () => {
    try {
      const scoresData = await scoresApi.getByTerm(selectedTerm);
      setScores(scoresData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load scores",
        variant: "destructive",
      });
    }
  };

  const getNumericGrade = (score: number): number => {
    if (score === 0) return 0;
    const entry = NUMERIC_GRADE_SCALE.find(g => score >= g.min && score <= g.max);
    return entry ? entry.grade : 9;
  };

  const getGradeRemark = (score: number): string => {
    if (score === 0) return "-";
    const entry = NUMERIC_GRADE_SCALE.find(g => score >= g.min && score <= g.max);
    return entry ? entry.remark : "Fail";
  };

  const getClassCounts = () => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      counts[s.grade] = (counts[s.grade] || 0) + 1;
    });
    return counts;
  };

  const classCounts = getClassCounts();

  const getTeacherAssignedClasses = () => {
    if (isTeacher && teacherAssignments.length > 0) {
      return Array.from(new Set(teacherAssignments.map(a => a.classLevel)));
    }
    return null;
  };

  const getTeacherSubjectsForClass = (classLevel: string) => {
    if (isTeacher && teacherAssignments.length > 0) {
      const assignedSubjectIds = teacherAssignments
        .filter(a => a.classLevel === classLevel)
        .map(a => a.subjectId);
      return subjects.filter(s => assignedSubjectIds.includes(s.id));
    }
    return subjects;
  };

  const teacherClasses = getTeacherAssignedClasses();

  const sortedClasses = (() => {
    const allGrades = new Set<string>(GRADES);
    Object.keys(classCounts).forEach(g => allGrades.add(g));
    let classes = Array.from(allGrades);
    
    if (teacherClasses) {
      classes = classes.filter(c => teacherClasses.includes(c));
    }
    
    return classes.sort((a, b) => {
      const getOrder = (grade: string) => {
        if (grade.startsWith("KG")) return parseInt(grade.replace(/[^0-9]/g, "") || "0");
        if (grade.startsWith("Basic")) return 10 + parseInt(grade.replace(/[^0-9]/g, "") || "0");
        return 100;
      };
      return getOrder(a) - getOrder(b);
    });
  })();

  const yearTerms = terms.filter(t => t.academicYearId === selectedYear);
  const classStudents = selectedClass ? students.filter(s => s.grade === selectedClass) : [];
  
  const getSubjectsForClass = (classLevel: string) => {
    const filtered = subjects.filter(s => 
      s.classLevels && s.classLevels.includes(classLevel)
    );
    return filtered.length > 0 ? filtered : subjects;
  };

  const classSubjects = selectedClass ? getSubjectsForClass(selectedClass) : subjects;
  
  const displaySubjects = selectedClass 
    ? (isTeacher ? getTeacherSubjectsForClass(selectedClass) : classSubjects)
    : subjects;

  const allSubjects = classSubjects;

  const getScore = (studentId: string, subjectId: string) => {
    const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
    return score ? score.totalScore : 0;
  };

  const getScoreDetails = (studentId: string, subjectId: string) => {
    const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
    return score ? { classScore: score.classScore || 0, examScore: score.examScore || 0, total: score.totalScore || 0 } : { classScore: 0, examScore: 0, total: 0 };
  };

  const calculateTotal = (studentId: string, subjectsToUse: any[] = subjects) => {
    return subjectsToUse.reduce((sum, sub) => sum + getScore(studentId, sub.id), 0);
  };

  const calculateAverage = (studentId: string, subjectsToUse: any[] = subjects) => {
    if (subjectsToUse.length === 0) return 0;
    const total = subjectsToUse.reduce((sum, s) => sum + getScore(studentId, s.id), 0);
    return parseFloat((total / subjectsToUse.length).toFixed(1));
  };

  const getStudentPassFail = (studentId: string, subjectsToUse: any[] = subjects) => {
    const avg = calculateAverage(studentId, subjectsToUse);
    return avg >= 50 ? "Pass" : "Fail";
  };

  const hasAnyScores = (studentId: string, subjectsToUse: any[] = subjects) => {
    return subjectsToUse.some(s => getScore(studentId, s.id) > 0);
  };

  const getGrade = (total: number, classLevel: string) => {
    const basicNum = parseInt(classLevel.replace(/[^0-9]/g, ""));
    const scale = basicNum >= 1 && basicNum <= 6 ? BASIC_1_6_GRADING_SCALE : GES_GRADING_SCALE;
    const entry = scale.find(g => total >= g.range[0] && total <= g.range[1]);
    return entry ? entry.grade : "F";
  };

  const getStudentsRankedByAverage = () => {
    return [...classStudents]
      .filter(s => hasAnyScores(s.id, allSubjects))
      .sort((a, b) => calculateAverage(b.id, allSubjects) - calculateAverage(a.id, allSubjects));
  };

  const studentsRankedByAverage = getStudentsRankedByAverage();

  const getStudentPosition = (studentId: string) => {
    const ranked = getStudentsRankedByAverage();
    const index = ranked.findIndex(s => s.id === studentId);
    return index >= 0 ? index + 1 : null;
  };

  const getPositionSuffix = (pos: number | null) => {
    if (!pos) return "-";
    const j = pos % 10;
    const k = pos % 100;
    if (j === 1 && k !== 11) return pos + "st";
    if (j === 2 && k !== 12) return pos + "nd";
    if (j === 3 && k !== 13) return pos + "rd";
    return pos + "th";
  };

  const hasScoresEntered = (studentId: string) => {
    return hasAnyScores(studentId, allSubjects);
  };

  const exportBroadsheetPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
    const termData = terms.find(t => t.id === selectedTerm);
    const termName = termData?.name || "";
    const termNumber = termData?.termNumber || "";
    const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    
    doc.setFillColor(0, 100, 0);
    doc.rect(0, 0, 297, 8, "F");
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 100, 0);
    doc.text("UNIVERSITY BASIC SCHOOL", 148.5, 18, { align: "center" });
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${yearName} TERM ${termNumber}    BROADSHEET FOR    ${selectedClass?.toUpperCase()}`, 148.5, 26, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SCORE AND POSITION OF STUDENTS", 148.5, 33, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Number on Roll: ${classStudents.length}`, 14, 38);
    doc.text(`Term: ${termNumber}`, 70, 38);
    doc.text(today, 250, 38);

    const subjectHeaders = displaySubjects.flatMap(s => [s.name, ""]);
    const tableHead = [
      ["NAME OF STUDENTS", ...subjectHeaders, "TOT", "AVG", "POS"]
    ];

    const sortedStudents = [...classStudents].sort((a, b) => {
      const avgA = calculateAverage(a.id, allSubjects);
      const avgB = calculateAverage(b.id, allSubjects);
      return avgB - avgA;
    });

    const tableBody = sortedStudents.map((student) => {
      const total = calculateTotal(student.id, allSubjects);
      const avg = calculateAverage(student.id, allSubjects);
      const position = getStudentPosition(student.id);
      const posText = getPositionSuffix(position);
      
      const subjectScores = displaySubjects.flatMap(s => {
        const score = getScore(student.id, s.id);
        const grade = score > 0 ? getNumericGrade(score) : "";
        return [score || "", grade];
      });
      
      return [
        student.name.toUpperCase(),
        ...subjectScores,
        total || 0,
        avg || 0,
        posText
      ];
    });

    const subjectColStyles: any = {};
    displaySubjects.forEach((_, idx) => {
      const scoreCol = 1 + (idx * 2);
      const gradeCol = 2 + (idx * 2);
      subjectColStyles[scoreCol] = { cellWidth: 8, halign: "center" };
      subjectColStyles[gradeCol] = { cellWidth: 6, halign: "center", fillColor: [240, 240, 240] };
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 42,
      theme: "grid",
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { 
        fillColor: [200, 220, 200], 
        textColor: [0, 0, 0], 
        fontStyle: "bold",
        halign: "center",
        fontSize: 5
      },
      columnStyles: {
        0: { cellWidth: 45 },
        ...subjectColStyles,
        [1 + displaySubjects.length * 2]: { cellWidth: 10, halign: "center", fontStyle: "bold" },
        [2 + displaySubjects.length * 2]: { cellWidth: 10, halign: "center" },
        [3 + displaySubjects.length * 2]: { cellWidth: 10, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const colIdx = data.column.index;
          if (colIdx > 0 && colIdx <= displaySubjects.length * 2) {
            if (colIdx % 2 === 0) {
              data.cell.styles.fillColor = [245, 245, 245];
              data.cell.styles.fontSize = 5;
            }
          }
          const cellValue = data.cell.raw;
          if (cellValue === "Fail" || cellValue === 0) {
            data.cell.styles.textColor = [200, 0, 0];
          }
        }
      }
    });

    doc.save(`Broadsheet_${selectedClass}_${termName.replace(/\s+/g, "_")}.pdf`);
    
    toast({
      title: "Success",
      description: "Broadsheet PDF exported successfully",
    });
  };

  const exportBroadsheetExcel = () => {
    const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
    const termData = terms.find(t => t.id === selectedTerm);
    const termName = termData?.name || "";
    
    const headers = [
      "Position",
      "Student Name",
      "Student ID",
      ...displaySubjects.flatMap(s => [`${s.name} Score`, `${s.name} Grade`]),
      "Total",
      "Average",
      "Status"
    ];

    const sortedStudents = [...classStudents].sort((a, b) => {
      return calculateAverage(b.id, allSubjects) - calculateAverage(a.id, allSubjects);
    });

    const data = sortedStudents.map((student) => {
      const total = calculateTotal(student.id, allSubjects);
      const avg = calculateAverage(student.id, allSubjects);
      const position = getStudentPosition(student.id);
      const status = getStudentPassFail(student.id, allSubjects);
      
      const subjectData = displaySubjects.flatMap(s => {
        const score = getScore(student.id, s.id);
        const grade = score > 0 ? getNumericGrade(score) : "-";
        return [score || 0, grade];
      });
      
      return [
        getPositionSuffix(position),
        student.name,
        student.studentId,
        ...subjectData,
        total,
        avg,
        status
      ];
    });

    const wsData = [
      ["UNIVERSITY BASIC SCHOOL - TARKWA"],
      [`${yearName} - ${termName} BROADSHEET FOR ${selectedClass}`],
      [`Number on Roll: ${classStudents.length}`],
      [],
      headers,
      ...data
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Broadsheet");
    
    ws["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 12 },
      ...displaySubjects.flatMap(() => [{ wch: 10 }, { wch: 8 }]),
      { wch: 8 },
      { wch: 8 },
      { wch: 8 }
    ];

    XLSX.writeFile(wb, `Broadsheet_${selectedClass}_${termName.replace(/\s+/g, "_")}.xlsx`);
    
    toast({
      title: "Success",
      description: "Broadsheet Excel exported successfully",
    });
  };

  const printStudentReport = (student: any) => {
    const doc = new jsPDF();
    const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
    const termName = terms.find(t => t.id === selectedTerm)?.name || "";
    const position = getStudentPosition(student.id);
    const total = calculateTotal(student.id, allSubjects);
    const avg = calculateAverage(student.id, allSubjects);
    const maxPossibleScore = allSubjects.length * 100;
    const percentage = maxPossibleScore > 0 ? Math.round((total / maxPossibleScore) * 100) : 0;
    
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("UNIVERSITY BASIC SCHOOL", 105, 25, { align: "center" });
    doc.setFontSize(12);
    doc.text("TARKWA, WESTERN REGION, GHANA", 105, 32, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Tel: 031-XXXXXXX | Email: info@universitybasicschool.edu.gh", 105, 38, { align: "center" });
    
    doc.setLineWidth(1);
    doc.line(20, 42, 190, 42);
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("STUDENT REPORT CARD", 105, 52, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${termName} - Academic Year ${yearName}`, 105, 59, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Student Information", 14, 70);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Name: ${student.name}`, 14, 78);
    doc.text(`Student ID: ${student.studentId}`, 14, 85);
    doc.text(`Class: ${student.grade}`, 14, 92);
    
    doc.text(`Position: ${getPositionSuffix(position)} of ${classStudents.length}`, 110, 78);
    doc.text(`Total Score: ${total}`, 110, 85);
    doc.text(`Average: ${avg}%`, 110, 92);

    const tableHead = [["Subject", "Class Score", "Exam Score", "Total", "Grade", "Remark"]];
    const tableBody = allSubjects.map(s => {
      const scoreData = scores.find(sc => sc.studentId === student.id && sc.subjectId === s.id);
      const classScore = scoreData?.classScore || 0;
      const examScore = scoreData?.examScore || 0;
      const totalScore = classScore + examScore;
      const grade = totalScore > 0 ? getNumericGrade(totalScore) : "-";
      const remark = getGradeRemark(totalScore);
      return [s.name, classScore || "-", examScore || "-", totalScore || "-", grade, remark];
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 100,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 180;
    
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, finalY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Score: ${total} out of ${maxPossibleScore}`, 14, finalY + 20);
    doc.text(`Average: ${avg}%`, 14, finalY + 27);
    doc.text(`Class Position: ${getPositionSuffix(position)} out of ${classStudents.length} students`, 14, finalY + 34);
    doc.text(`Overall Performance: ${getGradeRemark(avg)}`, 14, finalY + 41);
    
    doc.setFont("helvetica", "bold");
    doc.text("Class Teacher's Comments:", 14, finalY + 55);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY + 62, 196, finalY + 62);
    doc.line(14, finalY + 70, 196, finalY + 70);
    
    doc.setFont("helvetica", "bold");
    doc.text("Headmaster's Comments:", 14, finalY + 82);
    doc.setFont("helvetica", "normal");
    doc.line(14, finalY + 89, 196, finalY + 89);
    
    doc.text("Class Teacher's Signature: _____________________", 14, finalY + 105);
    doc.text("Date: ________________", 130, finalY + 105);
    
    doc.text("Headmaster's Signature: _____________________", 14, finalY + 115);
    doc.text("Date: ________________", 130, finalY + 115);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This report card is the property of University Basic School, Tarkwa.", 105, 280, { align: "center" });

    doc.save(`Report_${student.name.replace(/\s+/g, "_")}_${termName.replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Reports & Broadsheet</h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher 
              ? "View reports and broadsheets for your assigned subjects."
              : "Select a class to view student reports and generate broadsheets."
            }
          </p>
        </div>

        {isTeacher && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 ml-2">
              You can view broadsheets for your assigned subjects only. 
              {teacherAssignments.length > 0 && ` Showing ${sortedClasses.length} class(es) with ${new Set(teacherAssignments.map(a => a.subjectId)).size} subject(s).`}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Select Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger data-testid="select-academic-year">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(y => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.year} {y.status === "Active" && "(Active)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedYear && yearTerms.length > 0 && (
              <div className="mt-6">
                <Label className="mb-3 block">Academic Terms</Label>
                <div className="flex gap-3 flex-wrap">
                  {yearTerms.map(term => (
                    <Button
                      key={term.id}
                      variant={selectedTerm === term.id ? "default" : "outline"}
                      className={`${
                        term.status === "Inactive" ? "opacity-50" : ""
                      } ${selectedTerm === term.id ? "" : term.status === "Active" ? "border-green-500 text-green-700" : ""}`}
                      onClick={() => setSelectedTerm(term.id)}
                      data-testid={`button-term-${term.id}`}
                    >
                      {term.name}
                      {term.status === "Active" && (
                        <Badge className="ml-2 bg-green-500">Active</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedClasses.map((grade) => {
            const count = classCounts[grade] || 0;
            const isKG = grade.startsWith("KG");
            const assignedSubjectsCount = isTeacher 
              ? teacherAssignments.filter(a => a.classLevel === grade).length 
              : subjects.length;
            
            return (
              <Card 
                key={grade} 
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                  isKG ? 'border-l-4 border-l-pink-500' : 'border-l-4 border-l-blue-500'
                } ${!selectedTerm ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => selectedTerm && setSelectedClass(grade)}
                data-testid={`card-report-class-${grade.replace(/\s+/g, "-")}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{grade}</CardTitle>
                    <GraduationCap className={`h-5 w-5 ${isKG ? 'text-pink-500' : 'text-blue-500'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-muted-foreground text-sm">
                      {count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                  {isTeacher && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {assignedSubjectsCount} subject(s) assigned
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!selectedTerm && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-4 text-center text-yellow-800">
              Please select an academic year and term above to view class reports.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const termData = terms.find(t => t.id === selectedTerm);
  const termName = termData?.name || "";
  const termNumber = termData?.termNumber || "";
  const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const sortedStudentsByRank = [...classStudents].sort((a, b) => {
    const avgA = calculateAverage(a.id, allSubjects);
    const avgB = calculateAverage(b.id, allSubjects);
    return avgB - avgA;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedClass(null)}
            data-testid="button-back-to-classes"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">{selectedClass} Broadsheet</h1>
            <p className="text-muted-foreground mt-1">{yearName} - {termName}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={exportBroadsheetPDF}
            disabled={classStudents.length === 0}
            data-testid="button-export-pdf"
          >
            <FileDown className="h-4 w-4" /> Export PDF
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={exportBroadsheetExcel}
            disabled={classStudents.length === 0}
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {isTeacher && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 ml-2">
            Showing {displaySubjects.length} subject(s) assigned to you. Admins see all subjects.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-700 to-green-600 text-white rounded-t-lg">
          <div className="text-center">
            <CardTitle className="text-lg font-bold">UNIVERSITY BASIC SCHOOL</CardTitle>
            <p className="text-sm mt-1">{yearName} TERM {termNumber} BROADSHEET FOR {selectedClass?.toUpperCase()}</p>
            <p className="text-xs mt-1 font-semibold">SCORE AND POSITION OF STUDENTS</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b text-sm">
            <div className="flex gap-6">
              <span><strong>Number on Roll:</strong> {classStudents.length}</span>
              <span><strong>Term:</strong> {termNumber}</span>
            </div>
            <span className="text-gray-600">{today}</span>
          </div>
          
          <div className="overflow-x-auto" ref={printRef}>
            <Table>
              <TableHeader className="bg-green-50">
                <TableRow>
                  <TableHead className="w-[200px] sticky left-0 bg-green-50 font-bold border-r">NAME OF STUDENTS</TableHead>
                  {displaySubjects.map(s => (
                    <TableHead key={s.id} colSpan={2} className="text-center min-w-[80px] border-x text-xs font-bold">
                      {s.name}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold min-w-[50px] border-x">TOT</TableHead>
                  <TableHead className="text-center font-bold min-w-[50px] border-x">AVG</TableHead>
                  <TableHead className="text-center font-bold min-w-[50px]">POS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudentsByRank.map((student) => {
                  const total = calculateTotal(student.id, allSubjects);
                  const avg = calculateAverage(student.id, allSubjects);
                  const position = getStudentPosition(student.id);
                  const hasScores = hasScoresEntered(student.id);
                  const status = getStudentPassFail(student.id, allSubjects);
                  
                  return (
                    <TableRow 
                      key={student.id} 
                      className={`${!hasScores ? "opacity-50" : ""} ${status === "Fail" && hasScores ? "bg-red-50" : ""} hover:bg-gray-50 cursor-pointer`}
                      onClick={() => hasScores && setShowStudentReport(student)}
                      data-testid={`row-report-${student.id}`}
                    >
                      <TableCell className="sticky left-0 bg-white font-medium border-r" data-testid={`text-name-${student.id}`}>
                        {student.name.toUpperCase()}
                      </TableCell>
                      {displaySubjects.map(s => {
                        const score = getScore(student.id, s.id);
                        const grade = score > 0 ? getNumericGrade(score) : "";
                        return (
                          <>
                            <TableCell 
                              key={`${s.id}-score`}
                              className={`text-center border-l ${score === 0 ? 'text-muted-foreground' : score < 50 ? 'text-red-600 font-semibold' : ''}`}
                              data-testid={`text-score-${student.id}-${s.id}`}
                            >
                              {score || ""}
                            </TableCell>
                            <TableCell 
                              key={`${s.id}-grade`}
                              className={`text-center bg-gray-50 text-xs border-r ${score < 50 && score > 0 ? 'text-red-600' : ''}`}
                              data-testid={`text-grade-${student.id}-${s.id}`}
                            >
                              {grade}
                            </TableCell>
                          </>
                        );
                      })}
                      <TableCell className="text-center font-bold border-x" data-testid={`text-total-${student.id}`}>
                        {total || ""}
                      </TableCell>
                      <TableCell className={`text-center border-x ${avg < 50 && avg > 0 ? 'text-red-600 font-semibold' : ''}`} data-testid={`text-avg-${student.id}`}>
                        {avg > 0 ? avg : ""}
                      </TableCell>
                      <TableCell className="text-center font-semibold" data-testid={`text-position-${student.id}`}>
                        {getPositionSuffix(position)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {classStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={displaySubjects.length * 2 + 4} className="text-center py-8 text-muted-foreground">
                      No students enrolled in this class
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="p-4 bg-gray-50 border-t flex justify-between items-center flex-wrap gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{studentsRankedByAverage.length}</span> of {classStudents.length} students have scores entered
            </div>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-40" data-testid="select-term-inline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearTerms.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.status === "Active" && "(Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grading Scale Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-center text-sm">
            {NUMERIC_GRADE_SCALE.map((g, idx) => (
              <div key={idx} className={`p-2 rounded border ${g.grade >= 6 ? 'bg-red-50 border-red-200' : g.grade >= 4 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                <div className="font-bold text-lg">{g.grade}</div>
                <div className="text-xs text-gray-600">{g.min}-{g.max}%</div>
                <div className="text-xs font-medium">{g.remark}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!showStudentReport} onOpenChange={() => setShowStudentReport(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="bg-gradient-to-r from-green-700 to-green-600 text-white p-4 -mx-6 -mt-6 rounded-t-lg">
                <div className="text-lg font-bold">UNIVERSITY BASIC SCHOOL</div>
                <div className="text-sm">TARKWA, WESTERN REGION, GHANA</div>
                <div className="text-xs mt-1">Student Report Card</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {showStudentReport && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p><strong>Name:</strong> {showStudentReport.name}</p>
                  <p><strong>Student ID:</strong> {showStudentReport.studentId}</p>
                  <p><strong>Class:</strong> {showStudentReport.grade}</p>
                </div>
                <div className="text-right">
                  <p><strong>Position:</strong> {getPositionSuffix(getStudentPosition(showStudentReport.id))} of {classStudents.length}</p>
                  <p><strong>Total:</strong> {calculateTotal(showStudentReport.id, allSubjects)}</p>
                  <p><strong>Average:</strong> {calculateAverage(showStudentReport.id, allSubjects)}%</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-green-600 text-white">
                    <TableHead className="text-white">Subject</TableHead>
                    <TableHead className="text-center text-white">Class Score</TableHead>
                    <TableHead className="text-center text-white">Exam Score</TableHead>
                    <TableHead className="text-center text-white">Total</TableHead>
                    <TableHead className="text-center text-white">Grade</TableHead>
                    <TableHead className="text-center text-white">Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSubjects.map(s => {
                    const details = getScoreDetails(showStudentReport.id, s.id);
                    const grade = details.total > 0 ? getNumericGrade(details.total) : "-";
                    const remark = getGradeRemark(details.total);
                    return (
                      <TableRow key={s.id} className={details.total < 50 && details.total > 0 ? "bg-red-50" : ""}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-center">{details.classScore || "-"}</TableCell>
                        <TableCell className="text-center">{details.examScore || "-"}</TableCell>
                        <TableCell className="text-center font-semibold">{details.total || "-"}</TableCell>
                        <TableCell className="text-center">{grade}</TableCell>
                        <TableCell className={`text-center ${remark === "Fail" ? "text-red-600 font-semibold" : ""}`}>
                          {remark}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold mb-2">Summary</p>
                    <p><strong>Overall Performance:</strong> {getGradeRemark(calculateAverage(showStudentReport.id, allSubjects))}</p>
                    <p><strong>Status:</strong> <span className={getStudentPassFail(showStudentReport.id, allSubjects) === "Pass" ? "text-green-600" : "text-red-600"}>{getStudentPassFail(showStudentReport.id, allSubjects)}</span></p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowStudentReport(null)}>
                  Close
                </Button>
                <Button onClick={() => printStudentReport(showStudentReport)} className="gap-2">
                  <Printer className="h-4 w-4" /> Print Report Card
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

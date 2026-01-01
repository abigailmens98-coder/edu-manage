import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, Users, GraduationCap, ArrowUpDown, FileDown, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  const [sortByRank, setSortByRank] = useState(false);
  const [showStudentReport, setShowStudentReport] = useState<any | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { role, userId } = useAuth();
  
  const isTeacher = role === "teacher";

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
      
      const activeYear = yearsData.find(y => y.status === "Active");
      if (activeYear) {
        setSelectedYear(activeYear.id);
      }
      
      if (isTeacher && userId) {
        const teachers = await teachersApi.getAll();
        const teacher = teachers.find(t => t.userId === userId);
        if (teacher) {
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

  const getScore = (studentId: string, subjectId: string) => {
    const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
    return score ? score.totalScore : 0;
  };

  const calculateTotal = (studentId: string) => {
    return subjects.reduce((sum, sub) => sum + getScore(studentId, sub.id), 0);
  };

  const getGrade = (total: number, classLevel: string) => {
    const basicNum = parseInt(classLevel.replace(/[^0-9]/g, ""));
    const scale = basicNum >= 1 && basicNum <= 6 ? BASIC_1_6_GRADING_SCALE : GES_GRADING_SCALE;
    const entry = scale.find(g => total >= g.range[0] && total <= g.range[1]);
    return entry ? entry.grade : "F";
  };

  const studentsRankedByScore = [...classStudents].sort((a, b) => calculateTotal(b.id) - calculateTotal(a.id));

  const displayStudents = sortByRank ? studentsRankedByScore : classStudents;

  const getStudentPosition = (studentId: string) => {
    const index = studentsRankedByScore.findIndex(s => s.id === studentId);
    return index + 1;
  };

  const hasScoresEntered = (studentId: string) => {
    return scores.some(s => s.studentId === studentId);
  };

  const studentsWithScores = displayStudents.filter(s => hasScoresEntered(s.id));

  const printBroadsheet = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
    const termName = terms.find(t => t.id === selectedTerm)?.name || "";
    
    doc.setFontSize(16);
    doc.text("UNIVERSITY BASIC SCHOOL - TARKWA", 14, 15);
    doc.setFontSize(12);
    doc.text(`Class Broadsheet - ${selectedClass}`, 14, 22);
    doc.text(`Academic Year: ${yearName} - ${termName}`, 14, 28);

    const tableHead = [
      ["Pos", "Student ID", "Name", ...subjects.map(s => s.code), "Total"]
    ];

    const tableBody = studentsRankedByScore.map((student, index) => [
      index + 1,
      student.studentId,
      student.name,
      ...subjects.map(s => getScore(student.id, s.id) || "-"),
      calculateTotal(student.id)
    ]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`Broadsheet_${selectedClass}_${termName}.pdf`);
  };

  const printStudentReport = (student: any) => {
    const doc = new jsPDF();
    const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
    const termName = terms.find(t => t.id === selectedTerm)?.name || "";
    const position = getStudentPosition(student.id);
    const total = calculateTotal(student.id);
    const subjectsWithScores = subjects.filter(s => getScore(student.id, s.id) > 0);
    const maxPossibleScore = subjectsWithScores.length * 100;
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
    
    doc.text(`Position: ${position} of ${classStudents.length}`, 110, 78);
    doc.text(`Total Score: ${total}`, 110, 85);
    doc.text(`Percentage: ${percentage}%`, 110, 92);

    const tableHead = [["Subject", "Class Score", "Exam Score", "Total", "Grade", "Remark"]];
    const tableBody = subjects.map(s => {
      const scoreData = scores.find(sc => sc.studentId === student.id && sc.subjectId === s.id);
      const classScore = scoreData?.classScore || 0;
      const examScore = scoreData?.examScore || 0;
      const totalScore = classScore + examScore;
      const grade = totalScore > 0 ? getGrade(totalScore, student.grade) : "-";
      const remark = totalScore >= 80 ? "Excellent" : totalScore >= 70 ? "Very Good" : totalScore >= 60 ? "Good" : totalScore >= 50 ? "Pass" : totalScore > 0 ? "Fail" : "-";
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
    doc.text(`Percentage: ${percentage}%`, 14, finalY + 27);
    doc.text(`Class Position: ${position} out of ${classStudents.length} students`, 14, finalY + 34);
    doc.text(`Overall Performance: ${percentage >= 80 ? "Excellent" : percentage >= 70 ? "Very Good" : percentage >= 60 ? "Good" : percentage >= 50 ? "Pass" : "Needs Improvement"}`, 14, finalY + 41);
    
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
              ? "View reports and broadsheets for your assigned classes."
              : "Select a class to view student reports and generate broadsheets."
            }
          </p>
        </div>

        {isTeacher && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 ml-2">
              You can view reports for the classes you are assigned to teach. 
              Showing {sortedClasses.length} class(es) based on your assignments.
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

  const termName = terms.find(t => t.id === selectedTerm)?.name || "";
  const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";

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
            <h1 className="text-3xl font-serif font-bold text-foreground">{selectedClass} Reports</h1>
            <p className="text-muted-foreground mt-1">{yearName} - {termName}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setSortByRank(!sortByRank)}
            data-testid="button-toggle-rank"
          >
            <ArrowUpDown className="h-4 w-4" /> 
            {sortByRank ? "Show Original Order" : "Sort by Position"}
          </Button>
          <Button 
            className="gap-2"
            onClick={printBroadsheet}
            disabled={studentsWithScores.length === 0}
            data-testid="button-print-broadsheet"
          >
            <Printer className="h-4 w-4" /> Print Broadsheet
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle>Class Broadsheet</CardTitle>
              <CardDescription>
                {studentsWithScores.length} of {classStudents.length} students have scores entered
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" ref={printRef}>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[60px] sticky left-0 bg-muted/50">Pos</TableHead>
                  <TableHead className="w-[200px] sticky left-[60px] bg-muted/50">Student</TableHead>
                  {subjects.map(s => (
                    <TableHead key={s.id} className="text-center min-w-[70px] text-xs">
                      {s.code}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold min-w-[80px]">Total</TableHead>
                  <TableHead className="text-center w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayStudents.map((student) => {
                  const total = calculateTotal(student.id);
                  const position = getStudentPosition(student.id);
                  const hasScores = hasScoresEntered(student.id);
                  
                  return (
                    <TableRow 
                      key={student.id} 
                      className={!hasScores ? "opacity-50" : ""}
                      data-testid={`row-report-${student.id}`}
                    >
                      <TableCell className="font-bold text-primary sticky left-0 bg-background" data-testid={`text-position-${student.id}`}>
                        {hasScores ? position : "-"}
                      </TableCell>
                      <TableCell className="sticky left-[60px] bg-background">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.studentId}</div>
                      </TableCell>
                      {subjects.map(s => {
                        const score = getScore(student.id, s.id);
                        return (
                          <TableCell 
                            key={s.id} 
                            className={`text-center ${score === 0 ? 'text-muted-foreground' : score < 50 ? 'text-red-600' : ''}`}
                            data-testid={`text-score-${student.id}-${s.id}`}
                          >
                            {score || "-"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold bg-muted/20" data-testid={`text-total-${student.id}`}>
                        {total || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => setShowStudentReport(student)}
                          disabled={!hasScores}
                          data-testid={`button-view-report-${student.id}`}
                        >
                          <User className="h-3 w-3" />
                          Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {displayStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={subjects.length + 4} className="text-center py-8">
                      No students found in {selectedClass}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!showStudentReport} onOpenChange={() => setShowStudentReport(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Report Card Preview</DialogTitle>
          </DialogHeader>
          {showStudentReport && (() => {
            const studentTotal = calculateTotal(showStudentReport.id);
            const subjectsWithScoresCount = subjects.filter(s => getScore(showStudentReport.id, s.id) > 0).length;
            const maxPossible = subjectsWithScoresCount * 100;
            const studentPercentage = maxPossible > 0 ? Math.round((studentTotal / maxPossible) * 100) : 0;
            
            return (
              <div className="space-y-6">
                <div className="text-center border-b pb-4 bg-gradient-to-b from-blue-50 to-white -mx-6 -mt-4 px-6 pt-4">
                  <h2 className="text-xl font-bold text-blue-800">UNIVERSITY BASIC SCHOOL</h2>
                  <p className="text-sm text-blue-600">TARKWA, WESTERN REGION, GHANA</p>
                  <p className="text-lg font-semibold mt-2">STUDENT REPORT CARD</p>
                  <p className="text-sm text-muted-foreground">{termName} - Academic Year {yearName}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p><strong>Student Name:</strong> {showStudentReport.name}</p>
                    <p><strong>Student ID:</strong> {showStudentReport.studentId}</p>
                    <p><strong>Class:</strong> {showStudentReport.grade}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>Position:</strong> {getStudentPosition(showStudentReport.id)} of {classStudents.length}</p>
                    <p><strong>Total Score:</strong> {studentTotal}</p>
                    <p><strong>Percentage:</strong> {studentPercentage}%</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50">
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Class Score</TableHead>
                      <TableHead className="text-center">Exam Score</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map(s => {
                      const scoreData = scores.find(sc => sc.studentId === showStudentReport.id && sc.subjectId === s.id);
                      const classScore = scoreData?.classScore || 0;
                      const examScore = scoreData?.examScore || 0;
                      const totalScore = classScore + examScore;
                      const grade = totalScore > 0 ? getGrade(totalScore, showStudentReport.grade) : "-";
                      const remark = totalScore >= 80 ? "Excellent" : totalScore >= 70 ? "Very Good" : totalScore >= 60 ? "Good" : totalScore >= 50 ? "Pass" : totalScore > 0 ? "Fail" : "-";
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell className="text-center">{classScore || "-"}</TableCell>
                          <TableCell className="text-center">{examScore || "-"}</TableCell>
                          <TableCell className="text-center font-medium">{totalScore || "-"}</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${totalScore >= 50 ? 'bg-green-100 text-green-800' : totalScore > 0 ? 'bg-red-100 text-red-800' : ''}`}>
                              {grade}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs">{remark}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <p className="text-lg font-bold">Total: {studentTotal} / {maxPossible}</p>
                      <p className="text-sm text-muted-foreground">
                        Percentage: {studentPercentage}% - 
                        <span className={`ml-1 font-medium ${studentPercentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                          {studentPercentage >= 80 ? "Excellent" : studentPercentage >= 70 ? "Very Good" : studentPercentage >= 60 ? "Good" : studentPercentage >= 50 ? "Pass" : "Needs Improvement"}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">Position: {getStudentPosition(showStudentReport.id)} of {classStudents.length}</p>
                    </div>
                    <Button 
                      className="gap-2"
                      onClick={() => printStudentReport(showStudentReport)}
                      data-testid="button-print-student-report"
                    >
                      <FileDown className="h-4 w-4" /> Download PDF
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-4 text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Class Teacher's Comments:</p>
                  <div className="border border-dashed border-gray-300 rounded p-3 min-h-[40px] bg-white"></div>
                  <p className="font-medium mt-3 mb-2">Headmaster's Comments:</p>
                  <div className="border border-dashed border-gray-300 rounded p-3 min-h-[40px] bg-white"></div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

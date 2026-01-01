import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BASIC_1_6_GRADING_SCALE, GES_GRADING_SCALE } from "@/lib/mock-data";
import { Save, Upload, FileDown, AlertCircle, CheckCircle, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { studentsApi, subjectsApi, academicTermsApi, scoresApi, teacherAssignmentsApi, teachersApi } from "@/lib/api";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classLevel: string;
  isClassTeacher: boolean;
}

export default function ScoreEntry() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [scores, setScores] = useState<Record<string, { class: string, exam: string, id?: string }>>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const { toast } = useToast();
  const { role, userId, teacherInfo } = useAuth();

  const isTeacher = role === "teacher";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsData, subjectsData, termsData] = await Promise.all([
        studentsApi.getAll(),
        subjectsApi.getAll(),
        academicTermsApi.getAll(),
      ]);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setTerms(termsData);
      
      const activeTerm = termsData.find(t => t.status === "Active");
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }

      if (isTeacher && userId) {
        const teachers = await teachersApi.getAll();
        const teacher = teachers.find(t => t.userId === userId);
        if (teacher) {
          setCurrentTeacherId(teacher.id);
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

  const getAvailableClasses = () => {
    if (isTeacher && teacherAssignments.length > 0) {
      const assignedClasses = Array.from(new Set(teacherAssignments.map(a => a.classLevel)));
      return assignedClasses.filter(cls => students.some(s => s.grade === cls));
    }
    return Array.from(new Set(students.map(s => s.grade))).sort((a, b) => {
      const getOrder = (grade: string) => {
        if (grade.startsWith("KG")) return parseInt(grade.replace(/[^0-9]/g, "") || "0");
        if (grade.startsWith("Basic")) return 10 + parseInt(grade.replace(/[^0-9]/g, "") || "0");
        return 100;
      };
      return getOrder(a) - getOrder(b);
    });
  };

  const getAvailableSubjects = () => {
    if (isTeacher && teacherAssignments.length > 0 && selectedClass) {
      const assignedSubjectIds = teacherAssignments
        .filter(a => a.classLevel === selectedClass)
        .map(a => a.subjectId);
      return subjects.filter(s => assignedSubjectIds.includes(s.id));
    }
    return subjects;
  };

  const availableClasses = getAvailableClasses();
  const availableSubjects = getAvailableSubjects();
  const classStudents = students.filter(s => s.grade === selectedClass);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm) {
      loadScores();
    }
  }, [selectedClass, selectedSubject, selectedTerm]);

  useEffect(() => {
    setSelectedSubject("");
  }, [selectedClass]);

  const loadScores = async () => {
    try {
      const allScores = await scoresApi.getByTerm(selectedTerm);
      const initialScores: Record<string, { class: string, exam: string, id?: string }> = {};
      
      classStudents.forEach(student => {
        const existingScore = allScores.find(
          s => s.studentId === student.id && s.subjectId === selectedSubject
        );
        if (existingScore) {
          initialScores[student.id] = {
            class: (existingScore.classScore || 0).toString(),
            exam: (existingScore.examScore || 0).toString(),
            id: existingScore.id,
          };
        } else {
          initialScores[student.id] = { class: "", exam: "" };
        }
      });
      
      setScores(initialScores);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load scores",
        variant: "destructive",
      });
    }
  };

  const getMaxScore = (type: 'class' | 'exam') => {
    const basicNum = parseInt(selectedClass.replace(/[^0-9]/g, "") || "0");
    const is1to6 = basicNum >= 1 && basicNum <= 6;
    if (type === 'class') return is1to6 ? 50 : 30;
    return is1to6 ? 50 : 70;
  };

  const handleScoreChange = (studentId: string, type: 'class' | 'exam', value: string) => {
    let numValue = parseInt(value) || 0;
    if (numValue < 0) numValue = 0;
    const maxVal = getMaxScore(type);
    if (numValue > maxVal) numValue = maxVal;
    
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [type]: numValue > 0 ? numValue.toString() : value === "" ? "" : "0"
      }
    }));
  };

  const handleSave = async () => {
    try {
      const promises = classStudents.map(async student => {
        const studentScore = scores[student.id];
        if (!studentScore || (!studentScore.class && !studentScore.exam)) return;

        const classScore = parseInt(studentScore.class || "0");
        const examScore = parseInt(studentScore.exam || "0");

        const scoreData = {
          studentId: student.id,
          subjectId: selectedSubject,
          termId: selectedTerm,
          classScore,
          examScore,
          totalScore: classScore + examScore,
        };

        if (studentScore.id) {
          await scoresApi.update(studentScore.id, scoreData);
        } else {
          await scoresApi.create(scoreData);
        }
      });

      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: "Scores saved successfully!",
      });
      
      await loadScores();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save scores",
        variant: "destructive",
      });
    }
  };

  const getGrade = (total: number, classLevel: string) => {
    const basicNum = parseInt(classLevel.replace(/[^0-9]/g, ""));
    const scale = basicNum >= 1 && basicNum <= 6 ? BASIC_1_6_GRADING_SCALE : GES_GRADING_SCALE;
    const entry = scale.find(g => total >= g.range[0] && total <= g.range[1]);
    return entry ? entry.grade : "F";
  };

  const isBasic1to6 = (() => {
    const basicNum = parseInt(selectedClass.replace(/[^0-9]/g, "") || "0");
    return basicNum >= 1 && basicNum <= 6;
  })();

  const getClassStats = () => {
    const studentsWithScores = classStudents.filter(s => {
      const score = scores[s.id];
      return score && (parseInt(score.class || "0") > 0 || parseInt(score.exam || "0") > 0);
    });
    
    if (studentsWithScores.length === 0) {
      return { average: 0, passed: 0, failed: 0, total: classStudents.length };
    }
    
    const totals = studentsWithScores.map(s => {
      const score = scores[s.id];
      return parseInt(score?.class || "0") + parseInt(score?.exam || "0");
    });
    
    const average = totals.reduce((a, b) => a + b, 0) / totals.length;
    const passed = totals.filter(t => t >= 50).length;
    const failed = totals.filter(t => t < 50).length;
    
    return { average: Math.round(average * 10) / 10, passed, failed, total: classStudents.length, entered: studentsWithScores.length };
  };

  const classStats = getClassStats();

  const exportScoresToCSV = () => {
    if (!selectedClass || !selectedSubject || !selectedTerm) {
      toast({
        title: "Error",
        description: "Please select class, subject, and term first",
        variant: "destructive",
      });
      return;
    }

    const subjectName = subjects.find(s => s.id === selectedSubject)?.name || "";
    const termName = terms.find(t => t.id === selectedTerm)?.name || "";
    
    const headers = ["STUDENT_ID", "STUDENT_NAME", "CLASS_SCORE", "EXAM_SCORE"];
    const rows = classStudents.map(s => {
      const studentScore = scores[s.id] || { class: "", exam: "" };
      return [s.studentId, s.name, studentScore.class || "0", studentScore.exam || "0"];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scores_${selectedClass}_${subjectName}_${termName}_${new Date().toISOString().split("T")[0]}.csv`.replace(/\s+/g, "_");
    a.click();
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedClass || !selectedSubject || !selectedTerm) {
      setCsvError("Please select class, subject, and term before importing");
      return;
    }

    setCsvError("");
    setCsvSuccess("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        
        if (lines.length < 2) {
          setCsvError("CSV file must have a header row and at least one data row");
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
        const studentIdIdx = headers.findIndex(h => h === "STUDENT_ID" || h === "STUDENTID" || h === "ID");
        const studentNameIdx = headers.findIndex(h => h === "STUDENT_NAME" || h === "NAME" || h === "STUDENTNAME");
        const classScoreIdx = headers.findIndex(h => h === "CLASS_SCORE" || h === "CLASSSCORE" || h === "CLASS");
        const examScoreIdx = headers.findIndex(h => h === "EXAM_SCORE" || h === "EXAMSCORE" || h === "EXAM");

        if (studentIdIdx === -1 && studentNameIdx === -1) {
          setCsvError("CSV must have STUDENT_ID or STUDENT_NAME column");
          return;
        }
        if (classScoreIdx === -1 && examScoreIdx === -1) {
          setCsvError("CSV must have CLASS_SCORE or EXAM_SCORE column");
          return;
        }

        let updated = 0;
        let created = 0;
        let errors = 0;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          
          let student: any = null;
          if (studentIdIdx >= 0 && values[studentIdIdx]) {
            student = classStudents.find(s => s.studentId === values[studentIdIdx]);
          }
          if (!student && studentNameIdx >= 0 && values[studentNameIdx]) {
            const searchName = values[studentNameIdx].toLowerCase();
            student = classStudents.find(s => s.name.toLowerCase().includes(searchName) || searchName.includes(s.name.toLowerCase()));
          }
          
          if (!student) {
            errors++;
            continue;
          }

          const classScore = classScoreIdx >= 0 ? parseInt(values[classScoreIdx] || "0") : 0;
          const examScore = examScoreIdx >= 0 ? parseInt(values[examScoreIdx] || "0") : 0;

          try {
            const existingScore = scores[student.id];
            const scoreData = {
              studentId: student.id,
              subjectId: selectedSubject,
              termId: selectedTerm,
              classScore,
              examScore,
              totalScore: classScore + examScore,
            };

            if (existingScore?.id) {
              await scoresApi.update(existingScore.id, scoreData);
              updated++;
            } else {
              await scoresApi.create(scoreData);
              created++;
            }
          } catch (err) {
            console.error("Failed to import score for:", student.name, err);
            errors++;
          }
        }

        setCsvSuccess(`Imported: ${created} new, ${updated} updated${errors > 0 ? `, ${errors} errors` : ""}`);
        loadScores();
      } catch (err) {
        setCsvError("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedClass || !selectedSubject || !selectedTerm) {
      setCsvError("Please select class, subject, and term before importing");
      return;
    }

    setCsvError("");
    setCsvSuccess("");

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    if (!isExcel) {
      handleCSVImport(event);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        if (jsonData.length < 2) {
          setCsvError("Excel file must have a header row and at least one data row");
          return;
        }

        const headers = jsonData[0].map((h: string) => String(h).trim().toUpperCase());
        const studentIdIdx = headers.findIndex(h => h === "STUDENT_ID" || h === "STUDENTID" || h === "ID");
        const studentNameIdx = headers.findIndex(h => h === "STUDENT_NAME" || h === "NAME" || h === "STUDENTNAME");
        const classScoreIdx = headers.findIndex(h => h === "CLASS_SCORE" || h === "CLASSSCORE" || h === "CLASS");
        const examScoreIdx = headers.findIndex(h => h === "EXAM_SCORE" || h === "EXAMSCORE" || h === "EXAM");

        if (studentIdIdx === -1 && studentNameIdx === -1) {
          setCsvError("Excel must have STUDENT_ID or STUDENT_NAME column");
          return;
        }
        if (classScoreIdx === -1 && examScoreIdx === -1) {
          setCsvError("Excel must have CLASS_SCORE or EXAM_SCORE column");
          return;
        }

        let updated = 0;
        let created = 0;
        let errors = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const values = jsonData[i].map(v => String(v || "").trim());
          
          let student: any = null;
          if (studentIdIdx >= 0 && values[studentIdIdx]) {
            student = classStudents.find(s => s.studentId === values[studentIdIdx]);
          }
          if (!student && studentNameIdx >= 0 && values[studentNameIdx]) {
            const searchName = values[studentNameIdx].toLowerCase();
            student = classStudents.find(s => s.name.toLowerCase().includes(searchName) || searchName.includes(s.name.toLowerCase()));
          }
          
          if (!student) {
            errors++;
            continue;
          }

          const classScore = Math.min(classScoreIdx >= 0 ? parseInt(values[classScoreIdx] || "0") : 0, getMaxScore('class'));
          const examScore = Math.min(examScoreIdx >= 0 ? parseInt(values[examScoreIdx] || "0") : 0, getMaxScore('exam'));

          try {
            const existingScore = scores[student.id];
            const scoreData = {
              studentId: student.id,
              subjectId: selectedSubject,
              termId: selectedTerm,
              classScore: Math.max(0, classScore),
              examScore: Math.max(0, examScore),
              totalScore: Math.max(0, classScore) + Math.max(0, examScore),
            };

            if (existingScore?.id) {
              await scoresApi.update(existingScore.id, scoreData);
              updated++;
            } else {
              await scoresApi.create(scoreData);
              created++;
            }
          } catch (err) {
            console.error("Failed to import score for:", student.name, err);
            errors++;
          }
        }

        setCsvSuccess(`Imported: ${created} new, ${updated} updated${errors > 0 ? `, ${errors} errors` : ""}`);
        loadScores();
      } catch (err) {
        setCsvError("Failed to parse Excel file");
      }
    };
    reader.readAsBinaryString(file);
    event.target.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isTeacher && teacherAssignments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Score Entry</h1>
          <p className="text-muted-foreground mt-1">Enter class and exam scores for students.</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">No Class Assignments</p>
            <p className="text-sm text-muted-foreground mt-2">
              You have not been assigned to any classes yet. Please contact your administrator to get assigned to classes and subjects.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Score Entry</h1>
        <p className="text-muted-foreground mt-1">
          {isTeacher 
            ? "Enter scores for your assigned classes and subjects."
            : "Enter class and exam scores for all students in a subject."
          }
        </p>
      </div>

      {isTeacher && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 ml-2">
            You can only enter scores for the classes and subjects assigned to you. 
            Showing {availableClasses.length} class(es) and {availableSubjects.length} subject(s) based on your assignments.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Select Class, Subject & Term</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Academic Term</Label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger data-testid="select-term">
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.status === "Active" && "(Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class {isTeacher && "(Assigned)"}</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger data-testid="select-class">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.length > 0 ? (
                  availableClasses.map(cls => (
                    <SelectItem key={cls} value={cls}>
                      {cls} ({students.filter(s => s.grade === cls).length} students)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>No classes available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject {isTeacher && "(Assigned)"}</Label>
            <Select 
              value={selectedSubject} 
              onValueChange={setSelectedSubject}
              disabled={!selectedClass}
            >
              <SelectTrigger data-testid="select-subject">
                <SelectValue placeholder={selectedClass ? "Select Subject" : "Select class first"} />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.length > 0 ? (
                  availableSubjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>No subjects available for this class</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedSubject && selectedTerm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>{selectedClass} - Score Entry</CardTitle>
              <CardDescription>
                {isBasic1to6 ? "Basic 1-6 (50% Class + 50% Exam)" : "Basic 7-9 (30% Class + 70% Exam)"}
              </CardDescription>
              {classStats.entered !== undefined && classStats.entered > 0 && (
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    Avg: {classStats.average}%
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                    Pass: {classStats.passed}
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                    Fail: {classStats.failed}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    Entered: {classStats.entered}/{classStats.total}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={exportScoresToCSV} className="gap-2" data-testid="button-export-scores-csv">
                <FileDown className="h-4 w-4" /> Export CSV
              </Button>
              
              <Dialog open={showImportDialog} onOpenChange={(open) => { setShowImportDialog(open); if (!open) { setCsvError(""); setCsvSuccess(""); } }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="button-import-scores">
                    <Upload className="h-4 w-4" /> Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Import Scores from CSV or Excel</DialogTitle>
                    <DialogDescription>
                      Upload a CSV or Excel file with STUDENT_ID or STUDENT_NAME, plus CLASS_SCORE and/or EXAM_SCORE columns.
                      Scores will be imported for the currently selected class, subject, and term.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {csvError && (
                      <Alert variant="destructive" className="bg-red-50 border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 ml-2">{csvError}</AlertDescription>
                      </Alert>
                    )}
                    {csvSuccess && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 ml-2">{csvSuccess}</AlertDescription>
                      </Alert>
                    )}
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileImport}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        data-testid="input-import-scores"
                      />
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload CSV or Excel file</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Importing for: {selectedClass} - {subjects.find(s => s.id === selectedSubject)?.name}
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button onClick={handleSave} className="gap-2" data-testid="button-save-scores">
                <Save className="h-4 w-4" /> Save Scores
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Student Name</TableHead>
                  <TableHead>Class Score {isBasic1to6 ? "(50%)" : "(30%)"}</TableHead>
                  <TableHead>Exam Score {isBasic1to6 ? "(50%)" : "(70%)"}</TableHead>
                  <TableHead>Total (100%)</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map(student => {
                  const classScore = parseInt(scores[student.id]?.class || "0");
                  const examScore = parseInt(scores[student.id]?.exam || "0");
                  const total = classScore + examScore;
                  
                  return (
                    <TableRow key={student.id} data-testid={`row-score-${student.id}`}>
                      <TableCell className="font-medium">
                        <div>{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.studentId}</div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24" 
                          min={0}
                          max={getMaxScore('class')}
                          value={scores[student.id]?.class || ""}
                          onChange={(e) => handleScoreChange(student.id, 'class', e.target.value)}
                          data-testid={`input-class-score-${student.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24" 
                          min={0}
                          max={getMaxScore('exam')}
                          value={scores[student.id]?.exam || ""}
                          onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                          data-testid={`input-exam-score-${student.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-bold" data-testid={`text-total-${student.id}`}>
                        {total > 0 ? total : "-"}
                      </TableCell>
                      <TableCell>
                        {total > 0 ? (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${total < 50 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`} data-testid={`text-grade-${student.id}`}>
                            {getGrade(total, selectedClass)}
                          </span>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {classStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No students found in {selectedClass}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

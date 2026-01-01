import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, LogOut, User, CheckCircle, Loader2, Users, UserCheck } from "lucide-react";
import { useLocation } from "wouter";
import { subjectsApi, academicTermsApi, teacherAssignmentsApi, teachersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { BASIC_1_6_GRADING_SCALE, GES_GRADING_SCALE } from "@/lib/mock-data";

interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classLevel: string;
  isClassTeacher: boolean;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  grade: string;
}

interface Term {
  id: string;
  name: string;
  status: string;
}

interface ScoreData {
  classScore: string;
  examScore: string;
  id?: string;
}

export default function TeacherDashboard() {
  const { username, logout, teacherInfo } = useAuth();
  const teacherId = teacherInfo?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [entryMode, setEntryMode] = useState<"batch" | "single">("batch");
  const [scores, setScores] = useState<Record<string, ScoreData>>({});
  
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    fetchInitialData();
  }, [teacherId]);

  const fetchInitialData = async () => {
    try {
      const [subjectsData, termsData] = await Promise.all([
        subjectsApi.getAll(),
        academicTermsApi.getAll(),
      ]);
      
      setSubjects(subjectsData);
      setTerms(termsData);
      
      const active = termsData.find((t: Term) => t.status === "Active");
      setActiveTerm(active || null);
      
      if (teacherId) {
        const assignmentsData = await teacherAssignmentsApi.getByTeacher(teacherId);
        setAssignments(assignmentsData);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueClasses = Array.from(new Set(assignments.map(a => a.classLevel)));
  
  const subjectsForSelectedClass = assignments
    .filter(a => a.classLevel === selectedClass)
    .map(a => subjects.find(s => s.id === a.subjectId))
    .filter(Boolean) as Subject[];

  const classStudents = students.filter(s => s.grade === selectedClass);
  const singleStudent = classStudents.find(s => s.id === selectedStudent);

  useEffect(() => {
    if (selectedClass && teacherId) {
      loadStudentsForClass();
    }
  }, [selectedClass, teacherId]);

  useEffect(() => {
    if (selectedClass && selectedSubject && activeTerm && teacherId) {
      loadExistingScores();
    }
  }, [selectedClass, selectedSubject, activeTerm, teacherId]);

  const loadStudentsForClass = async () => {
    if (!teacherId) return;
    try {
      const response = await fetch(`/api/teachers/${teacherId}/students?classLevel=${encodeURIComponent(selectedClass)}`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  const loadExistingScores = async () => {
    if (!activeTerm || !teacherId) return;
    
    try {
      const response = await fetch(
        `/api/teachers/${teacherId}/scores?termId=${activeTerm.id}&classLevel=${encodeURIComponent(selectedClass)}&subjectId=${selectedSubject}`
      );
      if (!response.ok) return;
      
      const allScores = await response.json();
      const initialScores: Record<string, ScoreData> = {};
      
      classStudents.forEach(student => {
        const existingScore = allScores.find(
          (s: any) => s.studentId === student.id && s.subjectId === selectedSubject
        );
        if (existingScore) {
          initialScores[student.id] = {
            classScore: (existingScore.classScore || 0).toString(),
            examScore: (existingScore.examScore || 0).toString(),
            id: existingScore.id,
          };
        } else {
          initialScores[student.id] = { classScore: "", examScore: "" };
        }
      });
      
      setScores(initialScores);
    } catch (error) {
      console.error("Failed to load scores:", error);
    }
  };

  const autoSaveScore = useCallback(async (studentId: string, scoreData: ScoreData) => {
    if (!activeTerm || !selectedSubject || !teacherId) return;
    
    const classScore = parseInt(scoreData.classScore || "0");
    const examScore = parseInt(scoreData.examScore || "0");
    
    if (classScore === 0 && examScore === 0 && !scoreData.id) return;
    
    setSaving(studentId);
    
    try {
      const response = await fetch(`/api/teachers/${teacherId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          subjectId: selectedSubject,
          termId: activeTerm.id,
          classScore,
          examScore,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setScores(prev => ({
          ...prev,
          [studentId]: { ...prev[studentId], id: result.id }
        }));
        toast({
          title: "Saved",
          description: "Score saved automatically",
          duration: 1500,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save score",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }, [activeTerm, selectedSubject, teacherId, toast]);

  const handleScoreChange = (studentId: string, type: 'classScore' | 'examScore', value: string) => {
    const numValue = parseInt(value) || 0;
    const maxValue = type === 'classScore' ? 40 : 60;
    if (numValue < 0 || numValue > maxValue) return;
    
    const newScores = {
      ...scores,
      [studentId]: {
        ...scores[studentId],
        [type]: value
      }
    };
    setScores(newScores);
    
    if (saveTimeoutRef.current[studentId]) {
      clearTimeout(saveTimeoutRef.current[studentId]);
    }
    
    saveTimeoutRef.current[studentId] = setTimeout(() => {
      autoSaveScore(studentId, newScores[studentId]);
    }, 800);
  };

  const getGrade = (total: number) => {
    const basicNum = parseInt(selectedClass.replace(/[^0-9]/g, ""));
    const scale = basicNum >= 1 && basicNum <= 6 ? BASIC_1_6_GRADING_SCALE : GES_GRADING_SCALE;
    const entry = scale.find(g => total >= g.range[0] && total <= g.range[1]);
    return entry ? entry.grade : "-";
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const renderScoreRow = (student: Student) => {
    const studentScore = scores[student.id] || { classScore: "", examScore: "" };
    const classScore = parseInt(studentScore.classScore || "0");
    const examScore = parseInt(studentScore.examScore || "0");
    const total = classScore + examScore;
    const grade = total > 0 ? getGrade(total) : "-";
    
    return (
      <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
        <TableCell className="font-mono text-sm">{student.studentId}</TableCell>
        <TableCell className="font-medium">{student.name}</TableCell>
        <TableCell>
          <Input
            type="number"
            min="0"
            max="40"
            placeholder="0"
            value={studentScore.classScore}
            onChange={(e) => handleScoreChange(student.id, 'classScore', e.target.value)}
            className="h-9 text-center w-20"
            data-testid={`input-class-score-${student.id}`}
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min="0"
            max="60"
            placeholder="0"
            value={studentScore.examScore}
            onChange={(e) => handleScoreChange(student.id, 'examScore', e.target.value)}
            className="h-9 text-center w-20"
            data-testid={`input-exam-score-${student.id}`}
          />
        </TableCell>
        <TableCell className="text-center font-semibold">{total > 0 ? total : "-"}</TableCell>
        <TableCell className="text-center">
          <Badge variant={grade === "-" ? "outline" : "secondary"}>{grade}</Badge>
        </TableCell>
        <TableCell>
          {saving === student.id ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : studentScore.id ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : null}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b bg-white/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <p className="font-semibold text-foreground">{username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setLocation("/profile")} data-testid="button-profile">
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Terminal Report - Exam & Assessment Grades</h1>
            <p className="text-muted-foreground mt-1">Enter exam scores and class assessment marks to generate final grades</p>
          </div>

          {activeTerm && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm py-1 px-3">
                Current Term: {activeTerm.name}
              </Badge>
              <span className="text-sm text-muted-foreground">(Set by administrator)</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Class & Subject
              </CardTitle>
              <CardDescription>Choose from your assigned classes and subjects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Class</Label>
                  <Select value={selectedClass} onValueChange={(val) => { 
                    setSelectedClass(val); 
                    setSelectedSubject(""); 
                    setSelectedStudent("");
                    setScores({});
                  }}>
                    <SelectTrigger data-testid="select-class">
                      <SelectValue placeholder="Choose your assigned class" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueClasses.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Subject</Label>
                  <Select 
                    value={selectedSubject} 
                    onValueChange={(val) => {
                      setSelectedSubject(val);
                      setScores({});
                    }}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger data-testid="select-subject">
                      <SelectValue placeholder={selectedClass ? "Choose subject" : "Select a class first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsForSelectedClass.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name} ({sub.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedClass && selectedSubject && (
                <div className="pt-4 border-t">
                  <Label className="mb-2 block">Entry Mode</Label>
                  <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as "batch" | "single")}>
                    <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                      <TabsTrigger value="batch" className="gap-2">
                        <Users className="h-4 w-4" />
                        All Students (Batch)
                      </TabsTrigger>
                      <TabsTrigger value="single" className="gap-2">
                        <UserCheck className="h-4 w-4" />
                        Single Student
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedClass && selectedSubject && entryMode === "single" && (
            <Card>
              <CardHeader>
                <CardTitle>Select Student</CardTitle>
                <CardDescription>Choose a student to enter their scores individually</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger data-testid="select-student">
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {classStudents.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.studentId} - {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {singleStudent && (
                  <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                    <h3 className="font-semibold mb-4">{singleStudent.name} ({singleStudent.studentId})</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Class Score (max 40)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="40"
                          placeholder="0"
                          value={scores[singleStudent.id]?.classScore || ""}
                          onChange={(e) => handleScoreChange(singleStudent.id, 'classScore', e.target.value)}
                          className="text-lg h-12"
                          data-testid="input-single-class-score"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Exam Score (max 60)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="60"
                          placeholder="0"
                          value={scores[singleStudent.id]?.examScore || ""}
                          onChange={(e) => handleScoreChange(singleStudent.id, 'examScore', e.target.value)}
                          className="text-lg h-12"
                          data-testid="input-single-exam-score"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="text-lg">
                        Total: <span className="font-bold">
                          {(parseInt(scores[singleStudent.id]?.classScore || "0") + parseInt(scores[singleStudent.id]?.examScore || "0")) || "-"}
                        </span>
                      </div>
                      <div className="text-lg">
                        Grade: <Badge variant="secondary" className="text-lg px-3">
                          {getGrade(parseInt(scores[singleStudent.id]?.classScore || "0") + parseInt(scores[singleStudent.id]?.examScore || "0"))}
                        </Badge>
                      </div>
                      {saving === singleStudent.id && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </div>
                      )}
                      {scores[singleStudent.id]?.id && saving !== singleStudent.id && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Saved
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedClass && selectedSubject && entryMode === "batch" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Students in {selectedClass} - {subjects.find(s => s.id === selectedSubject)?.name}
                </CardTitle>
                <CardDescription>
                  Enter Class Score (CA) and Exam Score for each student. Scores are saved automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {classStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No students found in {selectedClass}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">ID</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="w-[100px] text-center">Class (40)</TableHead>
                          <TableHead className="w-[100px] text-center">Exam (60)</TableHead>
                          <TableHead className="w-[80px] text-center">Total</TableHead>
                          <TableHead className="w-[80px] text-center">Grade</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudents.map(renderScoreRow)}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {assignments.length > 0 && !selectedClass && (
            <Card>
              <CardHeader>
                <CardTitle>My Assignments</CardTitle>
                <CardDescription>Subjects and classes assigned to you by the administrator</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {assignments.map(a => {
                    const subject = subjects.find(s => s.id === a.subjectId);
                    return (
                      <Badge key={a.id} variant="outline" className="py-1.5 px-3">
                        {subject?.name || "Unknown"} - {a.classLevel}
                        {a.isClassTeacher && <span className="ml-1 text-blue-600">(Class Teacher)</span>}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {assignments.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No assignments yet</p>
                <p className="text-sm">Please contact your administrator to assign classes and subjects to you.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

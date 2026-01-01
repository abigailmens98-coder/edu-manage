import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, LogOut, User, CheckCircle, Loader2, Users } from "lucide-react";
import { useLocation } from "wouter";
import { studentsApi, subjectsApi, academicTermsApi, scoresApi, teacherAssignmentsApi, teachersApi } from "@/lib/api";
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
  const [scores, setScores] = useState<Record<string, { classScore: string; examScore: string; id?: string }>>({});
  
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    fetchInitialData();
  }, [teacherId]);

  const fetchInitialData = async () => {
    try {
      const [subjectsData, termsData, studentsData] = await Promise.all([
        subjectsApi.getAll(),
        academicTermsApi.getAll(),
        studentsApi.getAll(),
      ]);
      
      setSubjects(subjectsData);
      setTerms(termsData);
      setStudents(studentsData);
      
      const active = termsData.find((t: Term) => t.status === "Active");
      setActiveTerm(active || null);
      
      if (teacherId) {
        const assignmentsData = await teacherAssignmentsApi.getByTeacher(teacherId);
        setAssignments(assignmentsData);
        
        if (assignmentsData.length === 0) {
          const teachers = await teachersApi.getAll();
          const teacher = teachers.find((t: any) => t.id === teacherId);
          if (teacher?.assignedClass) {
            setSelectedClass(teacher.assignedClass);
          }
        }
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

  useEffect(() => {
    if (selectedClass && selectedSubject && activeTerm) {
      loadExistingScores();
    }
  }, [selectedClass, selectedSubject, activeTerm]);

  const loadExistingScores = async () => {
    if (!activeTerm) return;
    
    try {
      const allScores = await scoresApi.getByTerm(activeTerm.id);
      const initialScores: Record<string, { classScore: string; examScore: string; id?: string }> = {};
      
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

  const autoSaveScore = useCallback(async (studentId: string, scoreData: { classScore: string; examScore: string; id?: string }) => {
    if (!activeTerm || !selectedSubject) return;
    
    const classScore = parseInt(scoreData.classScore || "0");
    const examScore = parseInt(scoreData.examScore || "0");
    
    if (classScore === 0 && examScore === 0 && !scoreData.id) return;
    
    setSaving(studentId);
    
    try {
      const data = {
        studentId,
        subjectId: selectedSubject,
        termId: activeTerm.id,
        classScore,
        examScore,
        totalScore: classScore + examScore,
      };
      
      if (scoreData.id) {
        await scoresApi.update(scoreData.id, data);
      } else {
        const created = await scoresApi.create(data);
        setScores(prev => ({
          ...prev,
          [studentId]: { ...prev[studentId], id: created.id }
        }));
      }
      
      toast({
        title: "Saved",
        description: "Score saved automatically",
        duration: 1500,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save score",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }, [activeTerm, selectedSubject, toast]);

  const handleScoreChange = (studentId: string, type: 'classScore' | 'examScore', value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0 || numValue > 100) return;
    
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
    }, 1000);
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

  const handleProfileClick = () => {
    setLocation("/profile");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
          <Button variant="outline" className="gap-2" onClick={handleProfileClick} data-testid="button-profile">
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
            <h1 className="text-3xl font-serif font-bold text-foreground">Score Entry Portal</h1>
            <p className="text-muted-foreground mt-1">Enter class and exam scores for your assigned classes</p>
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
              <CardDescription>Choose the class you want to work with, then select the subject to enter scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Class</Label>
                  <Select value={selectedClass} onValueChange={(val) => { setSelectedClass(val); setSelectedSubject(""); }}>
                    <SelectTrigger data-testid="select-class">
                      <SelectValue placeholder="Choose your assigned class" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueClasses.length > 0 ? (
                        uniqueClasses.map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))
                      ) : (
                        Array.from(new Set(students.map(s => s.grade))).map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Subject</Label>
                  <Select 
                    value={selectedSubject} 
                    onValueChange={setSelectedSubject}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger data-testid="select-subject">
                      <SelectValue placeholder={selectedClass ? "Choose subject" : "Select a class first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsForSelectedClass.length > 0 ? (
                        subjectsForSelectedClass.map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name} ({sub.code})</SelectItem>
                        ))
                      ) : (
                        subjects.map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name} ({sub.code})</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedClass && selectedSubject && (
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
                          <TableHead className="w-[120px] text-center">Class Score (40)</TableHead>
                          <TableHead className="w-[120px] text-center">Exam Score (60)</TableHead>
                          <TableHead className="w-[80px] text-center">Total</TableHead>
                          <TableHead className="w-[80px] text-center">Grade</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudents.map((student) => {
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
                                  className="h-9 text-center"
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
                                  className="h-9 text-center"
                                  data-testid={`input-exam-score-${student.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-center font-semibold">{total > 0 ? total : "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={grade === "-" ? "outline" : "secondary"}>
                                  {grade}
                                </Badge>
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
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {assignments.length > 0 && (
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
        </div>
      </main>
    </div>
  );
}

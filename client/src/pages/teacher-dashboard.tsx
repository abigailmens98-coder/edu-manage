import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, LogOut, User, CheckCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { subjectsApi, academicTermsApi, teacherAssignmentsApi } from "@/lib/api";
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
  
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
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
      
      // Auto-select active term
      const active = termsData.find((t: Term) => t.status === "Active");
      if (active) {
        setSelectedTerm(active.id);
      }
      
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

  useEffect(() => {
    if (selectedClass && teacherId) {
      loadStudentsForClass();
    }
  }, [selectedClass, teacherId]);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm && teacherId) {
      loadExistingScores();
    }
  }, [selectedClass, selectedSubject, selectedTerm, teacherId]);

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
    if (!selectedTerm || !teacherId) return;
    
    try {
      const response = await fetch(
        `/api/teachers/${teacherId}/scores?termId=${selectedTerm}&classLevel=${encodeURIComponent(selectedClass)}&subjectId=${selectedSubject}`
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
    if (!selectedTerm || !selectedSubject || !teacherId) return;
    
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
          termId: selectedTerm,
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
  }, [selectedTerm, selectedSubject, teacherId, toast]);

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

  const currentTerm = terms.find(t => t.id === selectedTerm);
  const currentSubject = subjects.find(s => s.id === selectedSubject);

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
            <h1 className="text-3xl font-serif font-bold text-foreground">Score Entry</h1>
            <p className="text-muted-foreground mt-1">Enter class scores and exam scores for students</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select Class, Term & Subject</CardTitle>
              <CardDescription>Choose from your assigned classes to enter scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={(val) => { 
                    setSelectedClass(val); 
                    setSelectedSubject("");
                    setScores({});
                  }}>
                    <SelectTrigger data-testid="select-class">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueClasses.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger data-testid="select-term">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map(term => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.name} {term.status === "Active" && "(Active)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select 
                    value={selectedSubject} 
                    onValueChange={(val) => {
                      setSelectedSubject(val);
                      setScores({});
                    }}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger data-testid="select-subject">
                      <SelectValue placeholder={selectedClass ? "Select subject" : "Select class first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsForSelectedClass.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedClass && selectedTerm && selectedSubject && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedClass} - {currentSubject?.name}</CardTitle>
                    <CardDescription>{currentTerm?.name}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {classStudents.length} Students
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {classStudents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No students found in {selectedClass}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[80px] font-semibold">Number</TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="w-[140px] text-center font-semibold">Class Score</TableHead>
                          <TableHead className="w-[140px] text-center font-semibold">Exam</TableHead>
                          <TableHead className="w-[100px] text-center font-semibold">Total %</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudents.map((student, index) => {
                          const studentScore = scores[student.id] || { classScore: "", examScore: "" };
                          const classScore = parseInt(studentScore.classScore || "0");
                          const examScore = parseInt(studentScore.examScore || "0");
                          const total = classScore + examScore;
                          
                          return (
                            <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                              <TableCell className="font-medium text-muted-foreground">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-medium">
                                {student.name}
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="40"
                                  placeholder=""
                                  value={studentScore.classScore}
                                  onChange={(e) => handleScoreChange(student.id, 'classScore', e.target.value)}
                                  className="h-10 text-center border-gray-300"
                                  data-testid={`input-class-score-${student.id}`}
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="60"
                                  placeholder=""
                                  value={studentScore.examScore}
                                  onChange={(e) => handleScoreChange(student.id, 'examScore', e.target.value)}
                                  className="h-10 text-center border-gray-300"
                                  data-testid={`input-exam-score-${student.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-semibold text-lg">
                                  {total > 0 ? total : ""}
                                </span>
                              </TableCell>
                              <TableCell>
                                {saving === student.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
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

          {assignments.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No classes assigned</p>
                <p className="text-sm">Please contact your administrator to assign classes and subjects to you.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

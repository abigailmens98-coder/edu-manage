import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, LogOut, CheckCircle, AlertCircle, User, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { MOCK_SUBJECTS, MOCK_STUDENTS, getGESGrade, ACADEMIC_TERMS } from "@/lib/mock-data";

interface StudentGrade {
  studentId: string;
  studentName: string;
  grade: string;
}

export default function TeacherDashboard() {
  const { username, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>(ACADEMIC_TERMS[0]?.id || "");
  const [grades, setGrades] = useState<StudentGrade[]>(
    MOCK_STUDENTS.map(s => ({ studentId: s.id, studentName: s.name, grade: "" }))
  );
  const [submitted, setSubmitted] = useState(false);

  const teacherSubjects = MOCK_SUBJECTS.filter(s => 
    s.teacher === "Dr. Sarah Conner" || s.teacher === "Prof. Alan Grant"
  );

  const handleGradeChange = (studentId: string, value: string) => {
    setGrades(grades.map(g => 
      g.studentId === studentId ? { ...g, grade: value } : g
    ));
  };

  const handleSubmitGrades = () => {
    const allFilled = grades.every(g => g.grade !== "");
    if (allFilled) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const handleProfileClick = () => {
    setLocation("/profile");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          <Button variant="outline" className="gap-2" onClick={handleProfileClick}>
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Grade Entry Portal</h1>
            <p className="text-muted-foreground mt-1">Enter and manage student grades for your subjects</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="grades" className="w-full">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="grades">Enter Grades</TabsTrigger>
              <TabsTrigger value="subjects">My Subjects</TabsTrigger>
            </TabsList>

            <TabsContent value="grades" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Enter Student Grades</CardTitle>
                  <CardDescription>Select a subject and term, then enter grades for all students</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Subject</Label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject you teach" />
                        </SelectTrigger>
                        <SelectContent>
                          {teacherSubjects.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Academic Term</Label>
                      <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACADEMIC_TERMS.filter(t => t.status === "Active").map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Terms are set by administrators only</p>
                    </div>
                  </div>

                  {selectedSubject && (
                    <div className="space-y-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{MOCK_SUBJECTS.find(s => s.id === selectedSubject)?.name}</span>
                          <br />
                          <span className="text-muted-foreground text-xs">Enter marks out of 100 for each student</span>
                        </p>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Student ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[150px]">Grade (0-100)</TableHead>
                            <TableHead className="w-[80px]">Letter</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grades.map((entry) => {
                            const score = parseInt(entry.grade) || 0;
                            const gradeData = score > 0 ? getGESGrade(score) : { grade: '-', description: '' };
                            
                            return (
                              <TableRow key={entry.studentId}>
                                <TableCell className="font-mono text-xs">{entry.studentId}</TableCell>
                                <TableCell>{entry.studentName}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="0"
                                    value={entry.grade}
                                    onChange={(e) => handleGradeChange(entry.studentId, e.target.value)}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm">{gradeData.grade}</span>
                                    <span className="text-xs text-muted-foreground">{gradeData.description}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {submitted && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 ml-2">
                        Grades submitted successfully!
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                {selectedSubject && (
                  <CardFooter>
                    <Button 
                      onClick={handleSubmitGrades}
                      disabled={grades.some(g => g.grade === "")}
                      className="w-full"
                    >
                      Submit All Grades
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="subjects" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Assigned Subjects</CardTitle>
                  <CardDescription>Subjects you are authorized to enter grades for</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {teacherSubjects.map((subject) => (
                      <Card key={subject.id} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{subject.name}</CardTitle>
                          <CardDescription>{subject.code}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Students Enrolled:</span>
                              <span className="font-bold text-primary">{subject.students}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <span className="text-green-600 font-medium">Active</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

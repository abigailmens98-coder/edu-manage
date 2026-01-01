import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BASIC_1_6_GRADING_SCALE, GES_GRADING_SCALE } from "@/lib/mock-data";
import { Save } from "lucide-react";
import { studentsApi, subjectsApi, academicTermsApi, scoresApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ScoreEntry() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [scores, setScores] = useState<Record<string, { class: string, exam: string, id?: string }>>({});
  const { toast } = useToast();

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
      
      // Auto-select first active term
      const activeTerm = termsData.find(t => t.status === "Active");
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
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

  // Get unique classes from students
  const uniqueClasses = Array.from(new Set(students.map(s => s.grade))).sort((a, b) => {
    // Sort KG first, then Basic levels
    const getOrder = (grade: string) => {
      if (grade.startsWith("KG")) return parseInt(grade.replace(/[^0-9]/g, "") || "0");
      if (grade.startsWith("Basic")) return 10 + parseInt(grade.replace(/[^0-9]/g, "") || "0");
      return 100;
    };
    return getOrder(a) - getOrder(b);
  });

  // Filter students by selected class (exact match or starts with for sub-classes like 5A, 5B)
  const classStudents = students.filter(s => s.grade === selectedClass);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm) {
      loadScores();
    }
  }, [selectedClass, selectedSubject, selectedTerm]);

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

  const handleScoreChange = (studentId: string, type: 'class' | 'exam', value: string) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [type]: value
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
          // Update existing score
          await scoresApi.update(studentScore.id, scoreData);
        } else {
          // Create new score
          await scoresApi.create(scoreData);
        }
      });

      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: "Scores saved successfully!",
      });
      
      // Reload scores to get updated IDs
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

  const isBasic1to6 = selectedClass.includes("Basic 1") || selectedClass.includes("Basic 2") || selectedClass.includes("Basic 3") || 
                      selectedClass.includes("Basic 4") || selectedClass.includes("Basic 5") || selectedClass.includes("Basic 6");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Score Entry</h1>
        <p className="text-muted-foreground mt-1">Enter class and exam scores for all students in a subject.</p>
      </div>

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
            <Label>Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger data-testid="select-class">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {uniqueClasses.length > 0 ? (
                  uniqueClasses.map(cls => (
                    <SelectItem key={cls} value={cls}>
                      {cls} ({students.filter(s => s.grade === cls).length} students)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>No classes with students</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger data-testid="select-subject">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedSubject && selectedTerm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{selectedClass} - Score Entry</CardTitle>
              <CardDescription>
                {isBasic1to6 ? "Basic 1-6 (50% Class + 50% Exam)" : "Basic 7-9 (30% Class + 70% Exam)"}
              </CardDescription>
            </div>
            <Button onClick={handleSave} className="gap-2" data-testid="button-save-scores">
              <Save className="h-4 w-4" /> Save Scores
            </Button>
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
                          max={isBasic1to6 ? 50 : 30}
                          value={scores[student.id]?.class || ""}
                          onChange={(e) => handleScoreChange(student.id, 'class', e.target.value)}
                          data-testid={`input-class-score-${student.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24" 
                          max={isBasic1to6 ? 50 : 70}
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

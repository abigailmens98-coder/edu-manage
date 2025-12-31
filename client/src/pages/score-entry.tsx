import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getStoredStudents, getStoredSubjects, updateStudents } from "@/lib/storage";
import { BASIC_1_6_GRADING_SCALE, GES_GRADING_SCALE } from "@/lib/mock-data";
import { CheckCircle, AlertCircle, Save } from "lucide-react";

export default function ScoreEntry() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  
  // Local state for scores being edited { studentId: { classScore, examScore } }
  const [scores, setScores] = useState<Record<string, { class: string, exam: string }>>({});
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setStudents(getStoredStudents());
    setSubjects(getStoredSubjects());
  }, []);

  // Filter students by class
  const classStudents = students.filter(s => s.grade === selectedClass);

  // Initialize scores state when class/subject changes
  useEffect(() => {
    if (selectedClass && selectedSubject) {
      const initialScores: Record<string, { class: string, exam: string }> = {};
      classStudents.forEach(student => {
        // Load existing scores if available
        const studentScores = student.scores?.[selectedSubject];
        if (studentScores) {
          initialScores[student.id] = { 
            class: studentScores.class.toString(), 
            exam: studentScores.exam.toString() 
          };
        } else {
          initialScores[student.id] = { class: "", exam: "" };
        }
      });
      setScores(initialScores);
    }
  }, [selectedClass, selectedSubject, students]); // Add students to dependency to reload if students update

  const handleScoreChange = (studentId: string, type: 'class' | 'exam', value: string) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [type]: value
      }
    }));
  };

  const handleSave = () => {
    // Update students with new scores
    const updatedStudents = students.map(student => {
      // Only update students in the current class view
      if (student.grade === selectedClass) {
        const studentScore = scores[student.id];
        // Create or update the scores object
        const currentScores = student.scores || {};
        
        // Only save if we have valid numbers
        if (studentScore && (studentScore.class || studentScore.exam)) {
           const newScores = {
             ...currentScores,
             [selectedSubject]: {
               class: parseFloat(studentScore.class || "0"),
               exam: parseFloat(studentScore.exam || "0")
             }
           };
           return { ...student, scores: newScores };
        }
      }
      return student;
    });

    setStudents(updatedStudents); // Update local state
    updateStudents(updatedStudents); // Save to persistent storage
    
    setSuccessMessage("Scores saved successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Grading Logic Helper
  const getGrade = (total: number, classLevel: string) => {
    const basicNum = parseInt(classLevel.replace(/[^0-9]/g, ""));
    const scale = basicNum >= 1 && basicNum <= 6 ? BASIC_1_6_GRADING_SCALE : GES_GRADING_SCALE;
    const entry = scale.find(g => total >= g.range[0] && total <= g.range[1]);
    return entry ? entry.grade : "F";
  };

  const isBasic1to6 = selectedClass.includes("Basic 1") || selectedClass.includes("Basic 2") || selectedClass.includes("Basic 3") || 
                      selectedClass.includes("Basic 4") || selectedClass.includes("Basic 5") || selectedClass.includes("Basic 6");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Score Entry</h1>
        <p className="text-muted-foreground mt-1">Enter class and exam scores for all students in a subject.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Class & Subject</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KG 1">KG 1</SelectItem>
                <SelectItem value="KG 2">KG 2</SelectItem>
                <SelectItem value="Basic 1">Basic 1</SelectItem>
                <SelectItem value="Basic 2">Basic 2</SelectItem>
                <SelectItem value="Basic 3">Basic 3</SelectItem>
                <SelectItem value="Basic 4">Basic 4</SelectItem>
                <SelectItem value="Basic 5">Basic 5</SelectItem>
                <SelectItem value="Basic 6">Basic 6</SelectItem>
                <SelectItem value="Basic 7">Basic 7</SelectItem>
                <SelectItem value="Basic 8">Basic 8</SelectItem>
                <SelectItem value="Basic 9">Basic 9</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
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

      {selectedClass && selectedSubject && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{selectedClass} - Subject Score Entry</CardTitle>
              <CardDescription>
                {isBasic1to6 ? "Basic 1-6 (50% Class + 50% Exam)" : "Basic 7-9 (30% Class + 70% Exam)"}
              </CardDescription>
            </div>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> Save Scores
            </Button>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

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
                  const classScore = parseFloat(scores[student.id]?.class || "0");
                  const examScore = parseFloat(scores[student.id]?.exam || "0");
                  const total = classScore + examScore;
                  
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div>{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.id}</div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24" 
                          max={isBasic1to6 ? 50 : 30}
                          value={scores[student.id]?.class || ""}
                          onChange={(e) => handleScoreChange(student.id, 'class', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24" 
                          max={isBasic1to6 ? 50 : 70}
                          value={scores[student.id]?.exam || ""}
                          onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="font-bold">
                        {total > 0 ? total : "-"}
                      </TableCell>
                      <TableCell>
                        {total > 0 ? (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${total < 50 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {getGrade(total, selectedClass)}
                          </span>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {classStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { studentsApi, subjectsApi, academicTermsApi, scoresApi, teacherAssignmentsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sortClassNames } from "@/lib/class-utils";

export default function Broadsheet() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [schoolLogoBase64, setSchoolLogoBase64] = useState<string | null>(null);
  const { toast } = useToast();
  const { role, userId, username } = useAuth();

  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";

  useEffect(() => {
    fetchData();
    loadLogo();
  }, []);

  const loadLogo = async () => {
    try {
      const response = await fetch("/school-logo.png");
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setSchoolLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch (e: any) {
      console.error("Failed to load school logo", e);
    }
  };

  const fetchData = async () => {
    try {
      const [studentsData, subjectsData, termsData, assignmentsData] = await Promise.all([
        studentsApi.getAll(),
        subjectsApi.getAll(),
        academicTermsApi.getAll(),
        teacherAssignmentsApi.getAll(),
      ]);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setTerms(termsData);

      // In a real app, we would fetch only assignments for this teacher from the backend if not admin,
      // but here we filter on the frontend for simplicity as per existing patterns.
      setTeacherAssignments(assignmentsData);

      // Auto-select first active term
      const activeTerm = termsData.find((t: any) => t.status === "Active");
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

  // Filter logic
  // We need to find the teacherId associated with the current userId
  // Since we don't have the teacher list loaded, we rely on filtering assignments by userId if possible,
  // or we need to assume the assignment object has userId.
  // Looking at the API, teacherAssignments has `teacherId`.
  // `useAuth` returns `userId`. We need to map `userId` to `teacherId`.
  // However, I see `teacher-dashboard.tsx` fetches `teacherAssignmentsApi.getByTeacher(teacherId)`.
  // It gets `teacherId` from `teacherInfo?.id`. 
  // Let's see if `useAuth` provides `teacherInfo`.
  // In `teacher-dashboard.tsx`: `const { username, logout, teacherInfo } = useAuth();`
  // So `teacherInfo` IS available.

  // @ts-ignore
  const { teacherInfo } = useAuth();

  const myAssignments = isTeacher && teacherInfo
    ? teacherAssignments.filter((a: any) => a.teacherId === teacherInfo.id)
    : [];

  const myClasses = isTeacher
    ? Array.from(new Set(myAssignments.map((a: any) => a.classLevel)))
    : ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"];

  // Sort classes logically
  const availableClasses = myClasses.sort(sortClassNames);

  const classStudents = students.filter(s => s.grade === selectedClass);

  // Determine displayed subjects
  const isClassTeacher = isTeacher && myAssignments.some((a: any) => a.classLevel === selectedClass && a.isClassTeacher);

  const displaySubjects = (() => {
    if (isAdmin || isClassTeacher) {
      return subjects;
    }
    if (isTeacher) {
      const assignedSubjectIds = myAssignments
        .filter((a: any) => a.classLevel === selectedClass)
        .map((a: any) => a.subjectId);
      return subjects.filter(s => assignedSubjectIds.includes(s.id));
    }
    return subjects;
  })();

  const getScore = (studentId: string, subjectId: string) => {
    const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
    return score ? score.totalScore : 0;
  };

  const calculateTotal = (studentId: string) => {
    return displaySubjects.reduce((sum, sub) => sum + getScore(studentId, sub.id), 0);
  };

  const rankedStudents = [...classStudents].sort((a, b) => calculateTotal(b.id) - calculateTotal(a.id));

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const termName = terms.find((t: any) => t.id === selectedTerm)?.name || "Term 1";

    doc.setFontSize(18);
    doc.text("UNIVERSITY OF MINES AND TECHNOLOGY BASIC SCHOOL", 14, 15);
    doc.setFontSize(12);
    doc.text(`Broadsheet - ${selectedClass}`, 14, 22);
    doc.text(`Academic Year: 2024/2025 - ${termName}`, 14, 28);

    // Add School Badge & Watermark
    if (schoolLogoBase64) {
      try {
        // Background Watermark (Large, faded, centered)
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const watermarkSize = 130;
        const x = (pageWidth - watermarkSize) / 2;
        const y = (pageHeight - watermarkSize) / 2;

        doc.saveGraphicsState();
        // @ts-ignore
        const gState = new (doc as any).GState({ opacity: 0.20 });
        doc.setGState(gState);
        doc.addImage(schoolLogoBase64, 'PNG', x, y, watermarkSize, watermarkSize);
        doc.restoreGraphicsState();

        // Top corner logo (Original size)
        doc.addImage(schoolLogoBase64, 'PNG', 14, 10, 22, 22);
      } catch (e) {
        console.error("Could not add logo to PDF", e);
      }
    }

    const tableHead = [
      ["Pos", "Student ID", "Name", ...displaySubjects.map(s => s.code), "Total"]
    ];

    const tableBody = rankedStudents.map((student, index) => [
      index + 1,
      student.studentId,
      student.name,
      ...displaySubjects.map(s => getScore(student.id, s.id) || "-"),
      calculateTotal(student.id)
    ]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`Broadsheet_${selectedClass}_${termName}.pdf`);
  };

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
        <h1 className="text-3xl font-serif font-bold text-foreground">Broadsheet Generation</h1>
        <p className="text-muted-foreground mt-1">View and print comprehensive class performance sheets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Term & Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2 w-full md:w-1/3">
              <Label>Academic Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger data-testid="select-broadsheet-term">
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.status === "Active" && "(Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full md:w-1/3">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger data-testid="select-broadsheet-class">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((cls: any) => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={downloadPDF}
              disabled={!selectedClass || !selectedTerm}
              className="gap-2"
              data-testid="button-download-pdf"
            >
              <FileDown className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedTerm && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[50px]">Pos</TableHead>
                    <TableHead className="w-[200px]">Student</TableHead>
                    {displaySubjects.map(s => (
                      <TableHead key={s.id} className="text-center min-w-[80px] text-xs">
                        {s.code}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedStudents.map((student, index) => (
                    <TableRow key={student.id} data-testid={`row-broadsheet-${student.id}`}>
                      <TableCell className="font-bold text-primary" data-testid={`text-position-${student.id}`}>
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.studentId}</div>
                      </TableCell>
                      {displaySubjects.map(s => (
                        <TableCell key={s.id} className="text-center" data-testid={`text-score-${student.id}-${s.id}`}>
                          {getScore(student.id, s.id) || "-"}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold bg-muted/20" data-testid={`text-total-${student.id}`}>
                        {calculateTotal(student.id)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rankedStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={subjects.length + 3} className="text-center py-8">
                        No students found in {selectedClass}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

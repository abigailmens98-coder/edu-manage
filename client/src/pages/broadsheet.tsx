import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { studentsApi, subjectsApi, academicTermsApi, scoresApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Broadsheet() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
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

  const classStudents = students.filter(s => s.grade === selectedClass);

  const getScore = (studentId: string, subjectId: string) => {
    const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
    return score ? score.totalScore : 0;
  };

  const calculateTotal = (studentId: string) => {
    return subjects.reduce((sum, sub) => sum + getScore(studentId, sub.id), 0);
  };

  const rankedStudents = [...classStudents].sort((a, b) => calculateTotal(b.id) - calculateTotal(a.id));

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const termName = terms.find(t => t.id === selectedTerm)?.name || "Term 1";
    
    doc.setFontSize(18);
    doc.text("UNIVERSITY BASIC SCHOOL - TARKWA", 14, 15);
    doc.setFontSize(12);
    doc.text(`Broadsheet - ${selectedClass}`, 14, 22);
    doc.text(`Academic Year: 2024/2025 - ${termName}`, 14, 28);

    const tableHead = [
      ["Pos", "Student ID", "Name", ...subjects.map(s => s.code), "Total"]
    ];

    const tableBody = rankedStudents.map((student, index) => [
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
                  {terms.map(t => (
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
                    {subjects.map(s => (
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
                      {subjects.map(s => (
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

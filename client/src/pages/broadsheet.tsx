import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStoredStudents, getStoredSubjects } from "@/lib/storage";
import { FileDown, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Broadsheet() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");

  useEffect(() => {
    setStudents(getStoredStudents());
    setSubjects(getStoredSubjects());
  }, []);

  const classStudents = students.filter(s => s.grade === selectedClass);

  // Mock score generator for demonstration since we don't have a real score database yet
  const getMockScore = (studentId: string, subjectId: string) => {
    // Generate a deterministic random score based on IDs
    const seed = studentId.charCodeAt(3) + subjectId.charCodeAt(3);
    return 40 + (seed % 60); 
  };

  const calculateTotal = (studentId: string) => {
    return subjects.reduce((sum, sub) => sum + getMockScore(studentId, sub.id), 0);
  };

  // Sort students by position (total score)
  const rankedStudents = [...classStudents].sort((a, b) => calculateTotal(b.id) - calculateTotal(a.id));

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    
    doc.setFontSize(18);
    doc.text("UNIVERSITY BASIC SCHOOL - TARKWA", 14, 15);
    doc.setFontSize(12);
    doc.text(`Broadsheet - ${selectedClass}`, 14, 22);
    doc.text(`Academic Year: 2024/2025 - Term 1`, 14, 28);

    const tableHead = [
      ["Pos", "Student ID", "Name", ...subjects.map(s => s.code), "Total"]
    ];

    const tableBody = rankedStudents.map((student, index) => [
      index + 1,
      student.id,
      student.name,
      ...subjects.map(s => getMockScore(student.id, s.id)),
      calculateTotal(student.id)
    ]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }, // Blue header
    });

    doc.save(`Broadsheet_${selectedClass}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Broadsheet Generation</h1>
        <p className="text-muted-foreground mt-1">View and print comprehensive class performance sheets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2 w-full md:w-1/3">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class to View" />
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
            <Button onClick={downloadPDF} disabled={!selectedClass} className="gap-2">
              <FileDown className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[50px]">Pos</TableHead>
                    <TableHead className="w-[200px]">Student</TableHead>
                    {subjects.map(s => (
                      <TableHead key={s.id} className="text-center min-w-[80px] text-xs">{s.code}</TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedStudents.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-bold text-primary">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.id}</div>
                      </TableCell>
                      {subjects.map(s => (
                        <TableCell key={s.id} className="text-center">
                          {getMockScore(student.id, s.id)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold bg-muted/20">
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

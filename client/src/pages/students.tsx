import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, MoreHorizontal, FileDown, Upload, AlertCircle, CheckCircle, ArrowLeft, Users, GraduationCap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { studentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  studentId: string;
  name: string;
  grade: string;
  email: string;
  status: string;
  attendance: number;
}

const GRADES = [
  "KG 1", "KG 2", 
  "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6",
  "Basic 7", "Basic 8", "Basic 9"
];

export default function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    email: "",
    attendance: 0,
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await studentsApi.getAll();
      setStudents(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    try {
      const studentId = `S${String(students.length + 1).padStart(3, "0")}`;
      const gradeToUse = selectedClass || formData.grade;
      
      await studentsApi.create({
        studentId,
        name: formData.name,
        grade: gradeToUse,
        email: formData.email || `${formData.name.toLowerCase().replace(/\s+/g, ".")}@student.academia.edu`,
        status: "Active",
        attendance: formData.attendance,
      });

      toast({
        title: "Success",
        description: "Student added successfully",
      });

      setShowAddDialog(false);
      setFormData({ name: "", grade: "", email: "", attendance: 0 });
      fetchStudents();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await studentsApi.delete(id);
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      setDeleteConfirm(null);
      fetchStudents();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvError("");
    setCsvSuccess("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").map(line => line.trim()).filter(line => line);
        
        if (lines.length < 2) {
          throw new Error("CSV file must have at least a header and one student row");
        }

        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
        
        const firstNameIdx = headers.findIndex(h => h.includes("FIRST") || h === "FIRSTNAME");
        const surnameIdx = headers.findIndex(h => h.includes("SURNAME") || h === "SURNAME");
        const otherNameIdx = headers.findIndex(h => h.includes("OTHER") && h.includes("NAME"));
        const gradeIdx = headers.findIndex(h => h.includes("GRADE") || h.includes("LEVEL"));

        if (firstNameIdx === -1) {
          throw new Error("CSV must contain FIRSTNAME column. If importing to a specific class, LEVEL/GRADE is optional.");
        }

        const existingNames = new Set(students.map(s => s.name.toLowerCase().trim()));
        
        let importCount = 0;
        let duplicateCount = 0;
        const newStudentNames = new Set<string>();
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim());
          const maxIdx = Math.max(firstNameIdx, surnameIdx, otherNameIdx, gradeIdx);
          
          if (cols.length >= Math.max(firstNameIdx, surnameIdx !== -1 ? surnameIdx : 0, otherNameIdx !== -1 ? otherNameIdx : 0) + 1) {
            const firstName = cols[firstNameIdx] || "";
            const surname = surnameIdx !== -1 ? (cols[surnameIdx] || "") : "";
            const otherName = otherNameIdx !== -1 ? (cols[otherNameIdx] || "") : "";
            let grade = gradeIdx !== -1 ? (cols[gradeIdx] || "") : "";

            if (!grade && selectedClass) {
              grade = selectedClass;
            }

            const nameParts = [firstName, otherName, surname].filter(p => p.length > 0);
            const fullName = nameParts.join(" ").trim();

            if (firstName && grade && fullName) {
              const normalizedName = fullName.toLowerCase();
              
              if (existingNames.has(normalizedName) || newStudentNames.has(normalizedName)) {
                duplicateCount++;
                continue;
              }
              
              newStudentNames.add(normalizedName);
              
              const studentId = `S${String(students.length + importCount + 1).padStart(3, "0")}`;
              
              let normalizedGrade = grade;
              if (/^(kg|kindergarten)\s*[12]$/i.test(grade)) {
                normalizedGrade = grade.toUpperCase().replace(/KINDERGARTEN/i, "KG").replace(/\s+/g, " ");
              } else if (/^(basic|b)\s*\d+$/i.test(grade)) {
                const num = grade.replace(/[^0-9]/g, "");
                normalizedGrade = `Basic ${num}`;
              }
              
              await studentsApi.create({
                studentId,
                name: fullName,
                grade: normalizedGrade,
                email: "",
                status: "Active",
                attendance: 0,
              });
              
              importCount++;
            }
          }
        }

        if (importCount === 0 && duplicateCount === 0) {
          throw new Error("No valid student records found in CSV");
        }

        let message = `Successfully imported ${importCount} student(s)`;
        if (duplicateCount > 0) {
          message += `. ${duplicateCount} duplicate(s) were skipped.`;
        }
        setCsvSuccess(message);
        fetchStudents();
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : "Failed to parse CSV file");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const exportToCSV = () => {
    const studentsToExport = selectedClass 
      ? students.filter(s => s.grade === selectedClass)
      : students;
      
    const headers = ["FIRSTNAME", "SURNAME", "OTHER NAME", "LEVEL"];
    const rows = studentsToExport.map(s => {
      const nameParts = s.name.split(" ").filter(p => p.length > 0);
      let firstName = "";
      let surname = "";
      let otherName = "";
      
      if (nameParts.length === 1) {
        firstName = nameParts[0];
      } else if (nameParts.length === 2) {
        firstName = nameParts[0];
        surname = nameParts[1];
      } else if (nameParts.length >= 3) {
        firstName = nameParts[0];
        surname = nameParts[nameParts.length - 1];
        otherName = nameParts.slice(1, -1).join(" ");
      }
      
      return [firstName, surname, otherName, s.grade];
    });

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = selectedClass 
      ? `students_${selectedClass.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
      : `students_all_${new Date().toISOString().split("T")[0]}.csv`;
    a.download = fileName;
    a.click();
  };

  const getClassCounts = () => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      counts[s.grade] = (counts[s.grade] || 0) + 1;
    });
    return counts;
  };

  const classCounts = getClassCounts();

  const sortedClasses = (() => {
    const allGrades = new Set<string>(GRADES);
    Object.keys(classCounts).forEach(g => allGrades.add(g));
    return Array.from(allGrades).sort((a, b) => {
      const getOrder = (grade: string) => {
        if (grade.startsWith("KG")) return parseInt(grade.replace(/[^0-9]/g, "") || "0");
        if (grade.startsWith("Basic")) return 10 + parseInt(grade.replace(/[^0-9]/g, "") || "0");
        return 100;
      };
      return getOrder(a) - getOrder(b);
    });
  })();

  const classStudents = selectedClass 
    ? students.filter(s => s.grade === selectedClass)
    : [];

  const filteredClassStudents = classStudents.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Student Management</h1>
            <p className="text-muted-foreground mt-1">Select a class to view and manage students.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportToCSV} data-testid="button-export-all-csv">
              <FileDown className="h-4 w-4" /> Export All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedClasses.map((grade) => {
            const count = classCounts[grade] || 0;
            const isKG = grade.startsWith("KG");
            
            return (
              <Card 
                key={grade} 
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                  isKG ? 'border-l-4 border-l-pink-500' : 'border-l-4 border-l-blue-500'
                }`}
                onClick={() => setSelectedClass(grade)}
                data-testid={`card-class-${grade.replace(/\s+/g, "-")}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{grade}</CardTitle>
                    <GraduationCap className={`h-5 w-5 ${isKG ? 'text-pink-500' : 'text-blue-500'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-muted-foreground text-sm">
                      {count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{students.length}</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-lg">
                <div className="text-3xl font-bold text-pink-600">
                  {students.filter(s => s.grade.startsWith("KG")).length}
                </div>
                <div className="text-sm text-muted-foreground">KG Students</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {students.filter(s => s.grade.match(/Basic [1-6]$/)).length}
                </div>
                <div className="text-sm text-muted-foreground">Primary (B1-B6)</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {students.filter(s => s.grade.match(/Basic [7-9]$/)).length}
                </div>
                <div className="text-sm text-muted-foreground">JHS (B7-B9)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedClass(null)}
            data-testid="button-back-to-classes"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">{selectedClass}</h1>
            <p className="text-muted-foreground mt-1">{classStudents.length} students in this class</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={exportToCSV} data-testid="button-export-class-csv">
            <FileDown className="h-4 w-4" /> Export Class
          </Button>
          
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-import-csv">
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Import Students to {selectedClass}</DialogTitle>
                <DialogDescription>
                  Upload a CSV file. Students will be added to {selectedClass}. Duplicates will be skipped.
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
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    className="hidden"
                    id="csv-import"
                    data-testid="input-csv-file"
                  />
                  <Label htmlFor="csv-import" className="cursor-pointer block">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="font-semibold">Click to upload CSV file</p>
                    <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                  </Label>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
                  <p className="font-semibold">Required Columns:</p>
                  <p>FIRSTNAME</p>
                  <p className="font-semibold mt-2">Optional Columns:</p>
                  <p>SURNAME, OTHER NAME, LEVEL (defaults to {selectedClass})</p>
                  <p className="font-semibold mt-2">Example:</p>
                  <code className="block font-mono text-blue-800">FIRSTNAME,SURNAME,OTHER NAME</code>
                  <code className="block font-mono text-blue-800">Kofi,Mensah,Kwame</code>
                  <code className="block font-mono text-blue-800">Ama,Asante,</code>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20" data-testid="button-add-student">
                <Plus className="h-4 w-4" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Student to {selectedClass}</DialogTitle>
                <DialogDescription>
                  Enter the student's details to add them to {selectedClass}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Kofi Mensah" 
                    className="col-span-3"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-student-name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="grade" className="text-right">Class</Label>
                  <Input 
                    id="grade"
                    value={selectedClass}
                    disabled
                    className="col-span-3 bg-muted"
                    data-testid="input-student-grade"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input 
                    id="email" 
                    placeholder="Optional" 
                    className="col-span-3"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-student-email"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={handleAddStudent}
                  disabled={!formData.name}
                  data-testid="button-submit-student"
                >
                  Add Student
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
            <CardTitle>Students in {selectedClass} ({filteredClassStudents.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or ID..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-students"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClassStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No students in this class</p>
              <p className="text-sm mt-1">Add students using the button above or import from CSV</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClassStudents.map((student) => (
                  <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                    <TableCell className="font-medium" data-testid={`text-student-id-${student.id}`}>{student.studentId}</TableCell>
                    <TableCell data-testid={`text-student-name-${student.id}`}>{student.name}</TableCell>
                    <TableCell data-testid={`text-student-email-${student.id}`}>{student.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={student.status === "Active" ? "default" : "secondary"} data-testid={`badge-student-status-${student.id}`}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-student-attendance-${student.id}`}>
                      {student.attendance} days
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-menu-student-${student.id}`}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => setDeleteConfirm(student.id)}
                            className="text-destructive"
                            data-testid={`button-delete-student-${student.id}`}
                          >
                            Delete Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {deleteConfirm && (
        <Dialog open={true} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Student</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this student? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-900">
                <strong>{students.find(s => s.id === deleteConfirm)?.name}</strong> will be permanently removed.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirm(null)}
                data-testid="button-cancel-delete-student"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleDeleteStudent(deleteConfirm)}
                data-testid="button-confirm-delete-student"
              >
                Delete Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

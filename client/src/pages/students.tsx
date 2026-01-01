import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, MoreHorizontal, FileDown, Upload, AlertCircle, CheckCircle } from "lucide-react";
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
  const [filterClass, setFilterClass] = useState("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const { toast } = useToast();

  // Form state
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
      // Generate student ID
      const studentId = `S${String(students.length + 1).padStart(3, "0")}`;
      
      await studentsApi.create({
        studentId,
        name: formData.name,
        grade: formData.grade,
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
        
        // Find column indices - support FIRSTNAME, SURNAME, OTHER NAME, LEVEL/GRADE
        const firstNameIdx = headers.findIndex(h => h.includes("FIRST") || h === "FIRSTNAME");
        const surnameIdx = headers.findIndex(h => h.includes("SURNAME") || h === "SURNAME");
        const otherNameIdx = headers.findIndex(h => h.includes("OTHER") && h.includes("NAME"));
        const gradeIdx = headers.findIndex(h => h.includes("GRADE") || h.includes("LEVEL"));

        if (firstNameIdx === -1 || gradeIdx === -1) {
          throw new Error("CSV must contain FIRSTNAME and LEVEL/GRADE columns. Optional: SURNAME, OTHER NAME");
        }

        // Build list of existing student names for duplicate detection
        const existingNames = new Set(students.map(s => s.name.toLowerCase().trim()));
        
        let importCount = 0;
        let duplicateCount = 0;
        const newStudentNames = new Set<string>();
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim());
          const maxIdx = Math.max(firstNameIdx, surnameIdx, otherNameIdx, gradeIdx);
          
          if (cols.length >= maxIdx + 1) {
            const firstName = cols[firstNameIdx] || "";
            const surname = surnameIdx !== -1 ? (cols[surnameIdx] || "") : "";
            const otherName = otherNameIdx !== -1 ? (cols[otherNameIdx] || "") : "";
            const grade = cols[gradeIdx] || "";

            // Build full name: FIRSTNAME OTHERNAME SURNAME
            const nameParts = [firstName, otherName, surname].filter(p => p.length > 0);
            const fullName = nameParts.join(" ").trim();

            if (firstName && grade && fullName) {
              const normalizedName = fullName.toLowerCase();
              
              // Check for duplicates (both in database and within this import)
              if (existingNames.has(normalizedName) || newStudentNames.has(normalizedName)) {
                duplicateCount++;
                continue; // Skip duplicate
              }
              
              // Add to tracking set
              newStudentNames.add(normalizedName);
              
              const studentId = `S${String(students.length + importCount + 1).padStart(3, "0")}`;
              
              // Normalize grade format
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
    // Export in the same format as import for easy re-import to production
    const headers = ["FIRSTNAME", "SURNAME", "OTHER NAME", "LEVEL"];
    const rows = students.map(s => {
      // Split name into parts: first name, other name(s), and surname (last part)
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
    a.download = `students_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Get unique classes from students for the filter
  const uniqueClasses = Array.from(new Set(students.map(s => s.grade))).sort((a, b) => {
    const getOrder = (grade: string) => {
      if (grade.startsWith("KG")) return parseInt(grade.replace(/[^0-9]/g, "") || "0");
      if (grade.startsWith("Basic")) return 10 + parseInt(grade.replace(/[^0-9]/g, "") || "0");
      return 100;
    };
    return getOrder(a) - getOrder(b);
  });

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === "all" || student.grade === filterClass;
    return matchesSearch && matchesClass;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Student Management</h1>
          <p className="text-muted-foreground mt-1">Onboard and manage student profiles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportToCSV} data-testid="button-export-csv">
            <FileDown className="h-4 w-4" /> Export CSV
          </Button>
          
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-import-csv">
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Import Students from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file. Duplicates will be automatically detected and skipped.
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
                  <p>FIRSTNAME, LEVEL/GRADE</p>
                  <p className="font-semibold mt-2">Optional Columns:</p>
                  <p>SURNAME, OTHER NAME</p>
                  <p className="font-semibold mt-2">Example:</p>
                  <code className="block font-mono text-blue-800">FIRSTNAME,SURNAME,OTHER NAME,LEVEL</code>
                  <code className="block font-mono text-blue-800">Kofi,Mensah,Kwame,Basic 7</code>
                  <code className="block font-mono text-blue-800">Ama,Asante,,Basic 9</code>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20" data-testid="button-add-student">
                <Plus className="h-4 w-4" /> Onboard Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Onboard New Student</DialogTitle>
                <DialogDescription>
                  Enter the student's details to create a new profile.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="John Doe" 
                    className="col-span-3"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-student-name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="grade" className="text-right">Grade</Label>
                  <Select 
                    value={formData.grade} 
                    onValueChange={(value) => setFormData({ ...formData, grade: value })}
                  >
                    <SelectTrigger className="col-span-3" data-testid="select-student-grade">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input 
                    id="email" 
                    placeholder="john@student.academia.edu" 
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
                  disabled={!formData.name || !formData.grade}
                  data-testid="button-submit-student"
                >
                  Onboard Student
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
            <CardTitle>All Students ({filteredStudents.length})</CardTitle>
            <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-class">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {uniqueClasses.map(cls => (
                    <SelectItem key={cls} value={cls}>
                      {cls} ({students.filter(s => s.grade === cls).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                  <TableCell className="font-medium" data-testid={`text-student-id-${student.id}`}>{student.studentId}</TableCell>
                  <TableCell data-testid={`text-student-name-${student.id}`}>{student.name}</TableCell>
                  <TableCell data-testid={`text-student-grade-${student.id}`}>{student.grade}</TableCell>
                  <TableCell data-testid={`text-student-email-${student.id}`}>{student.email}</TableCell>
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
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
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

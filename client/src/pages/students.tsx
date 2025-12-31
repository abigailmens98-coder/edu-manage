import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getStoredStudents, updateStudents } from "@/lib/storage";
import { Plus, Search, MoreHorizontal, FileDown, Upload, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Student {
  id: string;
  name: string;
  grade: string;
  email: string;
  status: string;
  attendance: string;
}

export default function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);

  // Load from storage on mount
  useEffect(() => {
    setStudents(getStoredStudents());
  }, []);

  // Save to storage whenever students change
  useEffect(() => {
    if (students.length > 0) {
      updateStudents(students);
    }
  }, [students]);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvError("");
    setCsvSuccess("");
    setCsvLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").map(line => line.trim()).filter(line => line);
        
        if (lines.length < 2) {
          throw new Error("CSV file must have at least a header and one student row");
        }

        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
        const firstNameIdx = headers.findIndex(h => h.includes("FIRST"));
        const otherNameIdx = headers.findIndex(h => h.includes("OTHER") || h.includes("LAST"));
        const gradeIdx = headers.findIndex(h => h.includes("GRADE") || h.includes("LEVEL"));

        if (firstNameIdx === -1 || otherNameIdx === -1 || gradeIdx === -1) {
          throw new Error("CSV must contain FIRST NAME, OTHER NAME, and GRADE/LEVEL columns");
        }

        const newStudents: Student[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim());
          if (cols.length >= Math.max(firstNameIdx, otherNameIdx, gradeIdx) + 1) {
            const firstName = cols[firstNameIdx] || "";
            const otherName = cols[otherNameIdx] || "";
            const grade = cols[gradeIdx] || "";

            if (firstName && otherName && grade) {
              const studentId = `S${String(students.length + newStudents.length + 1).padStart(3, "0")}`;
              newStudents.push({
                id: studentId,
                name: `${firstName} ${otherName}`,
                grade: grade.replace(/^Basic\s*/i, "Basic "),
                email: `${firstName.toLowerCase()}.${otherName.toLowerCase()}@student.academia.edu`,
                status: "Active",
                attendance: "85%"
              });
            }
          }
        }

        if (newStudents.length === 0) {
          throw new Error("No valid student records found in CSV");
        }

        setStudents([...students, ...newStudents]);
        setCsvSuccess(`Successfully imported ${newStudents.length} student(s) into the system`);
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : "Failed to parse CSV file");
      } finally {
        setCsvLoading(false);
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Student Management</h1>
          <p className="text-muted-foreground mt-1">Onboard and manage student profiles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" /> Export CSV
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Import Students from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with columns: FIRST NAME, OTHER NAME, GRADE/LEVEL
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
                    disabled={csvLoading}
                    className="hidden"
                    id="csv-import"
                  />
                  <Label htmlFor="csv-import" className="cursor-pointer block">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="font-semibold">Click to upload CSV file</p>
                    <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                  </Label>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
                  <p className="font-semibold">CSV Format Example:</p>
                  <code className="block font-mono text-blue-800">FIRST NAME,OTHER NAME,GRADE/LEVEL</code>
                  <code className="block font-mono text-blue-800">John,Doe,Basic 7</code>
                  <code className="block font-mono text-blue-800">Jane,Smith,Basic 9</code>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {}}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20">
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
                  <Input id="name" placeholder="John Doe" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="grade" className="text-right">Grade</Label>
                  <Input id="grade" placeholder="10th" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" placeholder="john@example.com" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Onboard Student</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
            <CardTitle>All Students</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or ID..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.id}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    <Badge variant={student.status === "Active" ? "default" : "secondary"}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <span className={parseInt(student.attendance) < 80 ? "text-destructive font-bold" : "text-green-600 font-bold"}>
                       {student.attendance}
                     </span>
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
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
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
                Are you sure you want to delete this student from the system? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-900">
                <strong>{students.find(s => s.id === deleteConfirm)?.name}</strong> will be permanently removed from the system.
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
                onClick={() => {
                  setStudents(students.filter(s => s.id !== deleteConfirm));
                  setDeleteConfirm(null);
                  setSuccessMessage("Student deleted from system");
                  setTimeout(() => setSuccessMessage(""), 3000);
                }}
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
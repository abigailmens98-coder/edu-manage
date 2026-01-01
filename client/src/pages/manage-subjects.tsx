import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Upload, FileDown, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { subjectsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Subject {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  classLevels?: string[];
}

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [formData, setFormData] = useState({ name: "", code: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await subjectsApi.getAll();
      setSubjects(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch subjects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    try {
      const subjectId = `SUB${String(subjects.length + 1).padStart(3, "0")}`;
      await subjectsApi.create({
        subjectId,
        name: formData.name,
        code: formData.code,
        classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
      });
      toast({
        title: "Success",
        description: "Subject added successfully",
      });
      setShowAddDialog(false);
      setFormData({ name: "", code: "" });
      fetchSubjects();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add subject",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await subjectsApi.delete(id);
      toast({
        title: "Success",
        description: "Subject deleted successfully",
      });
      fetchSubjects();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete subject",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ["NAME", "CODE"];
    const rows = subjects.map(s => [s.name, s.code]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subjects_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
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
        const lines = text.split("\n").filter(line => line.trim());
        
        if (lines.length < 2) {
          setCsvError("CSV file must have a header row and at least one data row");
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
        const nameIdx = headers.findIndex(h => h === "NAME" || h === "SUBJECT" || h === "SUBJECT NAME");
        const codeIdx = headers.findIndex(h => h === "CODE" || h === "SUBJECT CODE");

        if (nameIdx === -1) {
          setCsvError("CSV must have a NAME column");
          return;
        }
        if (codeIdx === -1) {
          setCsvError("CSV must have a CODE column");
          return;
        }

        const existingCodes = subjects.map(s => s.code.toLowerCase());
        const newSubjects: Array<{name: string, code: string}> = [];
        let duplicates = 0;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          const name = values[nameIdx]?.trim();
          const code = values[codeIdx]?.trim();

          if (!name || !code) continue;

          if (existingCodes.includes(code.toLowerCase()) || newSubjects.some(s => s.code.toLowerCase() === code.toLowerCase())) {
            duplicates++;
            continue;
          }

          newSubjects.push({ name, code });
        }

        if (newSubjects.length === 0) {
          setCsvError(duplicates > 0 ? `All ${duplicates} subjects already exist in the system` : "No valid subjects found in CSV");
          return;
        }

        let imported = 0;
        for (let i = 0; i < newSubjects.length; i++) {
          const subject = newSubjects[i];
          try {
            const subjectId = `SUB${String(subjects.length + imported + 1).padStart(3, "0")}`;
            await subjectsApi.create({
              subjectId,
              name: subject.name,
              code: subject.code,
              classLevels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
            });
            imported++;
          } catch (err) {
            console.error("Failed to import subject:", subject.name, err);
          }
        }

        setCsvSuccess(`Successfully imported ${imported} subject(s)${duplicates > 0 ? ` (${duplicates} duplicates skipped)` : ""}`);
        fetchSubjects();
      } catch (err) {
        setCsvError("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Manage Subjects</h1>
          <p className="text-muted-foreground mt-1">Add, edit, or remove subjects from the curriculum.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportToCSV} data-testid="button-export-subjects-csv">
            <FileDown className="h-4 w-4" /> Export CSV
          </Button>
          
          <Dialog open={showImportDialog} onOpenChange={(open) => { setShowImportDialog(open); if (!open) { setCsvError(""); setCsvSuccess(""); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-import-subjects-csv">
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Import Subjects from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with columns: NAME and CODE.
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
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    data-testid="input-import-subjects-csv"
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">Required: NAME, CODE</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20" data-testid="button-add-subject">
                <Plus className="h-4 w-4" /> Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>Create a new subject for the curriculum.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subjectName">Subject Name</Label>
                <Input
                  id="subjectName"
                  placeholder="e.g., English Language"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-subject-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subjectCode">Subject Code</Label>
                <Input
                  id="subjectCode"
                  placeholder="e.g., ENG101"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  data-testid="input-subject-code"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleAddSubject}
                disabled={!formData.name || !formData.code}
                data-testid="button-submit-subject"
              >
                Add Subject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
          <CardDescription>Manage all subjects in the school curriculum</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Subject Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id} data-testid={`row-subject-${subject.id}`}>
                  <TableCell className="font-mono font-bold text-primary" data-testid={`text-subject-code-${subject.id}`}>
                    {subject.code}
                  </TableCell>
                  <TableCell className="font-medium" data-testid={`text-subject-name-${subject.id}`}>
                    {subject.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSubject(subject.id)}
                      className="gap-1 text-destructive"
                      data-testid={`button-delete-subject-${subject.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

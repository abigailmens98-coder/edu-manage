import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getStoredSubjects, updateSubjects } from "@/lib/storage";
import { Plus, Edit2, Trash2, BookOpen } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
  teacher: string;
  students: number;
  classLevels?: string[];
}

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>(() => getStoredSubjects());

  useEffect(() => {
    if (subjects.length > 0) {
      updateSubjects(subjects);
    }
  }, [subjects]);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const handleAddSubject = () => {
    if (newSubjectName.trim() && newSubjectCode.trim()) {
      const newSubject: Subject = {
        id: `SUB${Date.now()}`,
        name: newSubjectName,
        code: newSubjectCode,
        teacher: "Unassigned",
        students: 0,
      };
      setSubjects([...subjects, newSubject]);
      setNewSubjectName("");
      setNewSubjectCode("");
    }
  };

  const handleEditSubject = (id: string) => {
    const subject = subjects.find(s => s.id === id);
    if (subject) {
      setEditingId(id);
      setEditName(subject.name);
      setEditCode(subject.code);
    }
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim() && editCode.trim()) {
      setSubjects(
        subjects.map(s =>
          s.id === editingId
          ? { ...s, name: editName, code: editCode }
          : s
        )
      );
      setEditingId(null);
      setEditName("");
      setEditCode("");
    }
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Manage Subjects</h1>
          <p className="text-muted-foreground mt-1">Add, edit, or remove subjects from the curriculum.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>
                Create a new subject for the curriculum.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subjectName">Subject Name</Label>
                <Input
                  id="subjectName"
                  placeholder="e.g., Advanced Physics"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subjectCode">Subject Code</Label>
                <Input
                  id="subjectCode"
                  placeholder="e.g., PHY301"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddSubject}>
                Add Subject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <TableHead>Teacher</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-mono font-bold text-primary">{subject.code}</TableCell>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {subject.teacher === "Unassigned" ? "Not Assigned" : subject.teacher}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{subject.students}</TableCell>
                  <TableCell className="text-right flex gap-2 justify-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSubject(subject.id)}
                          className="gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Edit Subject</DialogTitle>
                          <DialogDescription>
                            Update subject details.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="editName">Subject Name</Label>
                            <Input
                              id="editName"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="editCode">Subject Code</Label>
                            <Input
                              id="editCode"
                              value={editCode}
                              onChange={(e) => setEditCode(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" onClick={handleSaveEdit}>
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSubject(subject.id)}
                      className="gap-1 text-destructive hover:text-destructive"
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

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Subject Management Info
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Click <strong>Edit</strong> to modify subject name or code</p>
          <p>• Click <strong>Delete</strong> to remove a subject from the curriculum</p>
          <p>• Subjects can be assigned to teachers in the Academics section</p>
          <p>• Total students enrolled updates automatically when enrollment changes</p>
        </CardContent>
      </Card>
    </div>
  );
}

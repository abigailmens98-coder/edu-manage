import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { teachersApi, subjectsApi } from "@/lib/api";
import { BookOpen, UserPlus, ArrowRight, Loader2, Plus, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Academics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", code: "" });

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['/api/teachers'],
    queryFn: teachersApi.getAll,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['/api/subjects'],
    queryFn: subjectsApi.getAll,
  });

  const addSubjectMutation = useMutation({
    mutationFn: async (data: { subjectId: string; name: string; code: string; classLevels: string[] }) => {
      return subjectsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      toast({
        title: "Success",
        description: "Subject created successfully",
      });
      setAddSubjectOpen(false);
      setNewSubject({ name: "", code: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create subject",
        variant: "destructive",
      });
    },
  });

  const handleAssignment = async () => {
    if (!selectedTeacher || !selectedSubject) {
      toast({
        title: "Error",
        description: "Please select both a teacher and a subject",
        variant: "destructive",
      });
      return;
    }

    try {
      const teacher = teachers.find((t: any) => t.id === selectedTeacher);
      const subject = subjects.find((s: any) => s.id === selectedSubject);
      
      if (teacher && subject) {
        await teachersApi.update(teacher.id, { subject: subject.name });
        queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
        toast({
          title: "Assignment Created",
          description: `${teacher.name} has been assigned to ${subject.name} successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    }
    
    setDialogOpen(false);
    setSelectedTeacher("");
    setSelectedSubject("");
  };

  const handleAddSubject = () => {
    if (!newSubject.name || !newSubject.code) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const subjectId = `SUB${String(subjects.length + 1).padStart(3, "0")}`;
    addSubjectMutation.mutate({
      subjectId,
      name: newSubject.name,
      code: newSubject.code,
      classLevels: ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"],
    });
  };

  if (teachersLoading || subjectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Academic Assignments</h1>
        <p className="text-muted-foreground mt-1">Assign subjects to teachers and manage course enrollments.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Subject Allocation</CardTitle>
              <CardDescription>Current subject assignments per teacher</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" data-testid="button-assign-new">
                  <UserPlus className="h-4 w-4" /> Assign New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Subject to Teacher</DialogTitle>
                  <DialogDescription>Link a teacher to a subject they will teach.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Teacher</Label>
                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                      <SelectTrigger data-testid="select-teacher">
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((t: any) => (
                          <SelectItem key={t.id} value={t.id.toString()} data-testid={`option-teacher-${t.id}`}>
                            {t.name} - {t.assignedClass}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger data-testid="select-subject">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()} data-testid={`option-subject-${s.id}`}>
                            {s.name} ({s.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAssignment} data-testid="button-confirm-assignment">
                    Confirm Assignment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Class Levels</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject: any) => (
                  <TableRow key={subject.id} data-testid={`row-subject-${subject.id}`}>
                    <TableCell className="font-mono text-xs">{subject.code}</TableCell>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {subject.classLevels?.slice(0, 3).map((level: string) => (
                          <Badge key={level} variant="secondary" className="text-xs">
                            {level}
                          </Badge>
                        ))}
                        {subject.classLevels?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{subject.classLevels.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href="/subjects">
                        <Button variant="ghost" size="sm" data-testid={`button-manage-${subject.id}`}>
                          Manage
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {subjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No subjects found. Add subjects to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
              <DialogTrigger asChild>
                <div className="bg-background p-4 rounded-lg border shadow-sm cursor-pointer hover:border-primary transition-colors group" data-testid="action-create-subject">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Create New Subject</h3>
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Add a new course to the curriculum.</p>
                  <div className="flex items-center text-primary text-sm font-medium">
                    Create
                    <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Subject</DialogTitle>
                  <DialogDescription>Add a new subject to the curriculum. It will be available for all class levels.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subjectName">Subject Name</Label>
                    <Input 
                      id="subjectName" 
                      placeholder="e.g., Mathematics" 
                      value={newSubject.name}
                      onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                      data-testid="input-new-subject-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subjectCode">Subject Code</Label>
                    <Input 
                      id="subjectCode" 
                      placeholder="e.g., MATH" 
                      value={newSubject.code}
                      onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })}
                      data-testid="input-new-subject-code"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddSubjectOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSubject} disabled={addSubjectMutation.isPending} data-testid="button-save-subject">
                    {addSubjectMutation.isPending ? "Creating..." : "Create Subject"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Link href="/students">
              <div className="bg-background p-4 rounded-lg border shadow-sm cursor-pointer hover:border-primary transition-colors group" data-testid="action-bulk-enroll">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Bulk Enroll</h3>
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">Enroll multiple students to a class at once.</p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Go to Students
                  <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

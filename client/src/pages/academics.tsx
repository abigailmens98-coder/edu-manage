import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { teachersApi, subjectsApi } from "@/lib/api";
import { BookOpen, UserPlus, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Academics() {
  const { toast } = useToast();
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['/api/teachers'],
    queryFn: teachersApi.getAll,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['/api/subjects'],
    queryFn: subjectsApi.getAll,
  });

  const handleAssignment = () => {
    if (!selectedTeacher || !selectedSubject) {
      toast({
        title: "Error",
        description: "Please select both a teacher and a subject",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Assignment Created",
      description: "Teacher has been assigned to the subject successfully",
    });
    setDialogOpen(false);
    setSelectedTeacher("");
    setSelectedSubject("");
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
                  <DialogTitle>Assign Subject</DialogTitle>
                  <DialogDescription>Link a teacher to a subject.</DialogDescription>
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
                            {t.name}
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
                      <Button variant="ghost" size="sm" data-testid={`button-manage-${subject.id}`}>
                        Manage
                      </Button>
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
            <div className="bg-background p-4 rounded-lg border shadow-sm cursor-pointer hover:border-primary transition-colors group">
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

            <div className="bg-background p-4 rounded-lg border shadow-sm cursor-pointer hover:border-primary transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Bulk Enroll</h3>
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">Enroll multiple students to a class at once.</p>
              <div className="flex items-center text-primary text-sm font-medium">
                Start Enrollment
                <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, MoreHorizontal, Trash2, BookOpen, X, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { teachersApi, subjectsApi, teacherAssignmentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Teacher {
  id: string;
  teacherId: string;
  name: string;
  subject: string;
  email: string;
  assignedClass?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  classLevels?: string[];
}

interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classLevel: string;
  isClassTeacher: boolean;
}

interface PendingAssignment {
  subjectId: string;
  subjectName: string;
  classLevel: string;
  isClassTeacher: boolean;
}

const GRADES = [
  "KG 1", "KG 2", 
  "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6",
  "Basic 7", "Basic 8", "Basic 9"
];

export default function Teachers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allAssignments, setAllAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    secretWord: "",
  });

  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClassLevel, setSelectedClassLevel] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classTeacherClass, setClassTeacherClass] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teachersData, subjectsData, assignmentsData] = await Promise.all([
        teachersApi.getAll(),
        subjectsApi.getAll(),
        teacherAssignmentsApi.getAll(),
      ]);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setAllAssignments(assignmentsData);
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

  const handleAddAssignment = () => {
    if (!selectedSubject || !selectedClassLevel) {
      toast({
        title: "Error",
        description: "Please select both a subject and class level",
        variant: "destructive",
      });
      return;
    }

    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) return;

    const exists = pendingAssignments.some(
      a => a.subjectId === selectedSubject && a.classLevel === selectedClassLevel
    );
    if (exists) {
      toast({
        title: "Error",
        description: "This assignment already exists",
        variant: "destructive",
      });
      return;
    }

    setPendingAssignments([
      ...pendingAssignments,
      {
        subjectId: selectedSubject,
        subjectName: subject.name,
        classLevel: selectedClassLevel,
        isClassTeacher: false,
      },
    ]);

    setSelectedSubject("");
    setSelectedClassLevel("");
  };

  const handleRemoveAssignment = (index: number) => {
    setPendingAssignments(pendingAssignments.filter((_, i) => i !== index));
  };

  const handleAddTeacher = async () => {
    if (!formData.name || !formData.username || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const teacher = await teachersApi.create({
        ...formData,
        subject: pendingAssignments.map(a => a.subjectName).join(", ") || "General",
        assignedClass: classTeacherClass || pendingAssignments[0]?.classLevel || "",
      });

      if (pendingAssignments.length > 0) {
        const assignmentsToCreate = pendingAssignments.map(a => ({
          subjectId: a.subjectId,
          classLevel: a.classLevel,
          isClassTeacher: isClassTeacher && classTeacherClass === a.classLevel,
        }));
        await teacherAssignmentsApi.bulkCreate(teacher.id, assignmentsToCreate);
      }

      toast({
        title: "Success",
        description: "Teacher added successfully with subject assignments",
      });

      setShowAddDialog(false);
      setFormData({ name: "", email: "", username: "", password: "", secretWord: "" });
      setPendingAssignments([]);
      setIsClassTeacher(false);
      setClassTeacherClass("");
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add teacher",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await teachersApi.delete(id);
      toast({
        title: "Success",
        description: "Teacher deleted successfully",
      });
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete teacher",
        variant: "destructive",
      });
    }
  };

  const getTeacherAssignments = (teacherId: string) => {
    return allAssignments.filter(a => a.teacherId === teacherId);
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || "Unknown";
  };

  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    teacher.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSelectedSubjectClassLevels = () => {
    const subject = subjects.find(s => s.id === selectedSubject);
    return subject?.classLevels || GRADES;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Teacher Management</h1>
          <p className="text-muted-foreground mt-1">Create, manage, and assign subjects and classes to teachers.</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20" data-testid="button-add-teacher">
              <Plus className="h-4 w-4" /> Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Teacher</DialogTitle>
              <DialogDescription>Enter teacher details and assign subjects with class levels</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input 
                    placeholder="Dr. Jane Smith" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    data-testid="input-teacher-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    placeholder="jane@academia.edu" 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    data-testid="input-teacher-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input 
                    placeholder="jsmith" 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    data-testid="input-teacher-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input 
                    type="password"
                    placeholder="Enter password" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    data-testid="input-teacher-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secret Word</Label>
                  <Input 
                    placeholder="For password recovery" 
                    value={formData.secretWord}
                    onChange={(e) => setFormData({...formData, secretWord: e.target.value})}
                    data-testid="input-teacher-secret"
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subject & Class Assignments
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger data-testid="select-assignment-subject">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} ({subject.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class Level</Label>
                    <Select 
                      value={selectedClassLevel} 
                      onValueChange={setSelectedClassLevel}
                      disabled={!selectedSubject}
                    >
                      <SelectTrigger data-testid="select-assignment-class">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSelectedSubjectClassLevels().map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleAddAssignment}
                      disabled={!selectedSubject || !selectedClassLevel}
                      className="w-full"
                      data-testid="button-add-assignment"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {pendingAssignments.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm text-muted-foreground">Added Assignments:</Label>
                    <div className="flex flex-wrap gap-2">
                      {pendingAssignments.map((assignment, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="flex items-center gap-1 py-1 px-2"
                          data-testid={`badge-assignment-${index}`}
                        >
                          {assignment.subjectName} - {assignment.classLevel}
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignment(index)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {pendingAssignments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No assignments added yet. Select a subject and class level above.
                  </p>
                )}
              </div>

              <div className="border rounded-lg p-4 bg-blue-50/50">
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox 
                    id="classTeacher" 
                    checked={isClassTeacher}
                    onCheckedChange={(checked) => setIsClassTeacher(checked as boolean)}
                    data-testid="checkbox-class-teacher"
                  />
                  <Label htmlFor="classTeacher" className="font-semibold">Make Class Teacher (Optional)</Label>
                </div>
                {isClassTeacher && (
                  <div className="space-y-2">
                    <Label>Select Class to be Teacher of:</Label>
                    <Select value={classTeacherClass} onValueChange={setClassTeacherClass}>
                      <SelectTrigger data-testid="select-class-teacher-class">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddTeacher} data-testid="button-save-teacher">
                Create Teacher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Teachers</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search teachers..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-teachers"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Subjects & Classes</TableHead>
                  <TableHead>Class Teacher</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No teachers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const assignments = getTeacherAssignments(teacher.id);
                    const classTeacherAssignment = assignments.find(a => a.isClassTeacher);
                    
                    return (
                      <TableRow key={teacher.id} data-testid={`row-teacher-${teacher.id}`}>
                        <TableCell className="font-mono text-sm">{teacher.teacherId}</TableCell>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>{teacher.email || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {assignments.length > 0 ? (
                              assignments.slice(0, 3).map(a => (
                                <Badge key={a.id} variant="secondary" className="text-xs">
                                  {getSubjectName(a.subjectId)} - {a.classLevel}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">{teacher.subject || "No assignments"}</span>
                            )}
                            {assignments.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{assignments.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {classTeacherAssignment ? (
                            <Badge variant="default" className="bg-blue-600">
                              {classTeacherAssignment.classLevel}
                            </Badge>
                          ) : teacher.assignedClass ? (
                            <Badge variant="outline">{teacher.assignedClass}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog open={deleteConfirm === teacher.id} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-teacher-menu-${teacher.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirm(teacher.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Teacher</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete {teacher.name}? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                                <Button variant="destructive" onClick={() => handleDeleteTeacher(teacher.id)}>Delete</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

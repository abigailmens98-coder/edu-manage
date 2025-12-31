import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { teachersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Teacher {
  id: string;
  teacherId: string;
  name: string;
  subject: string;
  email: string;
  assignedClass?: string;
}

const GRADES = [
  "KG 1", "KG 2", 
  "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6",
  "Basic 7", "Basic 8", "Basic 9"
];

export default function Teachers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    email: "",
    assignedClass: "",
    username: "",
    password: "",
    secretWord: "",
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const data = await teachersApi.getAll();
      setTeachers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch teachers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async () => {
    try {
      await teachersApi.create(formData);
      toast({
        title: "Success",
        description: "Teacher added successfully",
      });
      setShowAddDialog(false);
      setFormData({ name: "", subject: "", email: "", assignedClass: "", username: "", password: "", secretWord: "" });
      fetchTeachers();
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
      fetchTeachers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete teacher",
        variant: "destructive",
      });
    }
  };

  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    teacher.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-serif font-bold text-foreground">Teacher Management</h1>
          <p className="text-muted-foreground mt-1">Create, manage, and assign classes to teachers.</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20" data-testid="button-add-teacher">
              <Plus className="h-4 w-4" /> Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Teacher</DialogTitle>
              <DialogDescription>Enter teacher details to create a new profile</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  placeholder="Dr. Jane Smith" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  data-testid="input-teacher-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Department/Subject</Label>
                <Input 
                  placeholder="Science" 
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  data-testid="input-teacher-subject"
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
              <div className="space-y-2">
                <Label>Assigned Class</Label>
                <Select value={formData.assignedClass} onValueChange={(value) => setFormData({...formData, assignedClass: value})}>
                  <SelectTrigger data-testid="select-teacher-class">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input 
                  placeholder="teacher_001" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  data-testid="input-teacher-username"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  placeholder="Enter password" 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  data-testid="input-teacher-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Secret Word (for password recovery)</Label>
                <Input 
                  placeholder="Secret word" 
                  value={formData.secretWord}
                  onChange={(e) => setFormData({...formData, secretWord: e.target.value})}
                  data-testid="input-teacher-secret"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleAddTeacher}
                disabled={!formData.name || !formData.email || !formData.username || !formData.password}
                data-testid="button-submit-teacher"
              >
                Add Teacher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
            <CardTitle>All Teachers</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or subject..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-teachers"
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
                <TableHead>Subject</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned Class</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id} data-testid={`row-teacher-${teacher.id}`}>
                  <TableCell className="font-medium" data-testid={`text-teacher-id-${teacher.id}`}>{teacher.teacherId}</TableCell>
                  <TableCell data-testid={`text-teacher-name-${teacher.id}`}>{teacher.name}</TableCell>
                  <TableCell data-testid={`text-teacher-subject-${teacher.id}`}>{teacher.subject || "General"}</TableCell>
                  <TableCell data-testid={`text-teacher-email-${teacher.id}`}>{teacher.email}</TableCell>
                  <TableCell data-testid={`text-teacher-class-${teacher.id}`}>{teacher.assignedClass || "Not Assigned"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-menu-teacher-${teacher.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirm(teacher.id)}
                          className="text-destructive"
                          data-testid={`button-delete-teacher-${teacher.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
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
              <DialogTitle className="text-red-600">Delete Teacher</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this teacher? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="button-cancel-delete-teacher">
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteTeacher(deleteConfirm)} data-testid="button-confirm-delete-teacher">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, MoreHorizontal, Mail, Trash2, Edit, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  username: string;
  password: string;
  secretWord: string;
  classes: number;
}

export default function Teachers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>(require("@/lib/mock-data").MOCK_TEACHERS);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [newTeacher, setNewTeacher] = useState({ name: "", subject: "", email: "", username: "", password: "", secretWord: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    teacher.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTeacher = () => {
    if (newTeacher.name && newTeacher.email && newTeacher.username && newTeacher.password && newTeacher.secretWord) {
      const teacher: Teacher = {
        id: `T${String(teachers.length + 1).padStart(3, "0")}`,
        ...newTeacher,
        classes: 0
      };
      setTeachers([...teachers, teacher]);
      setNewTeacher({ name: "", subject: "", email: "", username: "", password: "", secretWord: "" });
      setShowAddDialog(false);
      setSuccessMessage("Teacher added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleDeleteTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
    setDeleteConfirm(null);
    setSuccessMessage("Teacher removed from system");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setNewTeacher({ name: teacher.name, subject: teacher.subject, email: teacher.email, username: teacher.username, password: teacher.password, secretWord: teacher.secretWord });
  };

  const handleSaveEdit = () => {
    if (editingTeacher && newTeacher.name && newTeacher.email) {
      setTeachers(teachers.map(t => 
        t.id === editingTeacher.id 
          ? { ...t, ...newTeacher }
          : t
      ));
      setEditingTeacher(null);
      setNewTeacher({ name: "", subject: "", email: "", username: "", password: "", secretWord: "" });
      setSuccessMessage("Teacher profile updated!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Teacher Management</h1>
          <p className="text-muted-foreground mt-1">Create, manage, and assign privileges to teachers.</p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)} 
          className="gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto"
          data-testid="button-add-teacher"
        >
          <Plus className="h-4 w-4" /> Add Teacher
        </Button>
      </div>

      {/* Add/Edit Teacher Dialog */}
      <Dialog open={showAddDialog || editingTeacher !== null} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingTeacher(null);
          setNewTeacher({ name: "", subject: "", email: "", username: "", password: "", secretWord: "" });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "Edit Teacher Profile" : "Add New Teacher"}</DialogTitle>
            <DialogDescription>
              {editingTeacher ? "Update teacher details and credentials" : "Enter teacher details to create a new profile"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="Dr. Jane Smith" 
                value={newTeacher.name}
                onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})}
                data-testid="input-teacher-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Department/Subject</Label>
              <Input 
                placeholder="Science" 
                value={newTeacher.subject}
                onChange={(e) => setNewTeacher({...newTeacher, subject: e.target.value})}
                data-testid="input-teacher-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                placeholder="jane@academia.edu" 
                type="email"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                data-testid="input-teacher-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input 
                placeholder="teacher_001" 
                value={newTeacher.username}
                onChange={(e) => setNewTeacher({...newTeacher, username: e.target.value})}
                data-testid="input-teacher-username"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                placeholder="Temporary password" 
                type="password"
                value={newTeacher.password}
                onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})}
                data-testid="input-teacher-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Word (for password reset)</Label>
              <Input 
                placeholder="e.g., ghana" 
                value={newTeacher.secretWord}
                onChange={(e) => setNewTeacher({...newTeacher, secretWord: e.target.value})}
                data-testid="input-teacher-secret"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddDialog(false);
                setEditingTeacher(null);
                setNewTeacher({ name: "", subject: "", email: "", username: "", password: "", secretWord: "" });
              }}
              data-testid="button-cancel-teacher"
            >
              Cancel
            </Button>
            <Button 
              onClick={editingTeacher ? handleSaveEdit : handleAddTeacher}
              data-testid="button-save-teacher"
            >
              {editingTeacher ? "Update Teacher" : "Add Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeachers.map((teacher) => (
          <Card key={teacher.id} className="hover-elevate transition-all overflow-hidden border-t-4 border-t-primary flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {teacher.name.split(" ").map(n => n[0]).join("")}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2 -mt-2" data-testid={`button-menu-${teacher.id}`}>
                       <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem onClick={() => handleEditTeacher(teacher)} data-testid={`button-edit-${teacher.id}`}>
                       <Edit className="h-4 w-4 mr-2" /> Edit Profile
                     </DropdownMenuItem>
                     <DropdownMenuItem 
                       onClick={() => setDeleteConfirm(teacher.id)}
                       className="text-red-600"
                       data-testid={`button-delete-${teacher.id}`}
                     >
                       <Trash2 className="h-4 w-4 mr-2" /> Remove Teacher
                     </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="mt-4">{teacher.name}</CardTitle>
              <CardDescription>{teacher.subject} Department</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Mail className="h-3 w-3 mr-2" />
                  {teacher.email}
                </div>
                <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded mt-2">
                  <p><strong>Login:</strong> {teacher.username}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t mt-4">
                  <span className="text-muted-foreground">Active Classes</span>
                  <span className="font-bold bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{teacher.classes}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open={true} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600">Remove Teacher</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this teacher from the system? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-900">
                <strong>{teachers.find(t => t.id === deleteConfirm)?.name}</strong> will be removed from all classes and the system.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirm(null)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleDeleteTeacher(deleteConfirm)}
                data-testid="button-confirm-delete"
              >
                Remove Teacher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
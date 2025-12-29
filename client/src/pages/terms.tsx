import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ACADEMIC_TERMS } from "@/lib/mock-data";
import { Calendar, Plus, Edit2 } from "lucide-react";

export default function TermsManagement() {
  const [terms, setTerms] = useState(ACADEMIC_TERMS);
  const [newTermName, setNewTermName] = useState("");
  const [newTermDesc, setNewTermDesc] = useState("");
  const [newTermStatus, setNewTermStatus] = useState("Inactive");

  const handleAddTerm = () => {
    if (newTermName.trim()) {
      const newTerm = {
        id: `TERM${Date.now()}`,
        name: newTermName,
        description: newTermDesc,
        status: newTermStatus,
      };
      setTerms([...terms, newTerm]);
      setNewTermName("");
      setNewTermDesc("");
      setNewTermStatus("Inactive");
    }
  };

  const handleToggleStatus = (termId: string) => {
    setTerms(
      terms.map(t => ({
        ...t,
        status: t.id === termId ? (t.status === "Active" ? "Inactive" : "Active") : t.status,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Academic Terms Management</h1>
          <p className="text-muted-foreground mt-1">Configure and manage academic terms for the school year.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Add Term
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Academic Term</DialogTitle>
              <DialogDescription>
                Add a new term to the academic calendar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="termName">Term Name</Label>
                <Input
                  id="termName"
                  placeholder="e.g., Term 1, Term 2, Term 3"
                  value={newTermName}
                  onChange={(e) => setNewTermName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="termDesc">Description</Label>
                <Input
                  id="termDesc"
                  placeholder="e.g., First academic term"
                  value={newTermDesc}
                  onChange={(e) => setNewTermDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="termStatus">Initial Status</Label>
                <Select value={newTermStatus} onValueChange={setNewTermStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddTerm}>
                Create Term
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {terms.map((term) => (
          <Card key={term.id} className="hover-elevate transition-all border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {term.name}
                  </CardTitle>
                  <CardDescription className="mt-1">{term.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge
                  variant={term.status === "Active" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => handleToggleStatus(term.id)}
                >
                  {term.status}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full gap-2" size="sm">
                <Edit2 className="h-3 w-3" />
                Edit Term
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Grading System</CardTitle>
          <CardDescription>GES Ghana Grading Scale Used in University Basic School</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-primary">A+</div>
              <div className="text-xs text-muted-foreground">80-100</div>
              <div className="text-xs font-medium mt-1">Excellent</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-primary">A</div>
              <div className="text-xs text-muted-foreground">75-79</div>
              <div className="text-xs font-medium mt-1">Very Good</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-blue-600">B+</div>
              <div className="text-xs text-muted-foreground">70-74</div>
              <div className="text-xs font-medium mt-1">Good</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-blue-600">B</div>
              <div className="text-xs text-muted-foreground">65-69</div>
              <div className="text-xs font-medium mt-1">Good</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-green-600">C+</div>
              <div className="text-xs text-muted-foreground">60-64</div>
              <div className="text-xs font-medium mt-1">Satisfactory</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-green-600">C</div>
              <div className="text-xs text-muted-foreground">55-59</div>
              <div className="text-xs font-medium mt-1">Satisfactory</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-orange-600">D+</div>
              <div className="text-xs text-muted-foreground">50-54</div>
              <div className="text-xs font-medium mt-1">Pass</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-orange-600">D</div>
              <div className="text-xs text-muted-foreground">45-49</div>
              <div className="text-xs font-medium mt-1">Pass</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-red-600">E</div>
              <div className="text-xs text-muted-foreground">40-44</div>
              <div className="text-xs font-medium mt-1">Weak Pass</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-red-600">F</div>
              <div className="text-xs text-muted-foreground">0-39</div>
              <div className="text-xs font-medium mt-1">Fail</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

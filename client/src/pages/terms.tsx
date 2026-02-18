import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Edit2, Trash2, CheckCircle, Settings, Loader2 } from "lucide-react";
import { academicYearsApi, academicTermsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface AcademicYear {
  id: string;
  year: string;
  status: string;
  totalDays: number;
}

interface Term {
  id: string;
  name: string;
  description: string;
  status: string;
  academicYearId: string;
  totalAttendanceDays: number;
}

export default function TermsManagement() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAttendanceDays, setEditAttendanceDays] = useState("");
  const [deleteTermId, setDeleteTermId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [yearsData, termsData] = await Promise.all([
        academicYearsApi.getAll(),
        academicTermsApi.getAll(),
      ]);
      setYears(yearsData);
      setTerms(termsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch terms data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveTerm = async (id: string) => {
    try {
      await academicTermsApi.setActive(id);
      toast({
        title: "Success",
        description: "Term set as active",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set active term",
        variant: "destructive",
      });
    }
  };

  const handleEditTerm = (term: Term) => {
    setEditingTerm(term);
    setEditName(term.name);
    setEditDescription(term.description);
    setEditAttendanceDays(String(term.totalAttendanceDays || 60));
  };

  const handleSaveEdit = async () => {
    if (!editingTerm) return;
    try {
      await academicTermsApi.update(editingTerm.id, {
        name: editName,
        description: editDescription,
        totalAttendanceDays: parseInt(editAttendanceDays),
      });
      toast({
        title: "Success",
        description: "Term updated successfully",
      });
      setEditingTerm(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update term",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTerm = async (id: string) => {
    try {
      await academicTermsApi.delete(id);
      toast({
        title: "Success",
        description: "Term deleted successfully",
      });
      setDeleteTermId(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete term",
        variant: "destructive",
      });
    }
  };

  const getActiveYear = () => years.find(y => y.status === "Active");
  const getTermsForYear = (yearId: string) => terms.filter(t => t.academicYearId === yearId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const activeYear = getActiveYear();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Academic Terms Management</h1>
          <p className="text-muted-foreground mt-1">Configure and manage academic terms for the school year.</p>
        </div>
        <Link href="/settings">
          <Button className="gap-2 shadow-lg shadow-primary/20" data-testid="button-go-settings">
            <Settings className="h-4 w-4" /> Manage in Settings
          </Button>
        </Link>
      </div>

      {activeYear && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Active Academic Year:</span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                {activeYear.year}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {years.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Academic Years Yet</h3>
            <p className="text-muted-foreground mb-4">Create an academic year in Settings to get started.</p>
            <Link href="/settings">
              <Button data-testid="button-create-year">Go to Settings</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        years.map(year => (
          <Card key={year.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {year.year}
                  </CardTitle>
                  <CardDescription>{year.totalDays} school days</CardDescription>
                </div>
                <Badge variant={year.status === "Active" ? "default" : "secondary"}>
                  {year.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {getTermsForYear(year.id).map((term) => (
                  <Card key={term.id} className="hover-elevate transition-all border-l-4 border-l-primary" data-testid={`card-term-${term.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{term.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">{term.description}</CardDescription>
                        </div>
                        <Badge
                          variant={term.status === "Active" ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => term.status !== "Active" && handleSetActiveTerm(term.id)}
                          data-testid={`badge-term-status-${term.id}`}
                        >
                          {term.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="text-sm text-muted-foreground">
                        <strong>{term.totalAttendanceDays || 60}</strong> attendance days
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 gap-2">
                      <Dialog open={editingTerm?.id === term.id} onOpenChange={(open) => !open && setEditingTerm(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            size="sm"
                            onClick={() => handleEditTerm(term)}
                            data-testid={`button-edit-term-${term.id}`}
                          >
                            <Edit2 className="h-3 w-3" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Term</DialogTitle>
                            <DialogDescription>Update term details below.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="editName">Term Name</Label>
                              <Input
                                id="editName"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                data-testid="input-edit-term-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="editDesc">Description</Label>
                              <Input
                                id="editDesc"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                data-testid="input-edit-term-desc"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="editDays">Attendance Days</Label>
                              <Input
                                id="editDays"
                                type="number"
                                value={editAttendanceDays}
                                onChange={(e) => setEditAttendanceDays(e.target.value)}
                                data-testid="input-edit-term-days"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingTerm(null)}>Cancel</Button>
                            <Button onClick={handleSaveEdit} data-testid="button-save-term">Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={deleteTermId === term.id} onOpenChange={(open) => !open && setDeleteTermId(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTermId(term.id)}
                            data-testid={`button-delete-term-${term.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Term</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete {term.name}? This will also delete all scores for this term.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteTermId(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => handleDeleteTerm(term.id)}>Delete</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>
                ))}
                {getTermsForYear(year.id).length === 0 && (
                  <div className="col-span-3 text-center py-8 text-muted-foreground">
                    No terms for this academic year. Add terms in Settings.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Grading System</CardTitle>
          <CardDescription>GES Ghana Grading Scale Used in University Basic School</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-primary">1</div>
              <div className="text-xs text-muted-foreground">80-100</div>
              <div className="text-xs font-medium mt-1">Excellent</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-primary">2</div>
              <div className="text-xs text-muted-foreground">75-79</div>
              <div className="text-xs font-medium mt-1">Very Good</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-blue-600">3</div>
              <div className="text-xs text-muted-foreground">70-74</div>
              <div className="text-xs font-medium mt-1">Good</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-blue-600">4</div>
              <div className="text-xs text-muted-foreground">65-69</div>
              <div className="text-xs font-medium mt-1">Good</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-green-600">5</div>
              <div className="text-xs text-muted-foreground">60-64</div>
              <div className="text-xs font-medium mt-1">Satisfactory</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-green-600">6</div>
              <div className="text-xs text-muted-foreground">55-59</div>
              <div className="text-xs font-medium mt-1">Satisfactory</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-orange-600">7</div>
              <div className="text-xs text-muted-foreground">50-54</div>
              <div className="text-xs font-medium mt-1">Pass</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-orange-600">8</div>
              <div className="text-xs text-muted-foreground">45-49</div>
              <div className="text-xs font-medium mt-1">Pass</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-900 rounded border">
              <div className="font-bold text-lg text-red-600">9</div>
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

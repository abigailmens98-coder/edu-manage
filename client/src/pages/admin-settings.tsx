import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Save, Calendar, Clock, BarChart3, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { academicYearsApi, academicTermsApi, gradingScalesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, X } from "lucide-react";

interface AcademicYear {
  id: string;
  year: string;
  status: string;
  totalDays: number;
}

interface AcademicTerm {
  id: string;
  name: string;
  status: string;
  academicYearId: string;
  totalAttendanceDays: number;
}

interface GradingScale {
  id: string;
  type: string;
  grade: string;
  minScore: number;
  maxScore: number;
  description: string;
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("academic");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [loading, setLoading] = useState(true);

  // Academic Year State
  const [newYear, setNewYear] = useState({ year: "", totalDays: "190" });
  const [deleteYearId, setDeleteYearId] = useState<string | null>(null);

  // Term State
  const [deleteTermId, setDeleteTermId] = useState<string | null>(null);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editAttendanceDays, setEditAttendanceDays] = useState("");

  // Grading Scale State
  const [editingScaleId, setEditingScaleId] = useState<string | null>(null);
  const [editScaleForm, setEditScaleForm] = useState<Partial<GradingScale>>({});
  const [newScaleForm, setNewScaleForm] = useState<Partial<GradingScale>>({ type: "jhs", minScore: 0, maxScore: 0, grade: "", description: "" });
  const [isAddingScale, setIsAddingScale] = useState<string | null>(null); // 'jhs' or 'primary'

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [yearsData, termsData, gradingData] = await Promise.all([
        academicYearsApi.getAll(),
        academicTermsApi.getAll(),
        gradingScalesApi.getAll(),
      ]);
      setYears(yearsData);
      setTerms(termsData);
      setGradingScales(gradingData);
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

  const handleAddYear = async () => {
    if (!newYear.year || !newYear.totalDays) return;

    try {
      const year = await academicYearsApi.create({
        year: newYear.year,
        status: "Inactive",
        totalDays: parseInt(newYear.totalDays),
      });

      const termAttendance = Math.floor(parseInt(newYear.totalDays) / 3);
      await Promise.all([
        academicTermsApi.create({
          name: "Term 1",
          description: "First academic term",
          status: "Inactive",
          academicYearId: year.id,
          totalAttendanceDays: termAttendance,
        }),
        academicTermsApi.create({
          name: "Term 2",
          description: "Second academic term",
          status: "Inactive",
          academicYearId: year.id,
          totalAttendanceDays: termAttendance,
        }),
        academicTermsApi.create({
          name: "Term 3",
          description: "Third academic term",
          status: "Inactive",
          academicYearId: year.id,
          totalAttendanceDays: termAttendance,
        }),
      ]);

      toast({
        title: "Success",
        description: "Academic year and terms created successfully",
      });

      setNewYear({ year: "", totalDays: "190" });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create academic year",
        variant: "destructive",
      });
    }
  };

  const handleSetActiveYear = async (id: string) => {
    try {
      await academicYearsApi.setActive(id);
      toast({
        title: "Success",
        description: "Academic year set as active",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set active year",
        variant: "destructive",
      });
    }
  };

  const handleDeleteYear = async (id: string) => {
    try {
      await academicYearsApi.delete(id);
      toast({
        title: "Success",
        description: "Academic year and its terms deleted",
      });
      setDeleteYearId(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete academic year",
        variant: "destructive",
      });
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

  const handleDeleteTerm = async (id: string) => {
    try {
      await academicTermsApi.delete(id);
      toast({
        title: "Success",
        description: "Term deleted",
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

  const handleUpdateTermAttendance = async (id: string) => {
    try {
      await academicTermsApi.update(id, { totalAttendanceDays: parseInt(editAttendanceDays) });
      toast({
        title: "Success",
        description: "Term attendance days updated",
      });
      setEditingTermId(null);
      setEditAttendanceDays("");
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update attendance days",
        variant: "destructive",
      });
    }
  };

  const getTermsForYear = (yearId: string) => terms.filter(t => t.academicYearId === yearId);
  const getActiveYear = () => years.find(y => y.status === "Active");
  const getActiveTerm = () => terms.find(t => t.status === "Active");

  // Grading Scale Handlers
  const handleAddScale = async () => {
    if (!isAddingScale || !newScaleForm.grade || !newScaleForm.description) return;

    try {
      const scale = await gradingScalesApi.create({
        ...newScaleForm,
        type: isAddingScale,
        minScore: Number(newScaleForm.minScore),
        maxScore: Number(newScaleForm.maxScore),
      });
      setGradingScales([...gradingScales, scale]);
      setIsAddingScale(null);
      setNewScaleForm({ type: "jhs", minScore: 0, maxScore: 0, grade: "", description: "" });
      toast({ title: "Success", description: "Grading scale added" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add grading scale", variant: "destructive" });
    }
  };

  const handleUpdateScale = async () => {
    if (!editingScaleId) return;

    try {
      const updated = await gradingScalesApi.update(editingScaleId, {
        ...editScaleForm,
        minScore: Number(editScaleForm.minScore),
        maxScore: Number(editScaleForm.maxScore),
      });
      setGradingScales(gradingScales.map(s => s.id === editingScaleId ? updated : s));
      setEditingScaleId(null);
      toast({ title: "Success", description: "Grading scale updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update grading scale", variant: "destructive" });
    }
  };

  const handleDeleteScale = async (id: string) => {
    try {
      await gradingScalesApi.delete(id);
      setGradingScales(gradingScales.filter(s => s.id !== id));
      toast({ title: "Success", description: "Grading scale deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete grading scale", variant: "destructive" });
    }
  };

  const renderGradingTable = (type: string, title: string) => {
    const scales = gradingScales.filter(s => s.type === type).sort((a, b) => b.minScore - a.minScore);

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <Button size="sm" onClick={() => { setIsAddingScale(type); setNewScaleForm({ ...newScaleForm, type }); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Grade
          </Button>
        </div>

        {isAddingScale === type && (
          <div className="border rounded-lg p-4 mb-4 bg-muted/20">
            <h4 className="text-sm font-medium mb-3">New Grade Entry</h4>
            <div className="grid grid-cols-5 gap-4 items-end">
              <div>
                <Label className="text-xs">Grade</Label>
                <Input
                  value={newScaleForm.grade}
                  onChange={e => setNewScaleForm({ ...newScaleForm, grade: e.target.value })}
                  placeholder="A"
                />
              </div>
              <div>
                <Label className="text-xs">Min %</Label>
                <Input
                  type="number"
                  value={newScaleForm.minScore}
                  onChange={e => setNewScaleForm({ ...newScaleForm, minScore: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Max %</Label>
                <Input
                  type="number"
                  value={newScaleForm.maxScore}
                  onChange={e => setNewScaleForm({ ...newScaleForm, maxScore: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Description</Label>
                <div className="flex gap-2">
                  <Input
                    value={newScaleForm.description}
                    onChange={e => setNewScaleForm({ ...newScaleForm, description: e.target.value })}
                    placeholder="Excellent"
                  />
                  <Button onClick={handleAddScale} size="icon"><Save className="h-4 w-4" /></Button>
                  <Button onClick={() => setIsAddingScale(null)} size="icon" variant="ghost"><X className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Min Score</TableHead>
                <TableHead>Max Score</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No grades defined</TableCell>
                </TableRow>
              ) : (
                scales.map(scale => (
                  <TableRow key={scale.id}>
                    {editingScaleId === scale.id ? (
                      <>
                        <TableCell><Input value={editScaleForm.grade} onChange={e => setEditScaleForm({ ...editScaleForm, grade: e.target.value })} /></TableCell>
                        <TableCell><Input type="number" value={editScaleForm.minScore} onChange={e => setEditScaleForm({ ...editScaleForm, minScore: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" value={editScaleForm.maxScore} onChange={e => setEditScaleForm({ ...editScaleForm, maxScore: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input value={editScaleForm.description} onChange={e => setEditScaleForm({ ...editScaleForm, description: e.target.value })} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={handleUpdateScale}><Save className="h-4 w-4 text-green-600" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingScaleId(null)}><X className="h-4 w-4 text-red-600" /></Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-bold">{scale.grade}</TableCell>
                        <TableCell>{scale.minScore}%</TableCell>
                        <TableCell>{scale.maxScore}%</TableCell>
                        <TableCell>{scale.description}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingScaleId(scale.id); setEditScaleForm(scale); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteScale(scale.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeYear = getActiveYear();
  const activeTerm = getActiveTerm();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2">
          <Settings className="h-8 w-8" />
          System Settings
        </h1>
        <p className="text-muted-foreground mt-1">Configure academic years, terms, attendance, and grading scales</p>
      </div>

      {(activeYear || activeTerm) && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Current Active:</span>
              {activeYear && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {activeYear.year}
                </span>
              )}
              {activeTerm && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {activeTerm.name} ({activeTerm.totalAttendanceDays} days)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[600px] grid-cols-3">
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Academic Years
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Terms & Attendance
          </TabsTrigger>
          <TabsTrigger value="grading" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Grading
          </TabsTrigger>
        </TabsList>

        <TabsContent value="academic" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Years</CardTitle>
              <CardDescription>Create and manage academic years. Setting a year as active will deactivate all others.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-b pb-6">
                <h3 className="font-semibold mb-4">Add New Academic Year</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Academic Year (e.g., 2025/2026)</Label>
                    <Input
                      id="year"
                      placeholder="2025/2026"
                      value={newYear.year}
                      onChange={(e) => setNewYear({ ...newYear, year: e.target.value })}
                      data-testid="input-academic-year"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="days">Total School Days (Year)</Label>
                    <Input
                      id="days"
                      type="number"
                      placeholder="190"
                      value={newYear.totalDays}
                      onChange={(e) => setNewYear({ ...newYear, totalDays: e.target.value })}
                      data-testid="input-total-days"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAddYear}
                      className="w-full gap-2"
                      disabled={!newYear.year || !newYear.totalDays}
                      data-testid="button-add-year"
                    >
                      <Save className="h-4 w-4" />
                      Add Year
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">This will automatically create Term 1, Term 2, and Term 3 for the year.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Current Academic Years</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Academic Year</TableHead>
                        <TableHead>Total Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Terms</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {years.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No academic years created yet. Add one above.
                          </TableCell>
                        </TableRow>
                      ) : (
                        years.map(y => (
                          <TableRow key={y.id} data-testid={`row-year-${y.id}`}>
                            <TableCell className="font-medium" data-testid={`text-year-${y.id}`}>{y.year}</TableCell>
                            <TableCell data-testid={`text-days-${y.id}`}>{y.totalDays} days</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${y.status === "Active" ? "bg-green-100 text-green-800" :
                                y.status === "Completed" ? "bg-blue-100 text-blue-800" :
                                  "bg-gray-100 text-gray-800"
                                }`} data-testid={`badge-status-${y.id}`}>
                                {y.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {getTermsForYear(y.id).length} terms
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {y.status !== "Active" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetActiveYear(y.id)}
                                    data-testid={`button-activate-${y.id}`}
                                  >
                                    Set Active
                                  </Button>
                                )}
                                <Dialog open={deleteYearId === y.id} onOpenChange={(open) => !open && setDeleteYearId(null)}>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setDeleteYearId(y.id)}
                                      data-testid={`button-delete-year-${y.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Delete Academic Year</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete {y.year}? This will also delete all terms and scores associated with this year. This action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setDeleteYearId(null)}>Cancel</Button>
                                      <Button variant="destructive" onClick={() => handleDeleteYear(y.id)}>Delete</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Terms & Attendance Settings</CardTitle>
              <CardDescription>Manage terms for each academic year and set attendance days per term. The attendance days set here will be used when teachers enter student attendance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">How Attendance Works</h4>
                  <p className="text-sm text-blue-800">Set the total school days for each term below. Teachers will enter how many days each student attended out of this total.</p>
                </div>
              </div>

              {years.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No academic years created yet. Create an academic year first.
                </div>
              ) : (
                years.map(y => (
                  <div key={y.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">{y.year}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${y.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>
                        {y.status}
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Term</TableHead>
                          <TableHead>Attendance Days</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getTermsForYear(y.id).map(term => (
                          <TableRow key={term.id} data-testid={`row-term-${term.id}`}>
                            <TableCell className="font-medium">{term.name}</TableCell>
                            <TableCell>
                              {editingTermId === term.id ? (
                                <div className="flex gap-2 items-center">
                                  <Input
                                    type="number"
                                    value={editAttendanceDays}
                                    onChange={(e) => setEditAttendanceDays(e.target.value)}
                                    className="w-24"
                                    data-testid={`input-attendance-${term.id}`}
                                  />
                                  <Button size="sm" onClick={() => handleUpdateTermAttendance(term.id)}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => { setEditingTermId(null); setEditAttendanceDays(""); }}>Cancel</Button>
                                </div>
                              ) : (
                                <span className="font-mono">{term.totalAttendanceDays || 60} days</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${term.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                }`}>
                                {term.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {term.status !== "Active" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetActiveTerm(term.id)}
                                    data-testid={`button-activate-term-${term.id}`}
                                  >
                                    Set Active
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => { setEditingTermId(term.id); setEditAttendanceDays(String(term.totalAttendanceDays || 60)); }}
                                  data-testid={`button-edit-attendance-${term.id}`}
                                >
                                  Edit Days
                                </Button>
                                <Dialog open={deleteTermId === term.id} onOpenChange={(open) => !open && setDeleteTermId(null)}>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setDeleteTermId(term.id)}
                                      data-testid={`button-delete-term-${term.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Delete Term</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete {term.name}? This will also delete all scores for this term. This action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setDeleteTermId(null)}>Cancel</Button>
                                      <Button variant="destructive" onClick={() => handleDeleteTerm(term.id)}>Delete</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {getTermsForYear(y.id).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              No terms for this year
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Grading Scales</CardTitle>
              <CardDescription>Configure the grading systems used for assessment. These settings will be reflected in student reports.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderGradingTable("jhs", "Basic 7-9 (JHS)")}
              {renderGradingTable("primary", "Basic 1-6 (Primary)")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

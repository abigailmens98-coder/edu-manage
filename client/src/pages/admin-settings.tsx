import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Save, CheckCircle, Calendar, Clock, BarChart3 } from "lucide-react";
import { academicYearsApi, academicTermsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { GES_GRADING_SCALE, BASIC_1_6_GRADING_SCALE } from "@/lib/mock-data";

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
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("academic");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState({ year: "", totalDays: "" });
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

      // Create 3 terms for the academic year
      await Promise.all([
        academicTermsApi.create({
          name: "Term 1",
          description: "First academic term",
          status: "Inactive",
          academicYearId: year.id,
        }),
        academicTermsApi.create({
          name: "Term 2",
          description: "Second academic term",
          status: "Inactive",
          academicYearId: year.id,
        }),
        academicTermsApi.create({
          name: "Term 3",
          description: "Third academic term",
          status: "Inactive",
          academicYearId: year.id,
        }),
      ]);

      toast({
        title: "Success",
        description: "Academic year and terms created successfully",
      });
      
      setNewYear({ year: "", totalDays: "" });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create academic year",
        variant: "destructive",
      });
    }
  };

  const handleUpdateYearStatus = async (id: string, status: string) => {
    try {
      await academicYearsApi.update(id, { status });
      toast({
        title: "Success",
        description: `Academic year marked as ${status}`,
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
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
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2">
          <Settings className="h-8 w-8" />
          System Settings
        </h1>
        <p className="text-muted-foreground mt-1">Configure academic years, attendance, and grading scales</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[600px] grid-cols-3">
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Academic Years
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Attendance
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
              <CardDescription>Create and manage academic years for your institution</CardDescription>
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
                      onChange={(e) => setNewYear({...newYear, year: e.target.value})}
                      data-testid="input-academic-year"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="days">Total School Days</Label>
                    <Input
                      id="days"
                      type="number"
                      placeholder="190"
                      value={newYear.totalDays}
                      onChange={(e) => setNewYear({...newYear, totalDays: e.target.value})}
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
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {years.map(y => (
                        <TableRow key={y.id} data-testid={`row-year-${y.id}`}>
                          <TableCell className="font-medium" data-testid={`text-year-${y.id}`}>{y.year}</TableCell>
                          <TableCell data-testid={`text-days-${y.id}`}>{y.totalDays} days</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              y.status === "Active" ? "bg-green-100 text-green-800" :
                              y.status === "Completed" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`} data-testid={`badge-status-${y.id}`}>
                              {y.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {y.status === "Inactive" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateYearStatus(y.id, "Active")}
                                data-testid={`button-activate-${y.id}`}
                              >
                                Activate
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Settings</CardTitle>
              <CardDescription>Configure attendance parameters for each academic year</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Attendance Configuration</h3>
                <p className="text-sm text-blue-800">Teachers enter attendance as whole numbers (e.g., 85 days). The system uses the total school days set for the academic year.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Grading Scales</CardTitle>
              <CardDescription>View the GES grading system used for assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Basic 1-6 Grading Scale</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Range</TableHead>
                        <TableHead>Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {BASIC_1_6_GRADING_SCALE.map((scale, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{scale.range}</TableCell>
                          <TableCell>{scale.remark}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Basic 7-9 Grading Scale (GES)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Range</TableHead>
                        <TableHead>Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {GES_GRADING_SCALE.map((scale, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-bold text-primary">{scale.grade}</TableCell>
                          <TableCell className="font-medium">{scale.range}</TableCell>
                          <TableCell>{scale.remark}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

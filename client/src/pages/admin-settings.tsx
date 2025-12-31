import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Save, CheckCircle, Calendar, Clock, BarChart3 } from "lucide-react";
import { ACADEMIC_YEARS, ACADEMIC_TERMS, GES_GRADING_SCALE, BASIC_1_6_GRADING_SCALE } from "@/lib/mock-data";

interface AcademicYear {
  id: string;
  year: string;
  status: "Active" | "Completed" | "Inactive";
  totalDays: number;
}

interface GradingConfig {
  classLevel: string;
  minScore: number;
  maxScore: number;
  grade: string;
  remarks: string;
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("academic");
  const [submitted, setSubmitted] = useState(false);
  
  // Academic Years
  const [years, setYears] = useState<AcademicYear[]>([
    { id: "AY2024", year: "2023/2024", status: "Completed", totalDays: 180 },
    { id: "AY2025", year: "2024/2025", status: "Active", totalDays: 190 },
    { id: "AY2026", year: "2025/2026", status: "Inactive", totalDays: 0 },
  ]);
  
  const [newYear, setNewYear] = useState({ year: "", totalDays: "" });
  
  const handleAddYear = () => {
    if (newYear.year && newYear.totalDays) {
      setYears([...years, {
        id: `AY${Date.now()}`,
        year: newYear.year,
        status: "Inactive",
        totalDays: parseInt(newYear.totalDays)
      }]);
      setNewYear({ year: "", totalDays: "" });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    }
  };

  const handleSave = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

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

        {/* Academic Years Tab */}
        <TabsContent value="academic" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Years</CardTitle>
              <CardDescription>Create and manage academic years for your institution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Year */}
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
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddYear} className="w-full gap-2">
                      <Save className="h-4 w-4" />
                      Add Year
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing Years */}
              <div>
                <h3 className="font-semibold mb-4">Current Academic Years</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Academic Year</TableHead>
                        <TableHead>Total Days</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {years.map(y => (
                        <TableRow key={y.id}>
                          <TableCell className="font-medium">{y.year}</TableCell>
                          <TableCell>{y.totalDays} days</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              y.status === "Active" ? "bg-green-100 text-green-800" :
                              y.status === "Completed" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {y.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {submitted && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 ml-2">
                    Settings updated successfully!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Settings</CardTitle>
              <CardDescription>Configure attendance parameters for each academic year</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Attendance Configuration</h3>
                  <p className="text-sm text-blue-800 mb-4">Teachers will enter attendance as whole numbers (e.g., 85 days), and the system will calculate the percentage based on the total school days you set for the academic year above.</p>
                </div>

                {years.map(year => (
                  <div key={year.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">{year.year}</p>
                        <p className="text-xs text-muted-foreground">Total: {year.totalDays} school days</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        year.status === "Active" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {year.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Example: If a student is marked present for 170 days out of {year.totalDays} days = {((170/year.totalDays)*100).toFixed(1)}% attendance
                    </p>
                  </div>
                ))}
              </div>

              {submitted && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 ml-2">
                    Attendance settings configured!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Save Attendance Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Grading Tab */}
        <TabsContent value="grading" className="mt-6 space-y-6">
          {/* Basic 7-9 */}
          <Card>
            <CardHeader>
              <CardTitle>Basic 7-9 Grading Scale (GES)</CardTitle>
              <CardDescription>Senior grades grading scale and remarks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Score Range</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {GES_GRADING_SCALE.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.range[0]} - {item.range[1]}%</TableCell>
                        <TableCell className="font-bold text-lg">{item.grade}</TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Basic 1-6 */}
          <Card>
            <CardHeader>
              <CardTitle>Basic 1-6 Grading Scale</CardTitle>
              <CardDescription>Lower grades grading scale and remarks interpretation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Score Range</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Remarks Interpretation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {BASIC_1_6_GRADING_SCALE.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.range[0]} - {item.range[1]}%</TableCell>
                        <TableCell className="font-bold text-lg">{item.grade}</TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Alert className="mt-4 bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-800">
                  <strong>Note:</strong> These grading scales are configured system-wide and cannot be modified from this interface in the mockup version. To change grading scales, the application would need full database integration.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

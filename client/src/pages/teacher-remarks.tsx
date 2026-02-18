import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Save, CheckCircle, Info, Download, BookOpen, Loader2 } from "lucide-react";
import { studentsApi, academicTermsApi, teacherAssignmentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface StudentTermDetails {
  id?: string;
  studentId: string;
  termId: string;
  attendance: number;
  attendanceTotal: number;
  attitude: string;
  conduct: string;
  interest: string;
  classTeacherRemark: string;
}

export default function TeacherRemarks() {
  const { username, role } = useAuth();
  const { toast } = useToast();

  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const { teacherInfo } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentRemark, setCurrentRemark] = useState<StudentTermDetails>({
    studentId: "",
    termId: "",
    attendance: 0,
    attendanceTotal: 100,
    attitude: "",
    conduct: "",
    interest: "",
    classTeacherRemark: "",
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const [termsData, studentsData] = await Promise.all([
          academicTermsApi.getAll(),
          studentsApi.getAll(),
        ]);
        setTerms(termsData);
        setStudents(studentsData);

        // Set active term
        const active = termsData.find((t: any) => t.status === "Active");
        if (active) setSelectedTerm(active.id);

        // If teacher, try to set assigned class
        if (role === "teacher" && teacherInfo) {
          const assignmentsData = await teacherAssignmentsApi.getByTeacher(teacherInfo.id);
          setAssignments(assignmentsData);

          const classTeacherClass = assignmentsData.find((a: any) => a.isClassTeacher);
          if (classTeacherClass) {
            setSelectedClass(classTeacherClass.classLevel);
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load initial data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (selectedStudent && selectedTerm) {
      fetchStudentDetails(selectedStudent, selectedTerm);
    } else {
      // Reset form if no student selected
      setCurrentRemark({
        studentId: selectedStudent,
        termId: selectedTerm,
        attendance: 0,
        attendanceTotal: 100,
        attitude: "",
        conduct: "",
        interest: "",
        classTeacherRemark: "",
      });
    }
  }, [selectedStudent, selectedTerm]);

  const fetchStudentDetails = async (studentId: string, termId: string) => {
    setLoadingDetails(true);
    try {
      const details = await studentsApi.getTermDetails(studentId, termId);
      if (details) {
        setCurrentRemark(details);
      } else {
        // Reset to defaults but keep IDs
        setCurrentRemark({
          studentId,
          termId,
          attendance: 0,
          attendanceTotal: 100,
          attitude: "",
          conduct: "",
          interest: "",
          classTeacherRemark: "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch details", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getUniqueClasses = () => {
    let classes: string[] = [];

    if (role === "admin") {
      classes = Array.from(new Set(students.map((s: any) => s.grade)));
    } else {
      // Filter by teacher assignments where isClassTeacher is true
      classes = assignments
        .filter((a: any) => a.isClassTeacher)
        .map((a: any) => a.classLevel);
    }

    return classes.sort((a: any, b: any) => {
      const order = ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"];
      return order.indexOf(a) - order.indexOf(b);
    });
  };

  const getStudentsByClass = (classLevel: string) => {
    return students.filter((s: any) => s.grade === classLevel);
  };

  const handleClassSelect = (classLevel: string) => {
    setSelectedClass(classLevel);
    setSelectedStudent("");
  };

  const handleRemarkChange = (field: keyof StudentTermDetails, value: any) => {
    setCurrentRemark(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedStudent || !selectedTerm) return;

    setSaving(true);
    try {
      await studentsApi.saveTermDetails(selectedStudent, {
        ...currentRemark,
        studentId: selectedStudent,
        termId: selectedTerm,
      });
      toast({
        title: "Success",
        description: "Remarks saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save remarks",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const activeStudent = students.find((s: any) => s.id === selectedStudent);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const uniqueClasses = getUniqueClasses();
  const isClassTeacher = role === "admin" || (role === "teacher" && uniqueClasses.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b bg-white/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Class Teacher</p>
            <p className="font-semibold text-foreground">{username}</p>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Student Remarks & Conduct</h1>
            <p className="text-muted-foreground mt-1">Enter qualitative reports, attendance, and conduct for students</p>
          </div>

          {!isClassTeacher && role === "teacher" && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Only class teachers can enter student remarks. You are currently not assigned as a class teacher to any class.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="remarks" className="w-full">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="remarks">Enter Remarks</TabsTrigger>
              <TabsTrigger value="preview" disabled={!selectedStudent}>Preview Report</TabsTrigger>
            </TabsList>

            <TabsContent value="remarks" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Class Teacher Remarks</CardTitle>
                  <CardDescription>Select a student to enter their term details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Academic Term</Label>
                      <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Term" />
                        </SelectTrigger>
                        <SelectContent>
                          {terms.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={selectedClass} onValueChange={handleClassSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueClasses.map((c: any) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Student</Label>
                      <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Student" />
                        </SelectTrigger>
                        <SelectContent>
                          {getStudentsByClass(selectedClass).map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedStudent && (
                    <div className="border-t pt-6 space-y-6 animate-in fade-in-50">
                      {loadingDetails ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <p className="text-sm font-semibold">{activeStudent?.name}</p>
                            <p className="text-xs text-muted-foreground">{activeStudent?.grade} • {activeStudent?.gender}</p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Attendance (Days Present)</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={currentRemark.attendance}
                                    onChange={(e) => handleRemarkChange("attendance", parseInt(e.target.value) || 0)}
                                  />
                                  <span className="text-sm text-muted-foreground">out of</span>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="w-24"
                                    value={currentRemark.attendanceTotal}
                                    onChange={(e) => handleRemarkChange("attendanceTotal", parseInt(e.target.value) || 100)}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Select Attitude</Label>
                                <Select
                                  value={currentRemark.attitude || ""}
                                  onValueChange={(val) => handleRemarkChange("attitude", val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Attitude" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="EXCELLENT">Excellent</SelectItem>
                                    <SelectItem value="VERY GOOD">Very Good</SelectItem>
                                    <SelectItem value="GOOD">Good</SelectItem>
                                    <SelectItem value="SATISFACTORY">Satisfactory</SelectItem>
                                    <SelectItem value="NEEDS IMPROVEMENT">Needs Improvement</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Select Conduct</Label>
                                <Select
                                  value={currentRemark.conduct || ""}
                                  onValueChange={(val) => handleRemarkChange("conduct", val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Conduct" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="EXCELLENT">Excellent</SelectItem>
                                    <SelectItem value="GOOD">Good</SelectItem>
                                    <SelectItem value="SATISFACTORY">Satisfactory</SelectItem>
                                    <SelectItem value="NEEDS IMPROVEMENT">Needs Improvement</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Interest in Studies</Label>
                                <Select
                                  value={currentRemark.interest || ""}
                                  onValueChange={(val) => handleRemarkChange("interest", val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Interest" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="VERY KEEN">Very Keen</SelectItem>
                                    <SelectItem value="KEEN">Keen</SelectItem>
                                    <SelectItem value="MODERATE">Moderate</SelectItem>
                                    <SelectItem value="MINIMAL">Minimal</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Class Teacher's Remarks</Label>
                            <Textarea
                              className="min-h-[100px]"
                              placeholder="Enter detailed comments about the student's performance and behavior..."
                              value={currentRemark.classTeacherRemark || ""}
                              onChange={(e) => handleRemarkChange("classTeacherRemark", e.target.value)}
                            />
                          </div>

                          <div className="flex justify-end pt-4">
                            <Button onClick={handleSave} disabled={saving} className="min-w-[150px]">
                              {saving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" /> Save Remarks
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardContent className="pt-6">
                  {selectedStudent && !loadingDetails ? (
                    <div className="bg-white p-8 border border-gray-200 shadow-sm space-y-6 max-w-2xl mx-auto">
                      <div className="text-center border-b pb-4">
                        <h2 className="text-xl font-bold text-gray-900">STUDENT REPORT PREVIEW</h2>
                        <p className="text-sm text-gray-500">{activeStudent?.name}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="p-3 bg-gray-50 rounded">
                            <span className="text-gray-500 block mb-1">Attendance</span>
                            <span className="font-medium">{currentRemark.attendance} / {currentRemark.attendanceTotal} days</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded">
                            <span className="text-gray-500 block mb-1">Interest</span>
                            <span className="font-medium">{currentRemark.interest || "-"}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded">
                            <span className="text-gray-500 block mb-1">Conduct</span>
                            <span className="font-medium">{currentRemark.conduct || "-"}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded">
                            <span className="text-gray-500 block mb-1">Attitude</span>
                            <span className="font-medium">{currentRemark.attitude || "-"}</span>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded border border-gray-100">
                          <span className="text-gray-500 block mb-2 text-sm font-medium">Class Teacher's Remarks</span>
                          <p className="text-gray-800 italic">{currentRemark.classTeacherRemark || "No remarks entered."}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Select a student to preview their report details
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

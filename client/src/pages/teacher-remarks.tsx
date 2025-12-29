import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Save, CheckCircle, AlertCircle } from "lucide-react";
import { MOCK_STUDENTS, ACADEMIC_TERMS } from "@/lib/mock-data";

interface StudentRemarks {
  studentId: string;
  studentName: string;
  attendance: string;
  attitude: string;
  conduct: string;
  interest: string;
  classTeacherRemark: string;
  formMaster: string;
}

export default function TeacherRemarks() {
  const { username } = useAuth();
  const [selectedTerm, setSelectedTerm] = useState<string>(ACADEMIC_TERMS.find(t => t.status === "Active")?.id || "");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [remarks, setRemarks] = useState<Record<string, StudentRemarks>>({});
  const [submitted, setSubmitted] = useState(false);

  const activeStudent = MOCK_STUDENTS.find(s => s.id === selectedStudent);

  const handleRemarkChange = (field: keyof StudentRemarks, value: string) => {
    if (!selectedStudent) return;
    setRemarks(prev => ({
      ...prev,
      [selectedStudent]: {
        ...prev[selectedStudent] || {
          studentId: selectedStudent,
          studentName: activeStudent?.name || "",
          attendance: "",
          attitude: "",
          conduct: "",
          interest: "",
          classTeacherRemark: "",
          formMaster: ""
        },
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const currentRemark = selectedStudent ? remarks[selectedStudent] : null;

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
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Terminal Report - Remarks & Details</h1>
            <p className="text-muted-foreground mt-1">Enter student remarks, attendance, conduct and other details</p>
          </div>

          <Tabs defaultValue="remarks" className="w-full">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="remarks">Enter Remarks</TabsTrigger>
              <TabsTrigger value="preview">Preview Report</TabsTrigger>
            </TabsList>

            <TabsContent value="remarks" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Remarks & Details</CardTitle>
                  <CardDescription>Fill in remarks, attendance, attitude, conduct and other details for students</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Select Academic Term</Label>
                    <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                      <SelectTrigger disabled>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACADEMIC_TERMS.filter(t => t.status === "Active").map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_STUDENTS.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedStudent && (
                    <div className="border-t pt-6 space-y-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{activeStudent?.name}</span> (ID: {activeStudent?.id})
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="attendance">Attendance (e.g., 95/100)</Label>
                          <Input
                            id="attendance"
                            placeholder="e.g., 95/100"
                            value={currentRemark?.attendance || ""}
                            onChange={(e) => handleRemarkChange("attendance", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="attitude">Attitude (e.g., EXCELLENT)</Label>
                          <Select 
                            value={currentRemark?.attitude || ""} 
                            onValueChange={(val) => handleRemarkChange("attitude", val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select attitude" />
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

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="conduct">Conduct</Label>
                          <Select 
                            value={currentRemark?.conduct || ""} 
                            onValueChange={(val) => handleRemarkChange("conduct", val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select conduct" />
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
                          <Label htmlFor="interest">Interest (e.g., HOLDS VARIED INTERESTS)</Label>
                          <Input
                            id="interest"
                            placeholder="E.g., Holds varied interests in sports and arts"
                            value={currentRemark?.interest || ""}
                            onChange={(e) => handleRemarkChange("interest", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="classTeacherRemark">Class Teacher's Remarks</Label>
                        <Textarea
                          id="classTeacherRemark"
                          placeholder="E.g., More room for improvement in mathematics. Otherwise a well-behaved student."
                          value={currentRemark?.classTeacherRemark || ""}
                          onChange={(e) => handleRemarkChange("classTeacherRemark", e.target.value)}
                          className="min-h-24"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="formMaster">Form Master/Class Master Name</Label>
                        <Input
                          id="formMaster"
                          placeholder="Enter your name as form master"
                          value={currentRemark?.formMaster || ""}
                          onChange={(e) => handleRemarkChange("formMaster", e.target.value)}
                        />
                      </div>

                      {submitted && (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800 ml-2">
                            Remarks saved successfully!
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
                {selectedStudent && (
                  <CardFooter>
                    <Button onClick={handleSave} className="w-full gap-2">
                      <Save className="h-4 w-4" />
                      Save Remarks
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
              {selectedStudent && currentRemark && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="bg-white p-8 border-2 border-gray-800 space-y-4">
                      <div className="border-b-2 border-gray-800 pb-4 text-center">
                        <h2 className="text-lg font-bold">UNIVERSITY BASIC SCHOOL</h2>
                        <p className="text-xs font-serif italic">Knowledge, Truth and Excellence</p>
                        <h3 className="text-sm font-bold mt-2 border-2 border-blue-600 inline-block px-4 py-1">TERMINAL REPORT</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-8 text-sm">
                        <div>
                          <p><strong>Name of Student:</strong> {activeStudent?.name.toUpperCase()}</p>
                          <p><strong>Student ID:</strong> {activeStudent?.id}</p>
                        </div>
                        <div>
                          <p><strong>Number On Roll:</strong> {MOCK_STUDENTS.indexOf(activeStudent || MOCK_STUDENTS[0]) + 1}</p>
                          <p><strong>Next Term Begins:</strong> To be announced</p>
                        </div>
                      </div>

                      <div className="mt-6 space-y-2 text-sm">
                        <p><strong>Attendance:</strong> {currentRemark.attendance} <span className="text-muted-foreground">Out of 100 school days</span></p>
                        <p><strong>Attitude:</strong> {currentRemark.attitude}</p>
                        <p><strong>Conduct:</strong> {currentRemark.conduct}</p>
                        <p><strong>Interest:</strong> {currentRemark.interest}</p>
                        <p><strong>Class Teacher's Remarks:</strong> {currentRemark.classTeacherRemark}</p>
                        <p><strong>Form Master:</strong> {currentRemark.formMaster}</p>
                      </div>

                      <div className="mt-6 flex justify-between items-end">
                        <div>
                          <p className="text-sm font-semibold">Head's Signature:</p>
                          <div className="border-t border-gray-400 w-32 mt-2"></div>
                        </div>
                        <div className="text-center text-xs text-muted-foreground">
                          <p>Generated by University Basic School</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

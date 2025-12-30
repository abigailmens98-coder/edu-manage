import { useState } from "react";
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
import { FileText, Save, CheckCircle, Info, Download, BookOpen } from "lucide-react";
import { MOCK_STUDENTS, ACADEMIC_TERMS, MOCK_SUBJECTS, getGESGrade } from "@/lib/mock-data";

interface StudentRemarks {
  studentId: string;
  studentName: string;
  classLevel: string;
  examScore: number;
  assessmentScore: number;
  attendance: number;
  attendanceOut: number;
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

  // Get subjects for student's class
  const getStudentSubjects = (classLevel: string) => {
    return MOCK_SUBJECTS.filter(s => s.classLevels.includes(classLevel));
  };

  // Determine if student is in Basic 7-9 or Basic 1-6
  const getClassLevelType = (grade: string): "senior" | "junior" => {
    const basicNum = parseInt(grade.replace(/[^0-9]/g, ""));
    return basicNum >= 7 ? "senior" : "junior";
  };

  // Calculate final score based on class level
  const calculateFinalScore = (examScore: number, assessmentScore: number, classLevel: string): number => {
    const type = getClassLevelType(classLevel);
    if (type === "senior") {
      // Basic 7-9: Exams 70%, Assessment 30%
      return (examScore * 0.7) + (assessmentScore * 0.3);
    } else {
      // Basic 1-6: Exams 50%, Assessment 50%
      return (examScore * 0.5) + (assessmentScore * 0.5);
    }
  };

  const handleRemarkChange = (field: string, value: string | number) => {
    if (!selectedStudent) return;
    let numValue = value;
    if (field === "examScore" || field === "assessmentScore" || field === "attendance" || field === "attendanceOut") {
      numValue = parseFloat(String(value)) || 0;
    }
    
    setRemarks(prev => ({
      ...prev,
      [selectedStudent]: {
        ...prev[selectedStudent] || {
          studentId: selectedStudent,
          studentName: activeStudent?.name || "",
          classLevel: activeStudent?.grade || "",
          examScore: 0,
          assessmentScore: 0,
          attendance: 0,
          attendanceOut: 100,
          attitude: "",
          conduct: "",
          interest: "",
          classTeacherRemark: "",
          formMaster: ""
        },
        [field]: numValue
      }
    }));
  };

  // Generate PDF (mock implementation)
  const handleGeneratePDF = () => {
    if (!currentRemark) return;
    alert(`PDF would be generated for ${activeStudent?.name}'s report. This is a preview - actual PDF export would require backend integration.`);
  };

  const handleSave = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const currentRemark = selectedStudent ? remarks[selectedStudent] : null;
  const finalScore = currentRemark ? calculateFinalScore(currentRemark.examScore, currentRemark.assessmentScore, currentRemark.classLevel) : 0;
  const gradeInfo = getGESGrade(finalScore);
  const classType = activeStudent ? getClassLevelType(activeStudent.grade) : "junior";

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
            <h1 className="text-3xl font-serif font-bold text-foreground">Terminal Report - Exam & Assessment Grades</h1>
            <p className="text-muted-foreground mt-1">Enter exam scores and class assessment marks to generate final grades</p>
          </div>

          <Tabs defaultValue="grades" className="w-full">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="grades">Enter Grades</TabsTrigger>
              <TabsTrigger value="preview">Preview Report</TabsTrigger>
            </TabsList>

            <TabsContent value="grades" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Enter Exam & Assessment Scores</CardTitle>
                  <CardDescription>System will automatically calculate final grades based on class level</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Grading Information */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 ml-2">
                      <strong>Grading Breakdown:</strong>
                      <div className="mt-2 text-xs space-y-1">
                        <p>• <strong>Basic 7-9:</strong> End-of-Term Exams = 70%, Class Assessment = 30%</p>
                        <p>• <strong>Basic 1-6:</strong> End-of-Term Exams = 50%, Class Assessment = 50%</p>
                      </div>
                    </AlertDescription>
                  </Alert>

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
                            {s.name} ({s.grade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedStudent && (
                    <div className="border-t pt-6 space-y-6">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{activeStudent?.name}</span> - {activeStudent?.grade}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Grading Type: {classType === "senior" ? "70% Exam / 30% Assessment" : "50% Exam / 50% Assessment"}
                        </p>
                      </div>

                      {/* Exam and Assessment Scores */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="examScore">End-of-Term Exam Score (0-100)</Label>
                          <Input
                            id="examScore"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Enter exam score"
                            value={currentRemark?.examScore || ""}
                            onChange={(e) => handleRemarkChange("examScore", e.target.value)}
                          />
                          {currentRemark?.examScore !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Contribution: {(currentRemark.examScore * (classType === "senior" ? 0.7 : 0.5)).toFixed(1)} points
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="assessmentScore">Class Assessment Score (0-100)</Label>
                          <Input
                            id="assessmentScore"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Enter assessment score"
                            value={currentRemark?.assessmentScore || ""}
                            onChange={(e) => handleRemarkChange("assessmentScore", e.target.value)}
                          />
                          {currentRemark?.assessmentScore !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Contribution: {(currentRemark.assessmentScore * (classType === "senior" ? 0.3 : 0.5)).toFixed(1)} points
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Final Grade Display */}
                      {currentRemark?.examScore !== undefined && currentRemark?.assessmentScore !== undefined && (
                        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg p-4">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Final Score</p>
                              <p className="text-2xl font-bold text-primary">{finalScore.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Grade</p>
                              <p className="text-2xl font-bold text-secondary">{gradeInfo.grade}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Description</p>
                              <p className="text-sm font-semibold text-foreground">{gradeInfo.description}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Student Subjects */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Subjects for {activeStudent?.grade}
                        </Label>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-wrap gap-2">
                          {getStudentSubjects(activeStudent?.grade || "").length > 0 ? (
                            getStudentSubjects(activeStudent?.grade || "").map(subj => (
                              <Badge key={subj.id} variant="secondary" className="text-xs">
                                {subj.name}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No subjects assigned yet</p>
                          )}
                        </div>
                      </div>

                      {/* Attendance and Conduct */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="attendance">Attendance (Days Present)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="attendance"
                              type="number"
                              min="0"
                              placeholder="e.g., 85"
                              value={currentRemark?.attendance || ""}
                              onChange={(e) => handleRemarkChange("attendance", e.target.value)}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground flex items-center">out of</span>
                            <Input
                              type="number"
                              min="1"
                              placeholder="100"
                              value={currentRemark?.attendanceOut || 100}
                              onChange={(e) => handleRemarkChange("attendanceOut", e.target.value)}
                              className="w-20"
                            />
                          </div>
                          {currentRemark?.attendance !== undefined && currentRemark?.attendanceOut && (
                            <p className="text-xs text-muted-foreground">
                              {((currentRemark.attendance / currentRemark.attendanceOut) * 100).toFixed(1)}% attendance rate
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="attitude">Attitude</Label>
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
                          <Label htmlFor="interest">Interest in Studies</Label>
                          <Select 
                            value={currentRemark?.interest || ""} 
                            onValueChange={(val) => handleRemarkChange("interest", val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select interest level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="VERY KEEN">Very Keen</SelectItem>
                              <SelectItem value="KEEN">Keen</SelectItem>
                              <SelectItem value="MODERATE">Moderate</SelectItem>
                              <SelectItem value="MINIMAL">Minimal</SelectItem>
                              <SelectItem value="NEEDS ENCOURAGEMENT">Needs Encouragement</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="classTeacherRemark">Class Teacher's Remarks</Label>
                        <Textarea
                          id="classTeacherRemark"
                          placeholder="Enter detailed remarks for the student"
                          value={currentRemark?.classTeacherRemark || ""}
                          onChange={(e) => handleRemarkChange("classTeacherRemark", e.target.value)}
                          className="min-h-24"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="formMaster">Form Master Name</Label>
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
                            Grades and remarks saved successfully!
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
                {selectedStudent && (
                  <CardFooter className="gap-2">
                    <Button onClick={handleSave} className="flex-1 gap-2">
                      <Save className="h-4 w-4" />
                      Save Grades & Remarks
                    </Button>
                    <Button onClick={handleGeneratePDF} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export PDF
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
              {selectedStudent && currentRemark && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="bg-white p-8 border-2 border-gray-800 space-y-6">
                      <div className="border-b-2 border-gray-800 pb-4 text-center space-y-1">
                        <h2 className="text-lg font-bold">UNIVERSITY BASIC SCHOOL - TARKWA</h2>
                        <p className="text-xs font-serif italic">Knowledge, Truth and Excellence</p>
                        <h3 className="text-sm font-bold mt-2 border-2 border-blue-600 inline-block px-4 py-1">TERMINAL REPORT</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-8 text-sm">
                        <div>
                          <p><strong>Name of Student:</strong> {activeStudent?.name.toUpperCase()}</p>
                          <p><strong>Student ID:</strong> {activeStudent?.id}</p>
                          <p><strong>Class:</strong> {activeStudent?.grade}</p>
                        </div>
                        <div>
                          <p><strong>Number On Roll:</strong> {MOCK_STUDENTS.indexOf(activeStudent || MOCK_STUDENTS[0]) + 1}</p>
                          <p><strong>Term:</strong> Term 1</p>
                          <p><strong>Year:</strong> 2024</p>
                        </div>
                      </div>

                      {/* Grades Summary */}
                      <div className="border-2 border-blue-600 rounded-lg p-4 bg-blue-50">
                        <h3 className="font-bold text-blue-900 mb-3">OVERALL ACADEMIC PERFORMANCE</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="border-r border-blue-300">
                            <p className="text-xs text-blue-700">End-of-Term Exam</p>
                            <p className="text-xl font-bold text-blue-900">{currentRemark.examScore}</p>
                            <p className="text-xs text-blue-600">
                              ({classType === "senior" ? "70%" : "50%"}) = {(currentRemark.examScore * (classType === "senior" ? 0.7 : 0.5)).toFixed(1)}
                            </p>
                          </div>
                          <div className="border-r border-blue-300">
                            <p className="text-xs text-blue-700">Class Assessment</p>
                            <p className="text-xl font-bold text-blue-900">{currentRemark.assessmentScore}</p>
                            <p className="text-xs text-blue-600">
                              ({classType === "senior" ? "30%" : "50%"}) = {(currentRemark.assessmentScore * (classType === "senior" ? 0.3 : 0.5)).toFixed(1)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-700">Final Grade</p>
                            <p className="text-2xl font-bold text-blue-900">{gradeInfo.grade}</p>
                            <p className="text-xs font-semibold text-blue-900">{gradeInfo.description}</p>
                            <p className="text-lg font-bold text-primary mt-1">{finalScore.toFixed(1)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Subjects Studied */}
                      <div className="border-t-2 border-gray-400 pt-4">
                        <h4 className="font-bold text-gray-800 mb-2">SUBJECTS STUDIED</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                          {getStudentSubjects(activeStudent?.grade || "").map(subj => (
                            <div key={subj.id} className="border border-gray-300 p-2">
                              <p className="font-semibold">{subj.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Other Details */}
                      <div className="space-y-2 text-sm">
                        <p><strong>Attendance:</strong> {currentRemark.attendance} / {currentRemark.attendanceOut} days ({((currentRemark.attendance / currentRemark.attendanceOut) * 100).toFixed(1)}%)</p>
                        <p><strong>Attitude:</strong> {currentRemark.attitude}</p>
                        <p><strong>Conduct:</strong> {currentRemark.conduct}</p>
                        <p><strong>Interest in Studies:</strong> {currentRemark.interest}</p>
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
                          <p>Tarkwa, Ghana</p>
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

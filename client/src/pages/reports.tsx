import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOCK_STUDENTS, MOCK_SUBJECTS } from "@/lib/mock-data";
import { FileBarChart, Download, Printer, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Reports() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "text-green-600";
    if (grade >= 80) return "text-blue-600";
    if (grade >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Assessment & Reports</h1>
        <p className="text-muted-foreground mt-1">Record grades and generate end-of-term reports.</p>
      </div>

      <Tabs defaultValue="assessment" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="assessment">Grade Assessment</TabsTrigger>
          <TabsTrigger value="reports">Generate Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="assessment" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Grades</CardTitle>
              <CardDescription>Select a subject and student to enter marks.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Select>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_SUBJECTS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select>
                   <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="term1">Term 1 (Fall)</SelectItem>
                    <SelectItem value="term2">Term 2 (Spring)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-[150px]">Mid-Term (40%)</TableHead>
                    <TableHead className="w-[150px]">Final (60%)</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_STUDENTS.slice(0, 5).map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        <Input type="number" placeholder="0-100" className="h-8" />
                      </TableCell>
                      <TableCell>
                         <Input type="number" placeholder="0-100" className="h-8" />
                      </TableCell>
                      <TableCell className="font-bold">-</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs italic">Pending</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Save Grades</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Generation</CardTitle>
                <CardDescription>Select a student to preview and print their report card.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Search student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_STUDENTS.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.id})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                   <Label>Academic Period</Label>
                   <Select defaultValue="2023-2024">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2023-2024">2023-2024 Academic Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button className="flex-1" disabled={!selectedStudent}>
                    <Printer className="mr-2 h-4 w-4" /> Print Report
                  </Button>
                  <Button variant="outline" className="flex-1" disabled={!selectedStudent}>
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {selectedStudent ? (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="border-b border-primary/10 bg-white dark:bg-zinc-900 rounded-t-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-serif text-2xl">Report Card</CardTitle>
                      <p className="text-sm text-muted-foreground">University Basic School</p>
                    </div>
                    <div className="text-right">
                       <h3 className="font-bold">{MOCK_STUDENTS.find(s => s.id === selectedStudent)?.name}</h3>
                       <p className="text-sm text-muted-foreground">{MOCK_STUDENTS.find(s => s.id === selectedStudent)?.id}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="bg-white dark:bg-zinc-900 pt-6 rounded-b-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-right">Grade</TableHead>
                        <TableHead className="text-right">Comment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Advanced Physics</TableCell>
                        <TableCell className={`text-right font-bold ${getGradeColor(92)}`}>92 (A)</TableCell>
                        <TableCell className="text-right text-sm">Excellent work</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>World History</TableCell>
                        <TableCell className={`text-right font-bold ${getGradeColor(85)}`}>85 (B)</TableCell>
                        <TableCell className="text-right text-sm">Good participation</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Calculus I</TableCell>
                        <TableCell className={`text-right font-bold ${getGradeColor(78)}`}>78 (C+)</TableCell>
                        <TableCell className="text-right text-sm">Needs improvement</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  
                  <div className="mt-8 border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">GPA: 3.4</span>
                      <div className="flex items-center text-green-600 text-sm font-medium">
                        <CheckCircle className="h-4 w-4 mr-1" /> Promoted to Next Grade
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-lg p-12">
                <FileBarChart className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a student to view their report card preview</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
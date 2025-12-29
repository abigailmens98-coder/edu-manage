import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MOCK_SUBJECTS, MOCK_TEACHERS } from "@/lib/mock-data";
import { BookOpen, UserPlus, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Academics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Academic Assignments</h1>
        <p className="text-muted-foreground mt-1">Assign subjects to teachers and manage course enrollments.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Subject Allocation</CardTitle>
              <CardDescription>Current subject assignments per teacher</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" /> Assign New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Subject</DialogTitle>
                  <DialogDescription>Link a teacher to a subject.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                     <Label>Select Teacher</Label>
                     <Select>
                       <SelectTrigger>
                         <SelectValue placeholder="Select a teacher" />
                       </SelectTrigger>
                       <SelectContent>
                         {MOCK_TEACHERS.map(t => (
                           <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <Label>Select Subject</Label>
                     <Select>
                       <SelectTrigger>
                         <SelectValue placeholder="Select a subject" />
                       </SelectTrigger>
                       <SelectContent>
                         {MOCK_SUBJECTS.map(s => (
                           <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button>Confirm Assignment</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Assigned Teacher</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_SUBJECTS.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-mono text-xs">{subject.code}</TableCell>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                          {subject.teacher[0]}
                        </div>
                        {subject.teacher}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-full">
                        {subject.students} Enrolled
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Manage</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-background p-4 rounded-lg border shadow-sm cursor-pointer hover:border-primary transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Create New Subject</h3>
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">Add a new course to the curriculum.</p>
              <div className="flex items-center text-primary text-sm font-medium">
                Create
                <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            <div className="bg-background p-4 rounded-lg border shadow-sm cursor-pointer hover:border-primary transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Bulk Enroll</h3>
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">Enroll multiple students to a class at once.</p>
              <div className="flex items-center text-primary text-sm font-medium">
                Start Enrollment
                <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
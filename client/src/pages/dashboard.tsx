import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, GraduationCap, BookOpen, TrendingUp, Calendar, Loader2, Target, BarChart3, Trophy, Settings2, ChevronUp, ChevronDown, Percent, Trash2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell, Tooltip } from "recharts";
import { studentsApi, teachersApi, subjectsApi, academicYearsApi, academicTermsApi } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  overview: {
    totalStudents: number;
    activeStudents: number;
    totalTeachers: number;
    totalSubjects: number;
    averageScore: number;
    passRate: number;
    attendanceRate: number;
    totalScoresEntered: number;
    currentTerm: string;
  };
  gradePerformance: Array<{ grade: string; average: number; count: number }>;
  subjectPerformance: Array<{ subjectId: string; name: string; average: number; count: number }>;
  topPerformers: Array<{ studentId: string; name: string; grade: string; average: number; totalSubjects: number }>;
}

type WidgetType = "students" | "teachers" | "subjects" | "attendance" | "avgScore" | "passRate" | "gradePerformance" | "subjectPerformance" | "topPerformers" | "quickStats";

interface WidgetConfig {
  id: WidgetType;
  label: string;
  enabled: boolean;
}

const defaultWidgets: WidgetConfig[] = [
  { id: "students", label: "Total Students", enabled: true },
  { id: "teachers", label: "Active Teachers", enabled: true },
  { id: "subjects", label: "Active Subjects", enabled: true },
  { id: "attendance", label: "Attendance Rate", enabled: true },
  { id: "avgScore", label: "Average Score", enabled: true },
  { id: "passRate", label: "Pass Rate", enabled: true },
  { id: "gradePerformance", label: "Performance by Grade", enabled: true },
  { id: "subjectPerformance", label: "Subject Performance", enabled: true },
  { id: "topPerformers", label: "Top Performers", enabled: true },
  { id: "quickStats", label: "Quick Stats", enabled: true },
];

export default function Dashboard() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(defaultWidgets);
  const [showSettings, setShowSettings] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboardWidgets");
      if (saved) {
        try {
          setWidgets(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved widgets:", e);
        }
      }
    }
  }, []);

  const handleCleanupDemoData = async () => {
    setCleaningUp(true);
    try {
      const response = await fetch('/api/admin/cleanup-demo-data', {
        method: 'POST',
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        toast({
          title: "Success",
          description: `Cleaned up ${result.teachersDeleted} demo teachers, ${result.studentsDeleted} demo students.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/students'] });
        queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cleanup demo data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cleanup demo data",
        variant: "destructive",
      });
    } finally {
      setCleaningUp(false);
      setShowCleanupDialog(false);
    }
  };

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students'],
    queryFn: studentsApi.getAll,
    refetchOnWindowFocus: true,
  });

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['/api/teachers'],
    queryFn: teachersApi.getAll,
    refetchOnWindowFocus: true,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['/api/subjects'],
    queryFn: subjectsApi.getAll,
    refetchOnWindowFocus: true,
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ['/api/academic-years'],
    queryFn: academicYearsApi.getAll,
    refetchOnWindowFocus: true,
  });

  const { data: academicTerms = [] } = useQuery({
    queryKey: ['/api/academic-terms'],
    queryFn: () => academicTermsApi.getAll(),
    refetchOnWindowFocus: true,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchOnWindowFocus: true,
  });

  const isLoading = studentsLoading || teachersLoading || subjectsLoading || statsLoading;

  const activeYear = academicYears.find((y: any) => y.status === "Active");
  const activeTerm = academicTerms.find((t: any) => t.status === "Active");

  const studentsByGrade = students.reduce((acc: Record<string, number>, student: any) => {
    const grade = student.grade || "Unknown";
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {});

  const gradeOrder = ["KG 1", "KG 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"];
  const chartData = gradeOrder.map(grade => ({
    name: grade.replace("Basic ", "B").replace("KG ", "K"),
    total: studentsByGrade[grade] || 0,
  })).filter(d => d.total > 0);

  const activeStudents = students.filter((s: any) => s.status === "Active").length;

  const isWidgetEnabled = (id: WidgetType) => widgets.find(w => w.id === id)?.enabled ?? true;

  const toggleWidget = (id: WidgetType) => {
    const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
    setWidgets(updated);
    localStorage.setItem("dashboardWidgets", JSON.stringify(updated));
  };

  const moveWidget = (id: WidgetType, direction: "up" | "down") => {
    const index = widgets.findIndex(w => w.id === id);
    if (direction === "up" && index > 0) {
      const updated = [...widgets];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      setWidgets(updated);
      localStorage.setItem("dashboardWidgets", JSON.stringify(updated));
    } else if (direction === "down" && index < widgets.length - 1) {
      const updated = [...widgets];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      setWidgets(updated);
      localStorage.setItem("dashboardWidgets", JSON.stringify(updated));
    }
  };

  const resetWidgets = () => {
    setWidgets(defaultWidgets);
    localStorage.setItem("dashboardWidgets", JSON.stringify(defaultWidgets));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100 border-green-200";
    if (score >= 60) return "bg-blue-100 border-blue-200";
    if (score >= 50) return "bg-yellow-100 border-yellow-200";
    return "bg-red-100 border-red-200";
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const kpiCards = widgets.filter(w => ["students", "teachers", "subjects", "attendance", "avgScore", "passRate"].includes(w.id) && w.enabled);
  const chartWidgets = widgets.filter(w => ["gradePerformance", "subjectPerformance", "topPerformers", "quickStats"].includes(w.id) && w.enabled);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, Administrator. 
            {activeYear && activeTerm && (
              <span className="ml-2">
                Current: <strong>{activeYear.year}</strong> - <strong>{activeTerm.name}</strong>
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCleanupDialog(true)} data-testid="button-cleanup-demo">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Demo Data
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} data-testid="button-customize-dashboard">
            <Settings2 className="h-4 w-4 mr-2" />
            Customize
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isWidgetEnabled("students") && (
          <Card className="hover-elevate transition-all" data-testid="card-total-students">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-student-count">{students.length}</div>
              <p className="text-xs text-muted-foreground">{activeStudents} active</p>
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled("teachers") && (
          <Card className="hover-elevate transition-all" data-testid="card-active-teachers">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-teacher-count">{teachers.length}</div>
              <p className="text-xs text-muted-foreground">Teaching staff</p>
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled("subjects") && (
          <Card className="hover-elevate transition-all" data-testid="card-active-subjects">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-subject-count">{subjects.length}</div>
              <p className="text-xs text-muted-foreground">In curriculum</p>
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled("attendance") && (
          <Card className="hover-elevate transition-all" data-testid="card-avg-attendance">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-attendance-rate">{stats?.overview.attendanceRate || 0}%</div>
              <p className="text-xs text-muted-foreground">Across all students</p>
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled("avgScore") && (
          <Card className={`hover-elevate transition-all border ${getScoreBgColor(stats?.overview.averageScore || 0)}`} data-testid="card-avg-score">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(stats?.overview.averageScore || 0)}`} data-testid="text-avg-score">
                {stats?.overview.averageScore || 0}%
              </div>
              <p className="text-xs text-muted-foreground">{stats?.overview.totalScoresEntered || 0} scores entered</p>
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled("passRate") && (
          <Card className={`hover-elevate transition-all border ${getScoreBgColor(stats?.overview.passRate || 0)}`} data-testid="card-pass-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(stats?.overview.passRate || 0)}`} data-testid="text-pass-rate">
                {stats?.overview.passRate || 0}%
              </div>
              <p className="text-xs text-muted-foreground">Score &ge; 50%</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {isWidgetEnabled("gradePerformance") && (
          <Card className="col-span-4 hover-elevate transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance by Grade
              </CardTitle>
              <CardDescription>Average scores across class levels</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {stats?.gradePerformance && stats.gradePerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.gradePerformance.map(g => ({ 
                    name: g.grade.replace("Basic ", "B").replace("KG ", "K"), 
                    average: g.average,
                    count: g.count
                  }))}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === "average" ? `${value}%` : value,
                        name === "average" ? "Average Score" : "Students"
                      ]}
                    />
                    <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                      {stats.gradePerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.average >= 70 ? '#22c55e' : entry.average >= 50 ? '#3b82f6' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No performance data available. Enter scores to see the chart.
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {isWidgetEnabled("subjectPerformance") && (
          <Card className="col-span-3 hover-elevate transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subject Performance
              </CardTitle>
              <CardDescription>Average scores by subject</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.subjectPerformance && stats.subjectPerformance.length > 0 ? (
                <div className="space-y-3">
                  {stats.subjectPerformance.slice(0, 6).map((subject, index) => (
                    <div key={subject.subjectId} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{subject.name}</span>
                          <span className={`text-sm font-bold ${getScoreColor(subject.average)}`}>{subject.average}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${subject.average >= 70 ? 'bg-green-500' : subject.average >= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                            style={{ width: `${subject.average}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No subject data available
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isWidgetEnabled("topPerformers") && (
          <Card className="hover-elevate transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Performers
              </CardTitle>
              <CardDescription>Students with highest average scores</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.topPerformers && stats.topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {stats.topPerformers.slice(0, 5).map((student, index) => (
                    <div key={student.studentId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-primary/60'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.grade} - {student.totalSubjects} subjects</p>
                      </div>
                      <Badge variant="secondary" className={getScoreColor(student.average)}>
                        {student.average}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No performance data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled("quickStats") && (
          <Card className="hover-elevate transition-all">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Current academic overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mr-4 border border-primary/20">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">Academic Year</p>
                    <p className="text-sm text-muted-foreground">{activeYear?.year || "Not set"}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center mr-4 border border-blue-200">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">Current Term</p>
                    <p className="text-sm text-muted-foreground">
                      {activeTerm?.name || "Not set"}
                      {activeTerm?.totalAttendanceDays && ` (${activeTerm.totalAttendanceDays} days)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center mr-4 border border-green-200">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">Class Breakdown</p>
                    <p className="text-sm text-muted-foreground">
                      {Object.keys(studentsByGrade).length} grades with students
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center mr-4 border border-orange-200">
                    <GraduationCap className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">Student-Teacher Ratio</p>
                    <p className="text-sm text-muted-foreground">
                      {teachers.length > 0 ? `${Math.round(students.length / teachers.length)}:1` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clear Demo Data</DialogTitle>
            <DialogDescription>
              This will remove all demo teachers and students that were created automatically. Your real data will not be affected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              The following demo data will be removed:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
              <li>Demo teacher accounts (teacher_001, teacher_002)</li>
              <li>Demo teacher profiles (Dr. Sarah Conner, Prof. Alan Grant)</li>
              <li>Demo students (Alice Johnson, Bob Smith, Charlie Brown)</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCleanupDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCleanupDemoData} disabled={cleaningUp}>
              {cleaningUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Clear Demo Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
            <DialogDescription>
              Choose which widgets to display and reorder them.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {widgets.map((widget, index) => (
              <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    id={widget.id}
                    checked={widget.enabled}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                  <Label htmlFor={widget.id} className="cursor-pointer">{widget.label}</Label>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveWidget(widget.id, "up")}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveWidget(widget.id, "down")}
                    disabled={index === widgets.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={resetWidgets}>Reset to Default</Button>
            <Button onClick={() => setShowSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

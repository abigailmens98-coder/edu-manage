import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { studentsApi, teachersApi, subjectsApi, academicYearsApi, academicTermsApi } from "@/lib/api";

export default function Dashboard() {
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

  const isLoading = studentsLoading || teachersLoading || subjectsLoading;

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
  const attendanceRate = students.length > 0 
    ? Math.round(students.reduce((sum: number, s: any) => sum + (s.attendance || 0), 0) / students.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all" data-testid="card-total-students">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-student-count">{students.length}</div>
            <p className="text-xs text-muted-foreground">{activeStudents} active students</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all" data-testid="card-active-teachers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-teacher-count">{teachers.length}</div>
            <p className="text-xs text-muted-foreground">Teaching staff members</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all" data-testid="card-active-subjects">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-subject-count">{subjects.length}</div>
            <p className="text-xs text-muted-foreground">In the curriculum</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all" data-testid="card-avg-attendance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-attendance-rate">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">Across all students</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 hover-elevate transition-all">
          <CardHeader>
            <CardTitle>Students by Grade</CardTitle>
            <CardDescription>Distribution of students across class levels</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Bar
                    dataKey="total"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                No student data available. Add students to see the chart.
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 hover-elevate transition-all">
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
      </div>
    </div>
  );
}

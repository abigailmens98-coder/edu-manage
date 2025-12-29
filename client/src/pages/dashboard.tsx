import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import { MOCK_STUDENTS, MOCK_TEACHERS } from "@/lib/mock-data";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const data = [
  { name: "Jan", total: 12 },
  { name: "Feb", total: 18 },
  { name: "Mar", total: 25 },
  { name: "Apr", total: 20 },
  { name: "May", total: 32 },
  { name: "Jun", total: 38 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back, Administrator. Here's what's happening today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_STUDENTS.length * 124}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_TEACHERS.length * 12}</div>
            <p className="text-xs text-muted-foreground">+2 new joined this week</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">All sessions currently active</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">+1.2% from last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 hover-elevate transition-all">
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardDescription>New student enrollments over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data}>
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
          </CardContent>
        </Card>
        
        <Card className="col-span-3 hover-elevate transition-all">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system updates and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="flex items-center">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mr-4 border border-primary/20">
                   <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">New Student Enrolled</p>
                  <p className="text-sm text-muted-foreground">Emily Davis joined Grade 10</p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">2m</div>
              </div>
              
              <div className="flex items-center">
                <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center mr-4 border border-orange-200">
                   <AlertCircle className="h-4 w-4 text-orange-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Attendance Alert</p>
                  <p className="text-sm text-muted-foreground">Grade 9B below 80% threshold</p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">1h</div>
              </div>

              <div className="flex items-center">
                <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center mr-4 border border-green-200">
                   <BookOpen className="h-4 w-4 text-green-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Report Cards Generated</p>
                  <p className="text-sm text-muted-foreground">Term 2 reports are ready</p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">3h</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
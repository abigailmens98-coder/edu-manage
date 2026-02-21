import { Switch, Route } from "wouter";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/pages/login";
import TeacherDashboard from "@/pages/teacher-dashboard";
import TeacherProfile from "@/pages/teacher-profile";
import TeacherBroadsheet from "@/pages/teacher-broadsheet";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import Teachers from "@/pages/teachers";
import Academics from "@/pages/academics";
import ManageSubjects from "@/pages/manage-subjects";
import Terms from "@/pages/terms";
import Reports from "@/pages/reports";
import TeacherRemarks from "@/pages/teacher-remarks";
import ScoreEntry from "@/pages/score-entry";
import Broadsheet from "@/pages/broadsheet";
import AdminSettings from "@/pages/admin-settings";
import AdminProfile from "@/pages/admin-profile";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  if (role === "teacher") {
    return (
      <Switch>
        <Route path="/profile" component={TeacherProfile} />
        <Route path="/remarks" component={TeacherRemarks} />
        <Route path="/broadsheet" component={TeacherBroadsheet} />
        <Route component={TeacherDashboard} />
      </Switch>
    );
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/students" component={Students} />
        <Route path="/teachers" component={Teachers} />
        <Route path="/academics" component={Academics} />
        <Route path="/subjects" component={ManageSubjects} />
        <Route path="/terms" component={Terms} />
        <Route path="/reports" component={Reports} />
        <Route path="/remarks" component={TeacherRemarks} />
        <Route path="/scores" component={ScoreEntry} />
        <Route path="/broadsheet" component={Broadsheet} />
        <Route path="/settings" component={AdminSettings} />
        <Route path="/profile" component={AdminProfile} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  );
}

export default App;

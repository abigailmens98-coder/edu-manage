import { Switch, Route } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import Teachers from "@/pages/teachers";
import Academics from "@/pages/academics";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/students" component={Students} />
          <Route path="/teachers" component={Teachers} />
          <Route path="/academics" component={Academics} />
          <Route path="/reports" component={Reports} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
      <Toaster />
    </>
  );
}

export default App;